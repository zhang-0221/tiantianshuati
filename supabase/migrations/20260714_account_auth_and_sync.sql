-- Account metadata is created by trusted server-side registration code only.
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text not null unique check (
    username = lower(username)
    and username ~ '^[a-z0-9_]{3,24}$'
  ),
  email text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.learning_snapshots (
  user_id uuid primary key references auth.users(id) on delete cascade,
  library jsonb not null default '[]'::jsonb,
  progress jsonb not null default '{"daily": {}, "byType": {}}'::jsonb,
  vocab_history jsonb not null default '[]'::jsonb,
  settings jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

-- This runs in the same transaction as auth.users creation. A failed profile
-- insert (including a duplicate username) rolls back the auth user as well.
create or replace function public.create_profile_for_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  requested_username text := lower(trim(coalesce(new.raw_user_meta_data ->> 'username', '')));
begin
  if requested_username !~ '^[a-z0-9_]{3,24}$' then
    raise exception 'invalid username';
  end if;

  insert into public.profiles (id, username, email)
  values (new.id, requested_username, new.email);
  return new;
end;
$$;

create trigger on_auth_user_created
after insert on auth.users
for each row
execute function public.create_profile_for_new_user();

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create trigger profiles_set_updated_at
before update on public.profiles
for each row
execute function public.set_updated_at();

create trigger learning_snapshots_set_updated_at
before update on public.learning_snapshots
for each row
execute function public.set_updated_at();

alter table public.profiles enable row level security;
alter table public.learning_snapshots enable row level security;

create policy "profiles can be read by their owner"
on public.profiles
for select
to authenticated
using (auth.uid() = id);

create policy "snapshots can be read by their owner"
on public.learning_snapshots
for select
to authenticated
using (auth.uid() = user_id);

create policy "snapshots can be created by their owner"
on public.learning_snapshots
for insert
to authenticated
with check (auth.uid() = user_id);

create policy "snapshots can be updated by their owner"
on public.learning_snapshots
for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);
