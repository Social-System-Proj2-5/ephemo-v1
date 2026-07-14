create extension if not exists citext;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username citext not null unique,
  display_name text not null,
  auth_email text not null unique,
  points integer not null default 20 check (points >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles
add column if not exists points integer not null default 20;

do $$
begin
  alter table public.profiles
  add constraint profiles_points_nonnegative check (points >= 0);
exception
  when duplicate_object then null;
end $$;

alter table public.profiles enable row level security;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_profiles_updated_at on public.profiles;

create trigger set_profiles_updated_at
before update on public.profiles
for each row
execute function public.set_updated_at();

create or replace function public.add_profile_points(
  target_profile_id uuid,
  point_amount integer
)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  next_points integer;
begin
  if point_amount <= 0 then
    raise exception 'point_amount must be positive';
  end if;

  update public.profiles
  set points = points + point_amount
  where id = target_profile_id
  returning points into next_points;

  if next_points is null then
    raise exception 'profile not found';
  end if;

  return next_points;
end;
$$;

create or replace function public.spend_profile_points(
  target_profile_id uuid,
  point_amount integer
)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  next_points integer;
begin
  if point_amount <= 0 then
    raise exception 'point_amount must be positive';
  end if;

  update public.profiles
  set points = points - point_amount
  where id = target_profile_id
    and points >= point_amount
  returning points into next_points;

  return next_points;
end;
$$;

drop policy if exists "Profiles are readable by owner" on public.profiles;
drop policy if exists "Profiles are insertable by owner" on public.profiles;
drop policy if exists "Profiles are updatable by owner" on public.profiles;

create policy "Profiles are readable by owner"
on public.profiles
for select
using (auth.uid() = id);

create policy "Profiles are insertable by owner"
on public.profiles
for insert
with check (auth.uid() = id);

create policy "Profiles are updatable by owner"
on public.profiles
for update
using (auth.uid() = id)
with check (auth.uid() = id);
