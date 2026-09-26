-- Controlled role action: Thief Hide.
-- Play Again lifecycle and round-resolution logic are intentionally unchanged.

create table public.game_thief_hides (
  id uuid primary key default gen_random_uuid(),
  round_id uuid not null unique references public.game_rounds(id) on delete cascade,
  thief_user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  hidden_until timestamptz not null,
  constraint game_thief_hides_time_check check (hidden_until > created_at)
);

create index game_thief_hides_thief_user_id_idx
  on public.game_thief_hides(thief_user_id);

alter table public.game_thief_hides enable row level security;
revoke all on table public.game_thief_hides from public, anon, authenticated;

create or replace function public.hide_thief(p_code text)
returns table (hidden_until timestamptz)
language plpgsql
security definer volatile
set search_path = public, pg_catalog
as $$
declare
  caller_id uuid := auth.uid();
  target_room public.rooms%rowtype;
  target_round public.game_rounds%rowtype;
  caller_role text;
  hide_until timestamptz := clock_timestamp() + interval '60 seconds';
begin
  if caller_id is null then
    raise exception 'Not authenticated' using errcode = '42501';
  end if;

  select r.* into target_room
  from public.rooms as r
  where r.code = upper(trim(p_code))
  for update;

  if not found then raise exception 'Room not found'; end if;
  if target_room.status <> 'playing' then raise exception 'Room is not playing'; end if;

  if not exists (
    select 1 from public.room_players as rp
    where rp.room_id = target_room.id and rp.user_id = caller_id
  ) then
    raise exception 'You are not in this room' using errcode = '42501';
  end if;

  select gr.* into target_round
  from public.game_rounds as gr
  where gr.room_id = target_room.id and gr.status = 'active'
  order by gr.round_number desc limit 1
  for update;

  if not found then raise exception 'Round is not available'; end if;
  if pg_catalog.clock_timestamp() >= target_round.ends_at then raise exception 'Round has expired'; end if;

  select rp.role into caller_role
  from public.room_players as rp
  where rp.room_id = target_room.id and rp.user_id = caller_id;

  if caller_role <> 'thief' then raise exception 'Only Thief can use Hide'; end if;

  if exists (
    select 1 from public.game_thief_hides as h where h.round_id = target_round.id
  ) then
    raise exception 'Hide already used';
  end if;

  insert into public.game_thief_hides (round_id, thief_user_id, hidden_until)
  values (target_round.id, caller_id, least(hide_until, target_round.ends_at));

  return query select least(hide_until, target_round.ends_at);
end;
$$;

revoke execute on function public.hide_thief(text) from public, anon;
grant execute on function public.hide_thief(text) to authenticated;

create or replace function public.get_my_thief_hide(p_code text)
returns table (used boolean, hidden_until timestamptz)
language plpgsql
security definer stable
set search_path = public, pg_catalog
as $$
declare
  caller_id uuid := auth.uid();
  target_room public.rooms%rowtype;
  target_round public.game_rounds%rowtype;
  caller_role text;
begin
  if caller_id is null then raise exception 'Not authenticated' using errcode = '42501'; end if;

  select r.* into target_room
  from public.rooms as r where r.code = upper(trim(p_code));
  if not found then raise exception 'Room not found'; end if;

  if not exists (
    select 1 from public.room_players as rp
    where rp.room_id = target_room.id and rp.user_id = caller_id
  ) then
    raise exception 'You are not in this room' using errcode = '42501';
  end if;

  select rp.role into caller_role
  from public.room_players as rp
  where rp.room_id = target_room.id and rp.user_id = caller_id;
  if caller_role <> 'thief' then raise exception 'Only Thief can view Hide state'; end if;

  select gr.* into target_round
  from public.game_rounds as gr
  where gr.room_id = target_room.id
  order by gr.round_number desc limit 1;
  if not found then raise exception 'Round is not available'; end if;

  return query
  select
    exists (
      select 1 from public.game_thief_hides as h
      where h.round_id = target_round.id and h.thief_user_id = caller_id
    ),
    (
      select h.hidden_until from public.game_thief_hides as h
      where h.round_id = target_round.id and h.thief_user_id = caller_id
    );
end;
$$;

revoke execute on function public.get_my_thief_hide(text) from public, anon;
grant execute on function public.get_my_thief_hide(text) to authenticated;
