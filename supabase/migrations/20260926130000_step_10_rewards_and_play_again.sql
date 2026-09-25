-- Step 10: authoritative virtual round rewards and repeatable play-again lifecycle.

alter table public.game_rounds
  drop constraint if exists game_rounds_room_id_key;

create unique index if not exists game_rounds_room_id_round_number_unique
  on public.game_rounds (room_id, round_number);

alter table public.room_players
  add column if not exists play_again_ready boolean not null default false;

create table if not exists public.player_wallets (
  user_id uuid primary key references auth.users(id) on delete cascade,
  coins bigint not null default 0,
  xp bigint not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint player_wallets_coins_non_negative check (coins >= 0),
  constraint player_wallets_xp_non_negative check (xp >= 0)
);

create table if not exists public.game_round_rewards (
  id uuid primary key default gen_random_uuid(),
  round_id uuid not null references public.game_rounds(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  reward_type text not null,
  coins bigint not null,
  xp bigint not null,
  created_at timestamptz not null default now(),
  constraint game_round_rewards_unique_player unique (round_id, user_id),
  constraint game_round_rewards_type_check check (reward_type in (
    'police_caught_thief', 'police_wrong_accusation', 'thief_escaped_timeout'
  )),
  constraint game_round_rewards_coins_non_negative check (coins >= 0),
  constraint game_round_rewards_xp_non_negative check (xp >= 0)
);

create index if not exists game_round_rewards_user_id_idx
  on public.game_round_rewards (user_id, created_at desc);

alter table public.player_wallets enable row level security;
alter table public.game_round_rewards enable row level security;

revoke all on table public.player_wallets from public, anon, authenticated;
revoke all on table public.game_round_rewards from public, anon, authenticated;

create or replace function public.set_player_wallet_updated_at()
returns trigger
language plpgsql
set search_path = public, pg_catalog
as $$
begin
  new.updated_at = clock_timestamp();
  return new;
end;
$$;

revoke execute on function public.set_player_wallet_updated_at() from public, anon, authenticated;

drop trigger if exists player_wallets_set_updated_at on public.player_wallets;
create trigger player_wallets_set_updated_at
before update on public.player_wallets
for each row execute function public.set_player_wallet_updated_at();

create or replace function public.apply_round_rewards()
returns trigger
language plpgsql
security definer
set search_path = public, pg_catalog
as $$
declare
  reward_coins bigint;
  reward_xp bigint;
  player_record record;
  inserted_reward boolean;
  player_count integer;
  police_count integer;
  thief_count integer;
  people_count integer;
begin
  if new.status <> 'finished' or new.result is null then
    return new;
  end if;

  select count(*)::integer,
         count(*) filter (where rp.role = 'police')::integer,
         count(*) filter (where rp.role = 'thief')::integer,
         count(*) filter (where rp.role = 'people')::integer
  into player_count, police_count, thief_count, people_count
  from public.room_players rp
  where rp.room_id = new.room_id;

  if player_count <> 4 or police_count <> 1 or thief_count <> 1 or people_count <> 2 then
    raise exception 'Round reward roles are not a valid 4-player game';
  end if;

  for player_record in
    select rp.user_id, rp.role
    from public.room_players rp
    where rp.room_id = new.room_id
    order by rp.joined_at
  loop
    if player_record.role = 'police' then
      if new.result = 'police_caught_thief' then
        reward_coins := 100; reward_xp := 100;
      else
        reward_coins := 25; reward_xp := 25;
      end if;
    elsif player_record.role = 'thief' then
      if new.result = 'police_caught_thief' then
        reward_coins := 25; reward_xp := 25;
      else
        reward_coins := 100; reward_xp := 100;
      end if;
    elsif player_record.role = 'people' then
      reward_coins := 50; reward_xp := 50;
    else
      raise exception 'Round reward role is not assigned';
    end if;

    insert into public.game_round_rewards (
      round_id, user_id, reward_type, coins, xp
    )
    values (
      new.id, player_record.user_id, new.result, reward_coins, reward_xp
    )
    on conflict (round_id, user_id) do nothing;

    if found then
      insert into public.player_wallets (user_id, coins, xp)
      values (player_record.user_id, reward_coins, reward_xp)
      on conflict (user_id) do update
      set
        coins = public.player_wallets.coins + excluded.coins,
        xp = public.player_wallets.xp + excluded.xp;
    end if;
  end loop;

  return new;
end;
$$;

revoke execute on function public.apply_round_rewards() from public, anon, authenticated;

drop trigger if exists game_rounds_apply_rewards on public.game_rounds;
create trigger game_rounds_apply_rewards
after update of status on public.game_rounds
for each row
when (old.status is distinct from new.status and new.status = 'finished')
execute function public.apply_round_rewards();

create or replace function public.get_my_round_reward(p_code text)
returns table (
  round_id uuid, round_number integer, reward_type text,
  coins bigint, xp bigint, created_at timestamptz
)
language plpgsql
security definer stable
set search_path = public, pg_catalog
as $$
declare
  caller_id uuid := auth.uid();
  target_room public.rooms%rowtype;
  target_round public.game_rounds%rowtype;
begin
  if caller_id is null then
    raise exception 'Not authenticated' using errcode = '42501';
  end if;

  select r.* into target_room
  from public.rooms r where r.code = upper(trim(p_code));
  if not found then raise exception 'Room not found'; end if;

  if not exists (
    select 1 from public.room_players rp
    where rp.room_id = target_room.id and rp.user_id = caller_id
  ) then
    raise exception 'You are not in this room' using errcode = '42501';
  end if;

  select gr.* into target_round
  from public.game_rounds gr
  where gr.room_id = target_room.id
  order by gr.round_number desc limit 1;

  if not found or target_round.status <> 'finished' then
    raise exception 'Round reward is not available';
  end if;

  return query
  select grr.round_id, target_round.round_number, grr.reward_type,
         grr.coins, grr.xp, grr.created_at
  from public.game_round_rewards grr
  where grr.round_id = target_round.id and grr.user_id = caller_id;
end;
$$;

revoke execute on function public.get_my_round_reward(text) from public, anon;
grant execute on function public.get_my_round_reward(text) to authenticated;

create or replace function public.play_again(p_code text)
returns table (room_status text, play_again_count integer, reset_to_waiting boolean)
language plpgsql
security definer volatile
set search_path = public, pg_catalog
as $$
declare
  caller_id uuid := auth.uid();
  target_room public.rooms%rowtype;
  target_round public.game_rounds%rowtype;
  player_count integer;
  opted_in_count integer;
begin
  if caller_id is null then
    raise exception 'Not authenticated' using errcode = '42501';
  end if;

  select r.* into target_room
  from public.rooms r
  where r.code = upper(trim(p_code))
  for update;
  if not found then raise exception 'Room not found'; end if;

  if not exists (
    select 1 from public.room_players rp
    where rp.room_id = target_room.id and rp.user_id = caller_id
  ) then
    raise exception 'You are not in this room' using errcode = '42501';
  end if;

  if target_room.status <> 'finished' then
    raise exception 'Room is not finished';
  end if;

  select gr.* into target_round
  from public.game_rounds gr
  where gr.room_id = target_room.id
  order by gr.round_number desc limit 1
  for update;
  if not found or target_round.status <> 'finished' then
    raise exception 'Finished round is not available';
  end if;

  select count(*)::integer into player_count
  from public.room_players rp where rp.room_id = target_room.id;
  if player_count <> 4 then
    raise exception 'Exactly 4 current players are required to play again';
  end if;

  update public.room_players
  set play_again_ready = true
  where room_id = target_room.id and user_id = caller_id;

  select count(*)::integer into opted_in_count
  from public.room_players rp
  where rp.room_id = target_room.id and rp.play_again_ready;

  if opted_in_count < 4 then
    return query select 'finished'::text, opted_in_count, false;
    return;
  end if;

  update public.room_players
  set play_again_ready = false, is_ready = false, role = null
  where room_id = target_room.id;

  update public.rooms
  set status = 'waiting'
  where id = target_room.id and status = 'finished';

  return query select 'waiting'::text, 0, true;
end;
$$;

revoke execute on function public.play_again(text) from public, anon;
grant execute on function public.play_again(text) to authenticated;

create or replace function public.start_room(p_room_id uuid)
returns void
language plpgsql
security definer
set search_path = public, pg_catalog
as $$
declare
  target_room public.rooms%rowtype;
  player_count integer;
  not_ready_count integer;
  assigned_role_count integer;
  round_count integer;
  latest_round_status text;
  next_round_number integer;
  round_started_at timestamptz := clock_timestamp();
begin
  select r.* into target_room
  from public.rooms r where r.id = p_room_id for update;
  if not found then raise exception 'Room not found'; end if;
  if target_room.status <> 'waiting' then raise exception 'Room is not waiting'; end if;

  select count(*)::integer into player_count
  from public.room_players rp where rp.room_id = target_room.id;
  if player_count <> 4 then raise exception 'Room must have exactly 4 players'; end if;

  select count(*)::integer into not_ready_count
  from public.room_players rp
  where rp.room_id = target_room.id and not rp.is_ready;
  if not_ready_count <> 0 then raise exception 'All players must be ready'; end if;

  select count(*)::integer into assigned_role_count
  from public.room_players rp
  where rp.room_id = target_room.id and rp.role is not null;
  if assigned_role_count <> 0 then raise exception 'Roles are already assigned'; end if;

  select count(*)::integer into round_count
  from public.game_rounds gr where gr.room_id = target_room.id;

  if round_count > 0 then
    select gr.status, gr.round_number
    into latest_round_status, next_round_number
    from public.game_rounds gr
    where gr.room_id = target_room.id
    order by gr.round_number desc limit 1;
    if latest_round_status <> 'finished' then
      raise exception 'Previous game round is not finished';
    end if;
  end if;

  next_round_number := coalesce(next_round_number, 0) + 1;

  with randomized_players as (
    select rp.user_id, row_number() over (order by random()) as role_position
    from public.room_players rp where rp.room_id = target_room.id
  )
  update public.room_players rp
  set role = case randomized_players.role_position
    when 1 then 'police' when 2 then 'thief' when 3 then 'people' when 4 then 'people'
  end
  from randomized_players
  where rp.room_id = target_room.id and rp.user_id = randomized_players.user_id;

  insert into public.game_rounds (
    room_id, round_number, status, started_at, ends_at
  )
  values (
    target_room.id, next_round_number, 'active', round_started_at,
    round_started_at + (public.round_duration_seconds() * interval '1 second')
  );

  update public.rooms set status = 'playing' where id = target_room.id;
end;
$$;

revoke execute on function public.start_room(uuid) from public, anon, authenticated;
grant execute on function public.start_room(uuid) to service_role;
