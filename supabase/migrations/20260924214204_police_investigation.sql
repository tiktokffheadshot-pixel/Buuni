create table public.game_investigations (
  id uuid primary key default gen_random_uuid(),
  round_id uuid not null references public.game_rounds(id) on delete cascade,
  police_user_id uuid not null references auth.users(id) on delete cascade,
  target_user_id uuid not null references auth.users(id) on delete cascade,
  target_username text not null,
  target_role text not null,
  created_at timestamptz not null default now(),
  constraint game_investigations_target_role_check
    check (target_role in ('police', 'thief', 'people')),
  constraint game_investigations_not_self_check
    check (police_user_id <> target_user_id),
  constraint game_investigations_one_per_round
    unique (round_id)
);

create index game_investigations_police_user_id_idx
  on public.game_investigations(police_user_id);

create index game_investigations_target_user_id_idx
  on public.game_investigations(target_user_id);

alter table public.game_investigations enable row level security;

revoke all on table public.game_investigations from public, anon, authenticated;

create or replace function public.investigate_player(
  p_code text,
  p_target_username text
)
returns table (
  target_username text,
  target_role text
)
language plpgsql
security definer
volatile
set search_path = ''
as $$
declare
  caller_id uuid := auth.uid();
  target_room public.rooms%rowtype;
  target_round public.game_rounds%rowtype;
  caller_role text;
  target_id uuid;
  target_name text;
  target_role_value text;
begin
  if caller_id is null then
    raise exception 'Not authenticated' using errcode = '42501';
  end if;

  select r.*
  into target_room
  from public.rooms as r
  where r.code = upper(trim(p_code));

  if not found then
    raise exception 'Room not found';
  end if;

  if target_room.status <> 'playing' then
    raise exception 'Room is not playing';
  end if;

  if not exists (
    select 1
    from public.room_players as rp
    where rp.room_id = target_room.id
      and rp.user_id = caller_id
  ) then
    raise exception 'You are not in this room' using errcode = '42501';
  end if;

  select gr.*
  into target_round
  from public.game_rounds as gr
  where gr.room_id = target_room.id
    and gr.status = 'active'
  order by gr.round_number desc
  limit 1
  for update;

  if not found then
    raise exception 'Round is not available';
  end if;

  if pg_catalog.clock_timestamp() >= target_round.ends_at then
    raise exception 'Round has expired';
  end if;

  select rp.role
  into caller_role
  from public.room_players as rp
  where rp.room_id = target_room.id
    and rp.user_id = caller_id;

  if caller_role <> 'police' then
    raise exception 'Only Police can investigate';
  end if;

  if exists (
    select 1
    from public.game_investigations as gi
    where gi.round_id = target_round.id
  ) then
    raise exception 'Investigation already used';
  end if;

  select p.id, p.username
  into target_id, target_name
  from public.profiles as p
  join public.room_players as rp
    on rp.user_id = p.id
   and rp.room_id = target_room.id
  where lower(p.username) = lower(trim(p_target_username));

  if not found then
    raise exception 'Target player not found';
  end if;

  if target_id = caller_id then
    raise exception 'Cannot investigate yourself';
  end if;

  select rp.role
  into target_role_value
  from public.room_players as rp
  where rp.room_id = target_room.id
    and rp.user_id = target_id;

  if target_role_value is null then
    raise exception 'Target role is not assigned';
  end if;

  insert into public.game_investigations (
    round_id,
    police_user_id,
    target_user_id,
    target_username,
    target_role
  )
  values (
    target_round.id,
    caller_id,
    target_id,
    target_name,
    target_role_value
  );

  return query
  select target_name, target_role_value;
end;
$$;

revoke execute on function public.investigate_player(text, text)
  from public, anon;
grant execute on function public.investigate_player(text, text)
  to authenticated;
