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
