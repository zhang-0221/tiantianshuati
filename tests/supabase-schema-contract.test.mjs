import assert from 'node:assert/strict';
import fs from 'node:fs';

const sql = fs.readFileSync(
  new URL('../supabase/migrations/20260714_account_auth_and_sync.sql', import.meta.url),
  'utf8',
).toLowerCase();

assert.ok(sql.includes('create table public.profiles'));
assert.ok(sql.includes('username text not null unique'));
assert.ok(sql.includes('create table public.learning_snapshots'));
assert.ok(sql.includes('user_id uuid primary key references auth.users(id) on delete cascade'));
assert.ok(sql.includes('alter table public.profiles enable row level security'));
assert.ok(sql.includes('alter table public.learning_snapshots enable row level security'));
assert.ok(sql.includes('auth.uid() = user_id'));
assert.doesNotMatch(sql, /service_role_key/i);

console.log('supabase schema contract passed');
