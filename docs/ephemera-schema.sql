create extension if not exists pgcrypto;

do $$
begin
  create type public.ephemera_file_type as enum ('image', 'pdf');
exception
  when duplicate_object then null;
end $$;

create table if not exists public.ephemeras (
  id uuid primary key default gen_random_uuid(),

  owner_profile_id uuid not null references public.profiles(id) on delete cascade,
  creator_profile_id uuid not null references public.profiles(id) on delete restrict,

  title text not null,
  file_type public.ephemera_file_type not null,
  file_url text not null,
  preview_url text,

  created_at timestamptz not null default now(),
  expires_at timestamptz not null default (now() + interval '7 days'),
  updated_at timestamptz not null default now()
);

create table if not exists public.ephemera_transfer_records (
  id uuid primary key default gen_random_uuid(),

  sender_profile_id uuid not null references public.profiles(id) on delete restrict,
  recipient_profile_id uuid not null references public.profiles(id) on delete restrict,

  ephemera_id_snapshot uuid,
  ephemera_title_snapshot text not null,
  file_type_snapshot public.ephemera_file_type not null,

  transferred_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

alter table public.ephemeras enable row level security;
alter table public.ephemera_transfer_records enable row level security;

drop trigger if exists set_ephemeras_updated_at on public.ephemeras;

create trigger set_ephemeras_updated_at
before update on public.ephemeras
for each row
execute function public.set_updated_at();

create index if not exists ephemeras_owner_profile_id_idx
on public.ephemeras(owner_profile_id);

create index if not exists ephemeras_creator_profile_id_idx
on public.ephemeras(creator_profile_id);

create index if not exists ephemeras_expires_at_idx
on public.ephemeras(expires_at);

create index if not exists ephemera_transfer_records_sender_idx
on public.ephemera_transfer_records(sender_profile_id, transferred_at desc);

create index if not exists ephemera_transfer_records_recipient_idx
on public.ephemera_transfer_records(recipient_profile_id, transferred_at desc);

drop policy if exists "Ephemeras are readable by owner" on public.ephemeras;
drop policy if exists "Ephemeras are insertable by owner" on public.ephemeras;
drop policy if exists "Ephemeras are updatable by owner" on public.ephemeras;

create policy "Ephemeras are readable by owner"
on public.ephemeras
for select
using (auth.uid() = owner_profile_id);

create policy "Ephemeras are insertable by owner"
on public.ephemeras
for insert
with check (
  auth.uid() = owner_profile_id
  and auth.uid() = creator_profile_id
);

create policy "Ephemeras are updatable by owner"
on public.ephemeras
for update
using (auth.uid() = owner_profile_id)
with check (auth.uid() = owner_profile_id);

drop policy if exists "Transfer records are readable by participants" on public.ephemera_transfer_records;
drop policy if exists "Transfer records are insertable by sender" on public.ephemera_transfer_records;

create policy "Transfer records are readable by participants"
on public.ephemera_transfer_records
for select
using (
  auth.uid() = sender_profile_id
  or auth.uid() = recipient_profile_id
);

create policy "Transfer records are insertable by sender"
on public.ephemera_transfer_records
for insert
with check (auth.uid() = sender_profile_id);

create or replace function public.delete_expired_ephemeras()
returns void
language sql
security definer
set search_path = public
as $$
  delete from public.ephemeras
  where expires_at <= now();
$$;

-- Supabase projects that support pg_cron can run this section to delete expired ephemeras hourly.
-- create extension if not exists pg_cron;
--
-- select cron.schedule(
--   'delete-expired-ephemeras',
--   '0 * * * *',
--   $$select public.delete_expired_ephemeras();$$
-- );
