import assert from 'node:assert/strict';
import fs from 'node:fs';

const sql = fs.readFileSync(
  new URL('../supabase/migrations/20260714_account_auth_and_sync.sql', import.meta.url),
  'utf8',
).toLowerCase();

assert.ok(sql.includes('create table public.profiles'));
assert.ok(sql.includes('id uuid primary key references auth.users(id) on delete cascade'));
assert.ok(sql.includes('username text not null unique'));
assert.match(
  sql,
  /username\s*=\s*lower\(username\)\s+and\s+username\s*~\s*'\^\[a-z0-9_\]\{3,24\}\$'/s,
);
assert.ok(sql.includes('email text not null'));
assert.ok(sql.includes('created_at timestamptz not null default now()'));
assert.ok(sql.includes('updated_at timestamptz not null default now()'));
assert.ok(sql.includes('create table public.learning_snapshots'));
assert.ok(sql.includes('user_id uuid primary key references auth.users(id) on delete cascade'));
assert.ok(sql.includes("library jsonb not null default '[]'::jsonb"));
assert.ok(sql.includes("progress jsonb not null default '{\"daily\": {}, \"bytype\": {}}'::jsonb"));
assert.ok(sql.includes("vocab_history jsonb not null default '[]'::jsonb"));
assert.ok(sql.includes("settings jsonb not null default '{}'::jsonb"));
assert.match(
  sql,
  /create table public\.learning_snapshots\s*\([\s\S]*?updated_at timestamptz not null default now\(\)/,
);
assert.match(
  sql,
  /create or replace function public\.set_updated_at\(\)\s+returns trigger\s+language plpgsql\s+as \$\$\s+begin\s+new\.updated_at := now\(\);\s+return new;\s+end;\s+\$\$/s,
);
assert.match(
  sql,
  /create trigger profiles_set_updated_at\s+before update on public\.profiles\s+for each row\s+execute function public\.set_updated_at\(\)/s,
);
assert.match(
  sql,
  /create trigger learning_snapshots_set_updated_at\s+before update on public\.learning_snapshots\s+for each row\s+execute function public\.set_updated_at\(\)/s,
);
assert.ok(sql.includes('alter table public.profiles enable row level security'));
assert.ok(sql.includes('alter table public.learning_snapshots enable row level security'));
assert.match(
  sql,
  /create policy "profiles can be read by their owner"\s+on public\.profiles\s+for select\s+to authenticated\s+using \(auth\.uid\(\) = id\)/s,
);
assert.match(
  sql,
  /create policy "snapshots can be read by their owner"\s+on public\.learning_snapshots\s+for select\s+to authenticated\s+using \(auth\.uid\(\) = user_id\)/s,
);
assert.match(
  sql,
  /create policy "snapshots can be created by their owner"\s+on public\.learning_snapshots\s+for insert\s+to authenticated\s+with check \(auth\.uid\(\) = user_id\)/s,
);
assert.match(
  sql,
  /create policy "snapshots can be updated by their owner"\s+on public\.learning_snapshots\s+for update\s+to authenticated\s+using \(auth\.uid\(\) = user_id\)\s+with check \(auth\.uid\(\) = user_id\)/s,
);

const profilePolicies = sql
  .split(/(?=create policy )/)
  .filter((policy) => policy.includes('on public.profiles'));

assert.ok(profilePolicies.length > 0);
assert.ok(profilePolicies.every((policy) => !/for\s+(insert|all)\b/.test(policy)));
assert.doesNotMatch(sql, /service_role_key/i);

console.log('supabase schema contract passed');
