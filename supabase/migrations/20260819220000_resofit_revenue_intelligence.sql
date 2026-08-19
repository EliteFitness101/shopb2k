-- ResoFit Revenue Intelligence OS
-- First-party attribution/economics/publication state.
-- Buffer remains distribution-only; ResoFit/Supabase remain authoritative.

create table if not exists public.resofit_content_opportunities (
  id uuid primary key default gen_random_uuid(),
  content_key text not null unique,
  platform text not null check (platform in ('tiktok','youtube','googleBusiness')),
  intent text,
  topic text,
  search_gap text,
  sku text,
  canonical_url text,
  cta text,
  status text not null default 'draft' check (status in ('draft','approved','scheduled','published','paused','rejected')),
  performance_score numeric(12,6),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_resofit_content_opportunities_status_score
  on public.resofit_content_opportunities(status, performance_score desc nulls last);

create table if not exists public.resofit_creative_variants (
  id uuid primary key default gen_random_uuid(),
  content_opportunity_id uuid not null references public.resofit_content_opportunities(id) on delete cascade,
  variant_key text not null unique,
  hook text,
  pov text,
  caption text,
  title text,
  cta text,
  asset_url text,
  platform text not null,
  ai_provider text,
  status text not null default 'draft' check (status in ('draft','approved','rejected','winner','retired')),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.resofit_campaign_attribution (
  id uuid primary key default gen_random_uuid(),
  content_id text,
  campaign_id text,
  platform text,
  ad_id text,
  session_id text,
  anonymous_id text,
  utm_source text,
  utm_campaign text,
  utm_content text,
  recommendation_id text,
  product_id text,
  checkout_id text,
  order_id text,
  revenue numeric(14,2),
  contribution_margin numeric(14,2),
  occurred_at timestamptz not null default now(),
  metadata jsonb not null default '{}'::jsonb
);

create index if not exists idx_resofit_campaign_attribution_content
  on public.resofit_campaign_attribution(content_id, occurred_at desc);
create index if not exists idx_resofit_campaign_attribution_order
  on public.resofit_campaign_attribution(order_id);

create table if not exists public.resofit_product_economics (
  product_id text primary key,
  cost numeric(14,2),
  selling_price numeric(14,2),
  payment_cost numeric(14,2),
  fulfillment_cost numeric(14,2),
  estimated_margin numeric(14,2),
  target_cac numeric(14,2),
  minimum_roas numeric(12,4),
  bundle_candidates jsonb not null default '[]'::jsonb,
  frequently_bought jsonb not null default '[]'::jsonb,
  source_of_truth text not null default 'canonical_product_registry',
  updated_at timestamptz not null default now()
);

create table if not exists public.resofit_buffer_publications (
  id uuid primary key default gen_random_uuid(),
  idempotency_key text not null unique,
  content_id text not null,
  channel text not null check (channel in ('tiktok','youtube','googleBusiness')),
  channel_id text not null,
  organization_id text not null,
  buffer_post_id text,
  status text not null default 'pending' check (status in ('pending','queued','sent','failed','skipped')),
  scheduled_at timestamptz,
  published_at timestamptz,
  error_message text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_resofit_buffer_publications_channel_status
  on public.resofit_buffer_publications(channel, status, scheduled_at);

-- No browser/public access is granted by this migration. Server-side service-role
-- or tightly scoped backend policies are required for writes/reads.
alter table public.resofit_content_opportunities enable row level security;
alter table public.resofit_creative_variants enable row level security;
alter table public.resofit_campaign_attribution enable row level security;
alter table public.resofit_product_economics enable row level security;
alter table public.resofit_buffer_publications enable row level security;

comment on table public.resofit_content_opportunities is 'Canonical first-party content opportunity queue; external publishers are execution surfaces.';
comment on table public.resofit_creative_variants is 'AI/human creative variants governed by ResoFit approval state.';
comment on table public.resofit_campaign_attribution is 'First-party content-to-revenue attribution ledger.';
comment on table public.resofit_product_economics is 'Commercial economics used for profitable acquisition decisions; values must come from authoritative product/finance data.';
comment on table public.resofit_buffer_publications is 'Idempotent Buffer publication ledger; Buffer never owns ResoFit content truth.';
