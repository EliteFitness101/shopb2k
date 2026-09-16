create table if not exists public.youtube_content_metrics (
  id uuid primary key default gen_random_uuid(),
  platform text not null default 'youtube',
  external_video_id text not null,
  content_queue_id uuid references public.content_queue(id) on delete set null,
  publish_log_id uuid references public.content_publish_log(id) on delete set null,
  observed_at timestamptz not null default now(),
  views bigint not null default 0,
  engaged_views bigint not null default 0,
  watch_time_seconds numeric not null default 0,
  average_view_duration_seconds numeric not null default 0,
  retention_percent numeric not null default 0,
  likes bigint not null default 0,
  comments bigint not null default 0,
  shares bigint not null default 0,
  subscribers_gained bigint not null default 0,
  clicks bigint not null default 0,
  assessment_starts bigint not null default 0,
  checkouts bigint not null default 0,
  purchases bigint not null default 0,
  revenue_ngn numeric not null default 0,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  unique(external_video_id, observed_at)
);
create index if not exists youtube_content_metrics_video_idx on public.youtube_content_metrics(external_video_id, observed_at desc);
create index if not exists youtube_content_metrics_queue_idx on public.youtube_content_metrics(content_queue_id, observed_at desc);

create table if not exists public.youtube_content_scores (
  id uuid primary key default gen_random_uuid(),
  external_video_id text not null unique,
  content_queue_id uuid references public.content_queue(id) on delete set null,
  topic text,
  hook text,
  content_variant integer,
  reach_score numeric not null default 0,
  retention_score numeric not null default 0,
  engagement_score numeric not null default 0,
  subscriber_score numeric not null default 0,
  commerce_score numeric not null default 0,
  viral_signal_score numeric not null default 0,
  total_score numeric not null default 0,
  action text not null default 'observe' check (action in ('observe','repackage','remix','expand','retire')),
  rationale jsonb not null default '{}'::jsonb,
  last_metrics_at timestamptz,
  updated_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);
create index if not exists youtube_content_scores_rank_idx on public.youtube_content_scores(total_score desc, updated_at desc);

create table if not exists public.youtube_growth_runs (
  id uuid primary key default gen_random_uuid(),
  run_type text not null,
  status text not null default 'running' check (status in ('running','completed','failed')),
  input_count integer not null default 0,
  scored_count integer not null default 0,
  remix_count integer not null default 0,
  error_count integer not null default 0,
  report jsonb not null default '{}'::jsonb,
  started_at timestamptz not null default now(),
  completed_at timestamptz
);

alter table public.youtube_content_metrics enable row level security;
alter table public.youtube_content_scores enable row level security;
alter table public.youtube_growth_runs enable row level security;
revoke all on public.youtube_content_metrics from anon, authenticated;
revoke all on public.youtube_content_scores from anon, authenticated;
revoke all on public.youtube_growth_runs from anon, authenticated;
