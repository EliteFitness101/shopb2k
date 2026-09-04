create table if not exists public.asset_manifest (
  id uuid primary key default gen_random_uuid(),
  blob_pathname text not null unique,
  handle text,
  campaign_type text not null default 'brand' check (campaign_type in ('product','brand','background','music')),
  platform text check (platform in ('tiktok','youtube','google_business')),
  status text not null default 'pending_review' check (status in ('pending_review','approved','rejected','ingested')),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists asset_manifest_status_idx on public.asset_manifest(status);
create index if not exists asset_manifest_platform_idx on public.asset_manifest(platform);
create index if not exists asset_manifest_handle_idx on public.asset_manifest(handle);

create table if not exists public.ingested_blobs (
  id uuid primary key default gen_random_uuid(),
  pathname text not null unique,
  etag text,
  url text,
  content_type text,
  size_bytes bigint,
  source_prefix text not null,
  status text not null default 'ingested' check (status in ('ingested','failed','skipped')),
  metadata jsonb not null default '{}'::jsonb,
  first_seen_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  ingested_at timestamptz,
  updated_at timestamptz not null default now()
);
create index if not exists ingested_blobs_source_prefix_idx on public.ingested_blobs(source_prefix);
create index if not exists ingested_blobs_status_idx on public.ingested_blobs(status);

create table if not exists public.music_library (
  id uuid primary key default gen_random_uuid(),
  blob_pathname text not null unique,
  title text,
  asset_type text not null default 'music' check (asset_type in ('music','jingle','workout_music','voiceover')),
  status text not null default 'available' check (status in ('available','archived')),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.asset_manifest enable row level security;
alter table public.ingested_blobs enable row level security;
alter table public.music_library enable row level security;

create or replace view public.asset_manifest_pending as
select id, blob_pathname, handle, campaign_type, platform, status, notes, created_at, updated_at
from public.asset_manifest where status = 'pending_review';

revoke all on public.asset_manifest from anon, authenticated;
revoke all on public.ingested_blobs from anon, authenticated;
revoke all on public.music_library from anon, authenticated;
revoke all on public.asset_manifest_pending from anon, authenticated;
