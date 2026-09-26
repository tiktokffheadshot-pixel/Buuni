-- Authoritative role gameplay events and safe current-round activity.
-- Economy/rewards, role assignment, timer, accusation resolution, timeout resolution,
-- round numbering, and Play Again lifecycle remain unchanged.

create table if not exists public.game_events (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references public.rooms(id) on delete cascade,
  round_id uuid not null references public.game_rounds(id) on delete cascade,
  actor_user_id uuid references auth.users(id) on delete set null,
  event_type text not null check (event_type in ('thief_hide','police_investigation','police_accusation','round_finished')),
  created_at timestamptz not null default clock_timestamp()
);
create index if not exists game_events_round_created_at_idx on public.game_events(round_id, created_at desc);
create index if not exists game_events_room_id_idx on public.game_events(room_id);
create index if not exists game_events_actor_user_id_idx on public.game_events(actor_user_id);
alter table public.game_events enable row level security;
revoke all on public.game_events from public, anon, authenticated;

create or replace function public.record_round_finished_event()
returns trigger language plpgsql security definer set search_path=public,pg_catalog
as $$
begin
  if old.status <> 'finished' and new.status = 'finished' then
    insert into public.game_events(room_id,round_id,event_type)
    values(new.room_id,new.id,'round_finished');
  end if;
  return new;
end;
$$;
revoke execute on function public.record_round_finished_event() from public,anon,authenticated;
drop trigger if exists game_rounds_finished_event on public.game_rounds;
create trigger game_rounds_finished_event after update of status on public.game_rounds
for each row execute function public.record_round_finished_event();

create or replace function public.get_game_activity(p_code text)
returns table(event_type text, created_at timestamptz)
language plpgsql security definer stable set search_path=public,pg_catalog
as $$
declare
  caller_id uuid := auth.uid();
  target_room public.rooms%rowtype;
  target_round public.game_rounds%rowtype;
begin
  if caller_id is null then raise exception 'Not authenticated' using errcode='42501'; end if;
  select r.* into target_room from public.rooms r where r.code=upper(trim(p_code));
  if not found then raise exception 'Room not found'; end if;
  if not exists(select 1 from public.room_players rp where rp.room_id=target_room.id and rp.user_id=caller_id) then
    raise exception 'You are not in this room' using errcode='42501';
  end if;
  select gr.* into target_round from public.game_rounds gr where gr.room_id=target_room.id order by gr.round_number desc limit 1;
  if not found then return; end if;
  return query
  select ge.event_type,ge.created_at
  from public.game_events ge
  where ge.room_id=target_room.id and ge.round_id=target_round.id
  order by ge.created_at desc,ge.id desc;
end;
$$;
revoke execute on function public.get_game_activity(text) from public,anon;
grant execute on function public.get_game_activity(text) to authenticated;

create or replace function public.hide_thief(p_code text)
returns table(hidden_until timestamptz)
language plpgsql security definer set search_path=public,pg_catalog
as $$
declare
  caller_id uuid:=auth.uid();
  target_room public.rooms%rowtype;
  target_round public.game_rounds%rowtype;
  caller_role text;
  hide_until timestamptz:=clock_timestamp()+interval '60 seconds';
  actual_hidden_until timestamptz;
begin
  if caller_id is null then raise exception 'Not authenticated' using errcode='42501'; end if;
  select r.* into target_room from public.rooms r where r.code=upper(trim(p_code)) for update;
  if not found then raise exception 'Room not found'; end if;
  if target_room.status<>'playing' then raise exception 'Room is not playing'; end if;
  if not exists(select 1 from public.room_players rp where rp.room_id=target_room.id and rp.user_id=caller_id) then
    raise exception 'You are not in this room' using errcode='42501';
  end if;
  select gr.* into target_round from public.game_rounds gr where gr.room_id=target_room.id and gr.status='active' order by gr.round_number desc limit 1 for update;
  if not found then raise exception 'Round is not available'; end if;
  if clock_timestamp()>=target_round.ends_at then raise exception 'Round has expired'; end if;
  select rp.role into caller_role from public.room_players rp where rp.room_id=target_room.id and rp.user_id=caller_id;
  if caller_role<>'thief' then raise exception 'Only Thief can use Hide'; end if;
  if exists(select 1 from public.game_thief_hides h where h.round_id=target_round.id) then raise exception 'Hide already used'; end if;
  actual_hidden_until:=least(hide_until,target_round.ends_at);
  insert into public.game_thief_hides(round_id,thief_user_id,hidden_until) values(target_round.id,caller_id,actual_hidden_until);
  insert into public.game_events(room_id,round_id,actor_user_id,event_type) values(target_room.id,target_round.id,caller_id,'thief_hide');
  return query select actual_hidden_until;
end;
$$;
revoke execute on function public.hide_thief(text) from public,anon;
grant execute on function public.hide_thief(text) to authenticated;

create or replace function public.investigate_player(p_code text,p_target_username text)
returns table(target_username text,target_role text)
language plpgsql security definer set search_path=public,pg_catalog
as $$
declare
  caller_id uuid:=auth.uid();
  target_room public.rooms%rowtype;
  target_round public.game_rounds%rowtype;
  caller_role text;
  target_id uuid;
  target_name text;
  target_role_value text;
  target_is_hidden boolean:=false;
begin
  if caller_id is null then raise exception 'Not authenticated' using errcode='42501'; end if;
  select r.* into target_room from public.rooms r where r.code=upper(trim(p_code));
  if not found then raise exception 'Room not found'; end if;
  if target_room.status<>'playing' then raise exception 'Room is not playing'; end if;
  if not exists(select 1 from public.room_players rp where rp.room_id=target_room.id and rp.user_id=caller_id) then
    raise exception 'You are not in this room' using errcode='42501';
  end if;
  select gr.* into target_round from public.game_rounds gr where gr.room_id=target_room.id and gr.status='active' order by gr.round_number desc limit 1 for update;
  if not found then raise exception 'Round is not available'; end if;
  if clock_timestamp()>=target_round.ends_at then raise exception 'Round has expired'; end if;
  select rp.role into caller_role from public.room_players rp where rp.room_id=target_room.id and rp.user_id=caller_id;
  if caller_role<>'police' then raise exception 'Only Police can investigate'; end if;
  if exists(select 1 from public.game_investigations gi where gi.round_id=target_round.id) then raise exception 'Investigation already used'; end if;
  select p.id,p.username into target_id,target_name from public.profiles p join public.room_players rp on rp.user_id=p.id and rp.room_id=target_room.id where lower(p.username)=lower(trim(p_target_username));
  if not found then raise exception 'Target player not found'; end if;
  if target_id=caller_id then raise exception 'Cannot investigate yourself'; end if;
  select rp.role into target_role_value from public.room_players rp where rp.room_id=target_room.id and rp.user_id=target_id;
  if target_role_value is null then raise exception 'Target role is not assigned'; end if;
  target_is_hidden:=target_role_value='thief' and exists(select 1 from public.game_thief_hides h where h.round_id=target_round.id and h.thief_user_id=target_id and h.hidden_until>clock_timestamp());
  insert into public.game_investigations(round_id,police_user_id,target_user_id,target_username,target_role) values(target_round.id,caller_id,target_id,target_name,target_role_value);
  insert into public.game_events(room_id,round_id,actor_user_id,event_type) values(target_room.id,target_round.id,caller_id,'police_investigation');
  return query select target_name,case when target_is_hidden then 'hidden' else target_role_value end;
end;
$$;
revoke execute on function public.investigate_player(text,text) from public,anon;
grant execute on function public.investigate_player(text,text) to authenticated;

create or replace function public.accuse_player(p_code text,p_target_username text)
returns table(target_username text)
language plpgsql security definer set search_path=public,pg_catalog
as $$
declare
  caller_id uuid:=auth.uid();
  target_room public.rooms%rowtype;
  target_round public.game_rounds%rowtype;
  caller_role text;
  target_id uuid;
  target_name text;
  target_role_value text;
  resolution_result text;
  resolution_finished_at timestamptz:=clock_timestamp();
begin
  if caller_id is null then raise exception 'Not authenticated' using errcode='42501'; end if;
  select r.* into target_room from public.rooms r where r.code=upper(trim(p_code)) for update;
  if not found then raise exception 'Room not found'; end if;
  if not exists(select 1 from public.room_players rp where rp.room_id=target_room.id and rp.user_id=caller_id) then raise exception 'You are not in this room' using errcode='42501'; end if;
  if target_room.status<>'playing' then raise exception 'Room is not playing'; end if;
  select gr.* into target_round from public.game_rounds gr where gr.room_id=target_room.id and gr.status='active' order by gr.round_number desc limit 1 for update;
  if not found then raise exception 'Round is not available'; end if;
  if clock_timestamp()>=target_round.ends_at then raise exception 'Round has expired'; end if;
  select rp.role into caller_role from public.room_players rp where rp.room_id=target_room.id and rp.user_id=caller_id;
  if caller_role<>'police' then raise exception 'Only Police can accuse'; end if;
  if exists(select 1 from public.game_accusations ga where ga.round_id=target_round.id) then raise exception 'Accusation already used'; end if;
  select p.id,p.username into target_id,target_name from public.profiles p join public.room_players rp on rp.user_id=p.id and rp.room_id=target_room.id where lower(p.username)=lower(trim(p_target_username));
  if not found then raise exception 'Target player not found'; end if;
  if target_id=caller_id then raise exception 'Cannot accuse yourself'; end if;
  select rp.role into target_role_value from public.room_players rp where rp.room_id=target_room.id and rp.user_id=target_id;
  if target_role_value is null or target_role_value not in ('police','thief','people') then raise exception 'Target role is not assigned'; end if;
  insert into public.game_accusations(round_id,police_user_id,target_user_id) values(target_round.id,caller_id,target_id);
  insert into public.game_events(room_id,round_id,actor_user_id,event_type) values(target_room.id,target_round.id,caller_id,'police_accusation');
  resolution_result:=case when target_role_value='thief' then 'police_caught_thief' else 'police_wrong_accusation' end;
  update public.game_rounds set status='finished',result=resolution_result,accused_user_id=target_id,finished_at=resolution_finished_at where id=target_round.id and status='active';
  if not found then raise exception 'Round is no longer active'; end if;
  update public.rooms set status='finished' where id=target_room.id and status='playing';
  return query select target_name;
end;
$$;
revoke execute on function public.accuse_player(text,text) from public,anon;
grant execute on function public.accuse_player(text,text) to authenticated;

create or replace function public.resolve_expired_round(p_code text)
returns table(round_status text,round_result text,finished_at timestamptz)
language plpgsql security definer set search_path=public,pg_catalog
as $$
declare
  caller_id uuid:=auth.uid();
  target_room public.rooms%rowtype;
  target_round public.game_rounds%rowtype;
  accusation_target_id uuid;
  accusation_target_role text;
  accusation_result text;
  resolution_finished_at timestamptz;
begin
  if caller_id is null then raise exception 'Not authenticated' using errcode='42501'; end if;
  select r.* into target_room from public.rooms r where r.code=upper(trim(p_code)) for update;
  if not found then raise exception 'Room not found'; end if;
  if not exists(select 1 from public.room_players rp where rp.room_id=target_room.id and rp.user_id=caller_id) then raise exception 'You are not in this room' using errcode='42501'; end if;
  select gr.* into target_round from public.game_rounds gr where gr.room_id=target_room.id order by gr.round_number desc limit 1 for update;
  if not found then raise exception 'Round is not available'; end if;
  if target_round.status='finished' then return query select target_round.status,target_round.result,target_round.finished_at; return; end if;
  if target_round.status<>'active' then raise exception 'Round is not available'; end if;
  if clock_timestamp()<target_round.ends_at then raise exception 'Round has not expired'; end if;
  select ga.target_user_id into accusation_target_id from public.game_accusations ga where ga.round_id=target_round.id limit 1;
  if accusation_target_id is not null then
    select rp.role into accusation_target_role from public.room_players rp where rp.room_id=target_room.id and rp.user_id=accusation_target_id;
    if accusation_target_role is null or accusation_target_role not in ('police','thief','people') then raise exception 'Accusation target role is not available'; end if;
    accusation_result:=case when accusation_target_role='thief' then 'police_caught_thief' else 'police_wrong_accusation' end;
    resolution_finished_at:=clock_timestamp();
    update public.game_rounds set status='finished',result=accusation_result,accused_user_id=accusation_target_id,finished_at=resolution_finished_at where id=target_round.id and status='active';
    update public.rooms set status='finished' where id=target_room.id and status='playing';
    return query select 'finished'::text,accusation_result,resolution_finished_at; return;
  end if;
  resolution_finished_at:=clock_timestamp();
  update public.game_rounds set status='finished',result='thief_escaped_timeout',finished_at=resolution_finished_at where id=target_round.id and status='active';
  if not found then
    select gr.* into target_round from public.game_rounds gr where gr.id=target_round.id for update;
    if target_round.status='finished' then return query select target_round.status,target_round.result,target_round.finished_at; return; end if;
    raise exception 'Round could not be resolved';
  end if;
  update public.rooms set status='finished' where id=target_room.id and status='playing';
  return query select 'finished'::text,'thief_escaped_timeout'::text,resolution_finished_at;
end;
$$;
revoke execute on function public.resolve_expired_round(text) from public,anon;
grant execute on function public.resolve_expired_round(text) to authenticated;
