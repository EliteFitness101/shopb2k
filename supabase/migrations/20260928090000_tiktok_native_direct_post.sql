create extension if not exists pgcrypto;

create table if not exists public.tiktok_oauth_states (
  state text primary key,
  user_id uuid references auth.users(id) on delete cascade,
  return_to text not null default '/content',
  expires_at timestamptz not null,
  created_at timestamptz not null default now(),
  consumed_at timestamptz
);

create index if not exists tiktok_oauth_states_expires_idx
  on public.tiktok_oauth_states (expires_at);

alter table public.tiktok_oauth_states enable row level security;

create table if not exists public.tiktok_connections (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  open_id text not null unique,
  display_name text,
  avatar_url text,
  access_token text not null,
  refresh_token text not null,
  access_token_expires_at timestamptz not null,
  refresh_token_expires_at timestamptz not null,
  scopes text[] not null default '{}',
  token_type text not null default 'Bearer',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists tiktok_connections_user_idx
  on public.tiktok_connections (user_id);

alter table public.tiktok_connections enable row level security;

drop policy if exists "tiktok connections service role only" on public.tiktok_connections;
create policy "tiktok connections service role only"
  on public.tiktok_connections
  for all
  to service_role
  using (true)
  with check (true);
