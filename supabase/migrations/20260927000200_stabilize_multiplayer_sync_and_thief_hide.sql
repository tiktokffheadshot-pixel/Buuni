-- Controlled multiplayer synchronization and Thief Hide integration.
-- Economy/rewards, role assignment, timer, accusation resolution, timeout resolution,
-- round numbering, and Play Again lifecycle remain unchanged.

create or replace function public.touch_room_sync()
returns trigger language plpgsql security definer set search_path=public,pg_catalog
as $$
declare sync_room_id uuid;
begin
  if tg_table_name in ('room_players','game_rounds') then sync_room_id:=coalesce(new.room_id,old.room_id);
  elsif tg_table_name in ('game_investigations','game_accusations','game_thief_hides') then
    select gr.room_id into sync_room_id from public.game_rounds gr where gr.id=coalesce(new.round_id,old.round_id);
  end if;
  if sync_room_id is not null then update public.rooms set updated_at=clock_timestamp() where id=sync_room_id; end if;
  return coalesce(new,old);
end;
$$;
revoke execute on function public.touch_room_sync() from public,anon,authenticated;
drop trigger if exists room_players_sync_room on public.room_players;
create trigger room_players_sync_room after insert or update or delete on public.room_players for each row execute function public.touch_room_sync();
drop trigger if exists game_rounds_sync_room on public.game_rounds;
create trigger game_rounds_sync_room after insert or update or delete on public.game_rounds for each row execute function public.touch_room_sync();
drop trigger if exists game_investigations_sync_room on public.game_investigations;
create trigger game_investigations_sync_room after insert or update or delete on public.game_investigations for each row execute function public.touch_room_sync();
drop trigger if exists game_accusations_sync_room on public.game_accusations;
create trigger game_accusations_sync_room after insert or update or delete on public.game_accusations for each row execute function public.touch_room_sync();
drop trigger if exists game_thief_hides_sync_room on public.game_thief_hides;
create trigger game_thief_hides_sync_room after insert or update or delete on public.game_thief_hides for each row execute function public.touch_room_sync();

create or replace function public.investigate_player(p_code text,p_target_username text)
returns table(target_username text,target_role text)
language plpgsql security definer set search_path=public,pg_catalog
as $$
declare caller_id uuid:=auth.uid(); target_room public.rooms%rowtype; target_round public.game_rounds%rowtype; caller_role text; target_id uuid; target_name text; target_role_value text; target_is_hidden boolean:=false;
begin
  if caller_id is null then raise exception 'Not authenticated' using errcode='42501'; end if;
  select r.* into target_room from public.rooms r where r.code=upper(trim(p_code));
  if not found then raise exception 'Room not found'; end if;
  if target_room.status<>'playing' then raise exception 'Room is not playing'; end if;
  if not exists(select 1 from public.room_players rp where rp.room_id=target_room.id and rp.user_id=caller_id) then raise exception 'You are not in this room' using errcode='42501'; end if;
  select gr.* into target_round from public.game_rounds gr where gr.room_id=target_room.id and gr.status='active' order by gr.round_number desc limit 1 for update;
  if not found then raise exception 'Round is not available'; end if;
  if pg_catalog.clock_timestamp()>=target_round.ends_at then raise exception 'Round has expired'; end if;
  select rp.role into caller_role from public.room_players rp where rp.room_id=target_room.id and rp.user_id=caller_id;
  if caller_role<>'police' then raise exception 'Only Police can investigate'; end if;
  if exists(select 1 from public.game_investigations gi where gi.round_id=target_round.id) then raise exception 'Investigation already used'; end if;
  select p.id,p.username into target_id,target_name from public.profiles p join public.room_players rp on rp.user_id=p.id and rp.room_id=target_room.id where lower(p.username)=lower(trim(p_target_username));
  if not found then raise exception 'Target player not found'; end if;
  if target_id=caller_id then raise exception 'Cannot investigate yourself'; end if;
  select rp.role into target_role_value from public.room_players rp where rp.room_id=target_room.id and rp.user_id=target_id;
  if target_role_value is null then raise exception 'Target role is not assigned'; end if;
  target_is_hidden:=target_role_value='thief' and exists(select 1 from public.game_thief_hides h where h.round_id=target_round.id and h.thief_user_id=target_id and h.hidden_until>pg_catalog.clock_timestamp());
  insert into public.game_investigations(round_id,police_user_id,target_user_id,target_username,target_role) values(target_round.id,caller_id,target_id,target_name,target_role_value);
  return query select target_name,case when target_is_hidden then 'hidden' else target_role_value end;
end;
$$;
revoke execute on function public.investigate_player(text,text) from public,anon;
grant execute on function public.investigate_player(text,text) to authenticated;

create or replace function public.get_my_investigation(p_code text)
returns table(used boolean,target_username text,target_role text)
language plpgsql security definer stable set search_path=public,pg_catalog
as $$
declare caller_id uuid:=auth.uid(); target_room public.rooms%rowtype; target_round public.game_rounds%rowtype; caller_role text;
begin
  if caller_id is null then raise exception 'Not authenticated' using errcode='42501'; end if;
  select r.* into target_room from public.rooms r where r.code=upper(trim(p_code));
  if not found then raise exception 'Room not found'; end if;
  if not exists(select 1 from public.room_players rp where rp.room_id=target_room.id and rp.user_id=caller_id) then raise exception 'You are not in this room' using errcode='42501'; end if;
  select rp.role into caller_role from public.room_players rp where rp.room_id=target_room.id and rp.user_id=caller_id;
  if caller_role<>'police' then raise exception 'Only Police can view investigation state'; end if;
  select gr.* into target_round from public.game_rounds gr where gr.room_id=target_room.id and gr.status='active' order by gr.round_number desc limit 1;
  if not found then return query select false,null::text,null::text; return; end if;
  return query select true,gi.target_username,case when gi.target_role='thief' and exists(select 1 from public.game_thief_hides h where h.round_id=gi.round_id and h.thief_user_id=gi.target_user_id and h.hidden_until>gi.created_at) then 'hidden' else gi.target_role end from public.game_investigations gi where gi.round_id=target_round.id and gi.police_user_id=caller_id limit 1;
  if not found then return query select false,null::text,null::text; end if;
end;
$$;
revoke execute on function public.get_my_investigation(text) from public,anon;
grant execute on function public.get_my_investigation(text) to authenticated;
