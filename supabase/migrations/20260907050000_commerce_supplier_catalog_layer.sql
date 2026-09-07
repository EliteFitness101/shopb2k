create table if not exists public.suppliers (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  code text not null unique,
  integration_type text not null check (integration_type in ('api','feed','manual','partner')),
  status text not null default 'pending' check (status in ('pending','active','paused','disabled')),
  base_url text,
  terms_url text,
  resale_authorized boolean not null default false,
  media_authorized boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.supplier_products (
  id uuid primary key default gen_random_uuid(),
  supplier_id uuid not null references public.suppliers(id) on delete cascade,
  external_product_id text not null,
  sku text,
  title text not null,
  description text,
  product_url text,
  currency text not null default 'NGN',
  supplier_price integer not null check (supplier_price >= 0),
  stock_qty integer not null default 0 check (stock_qty >= 0),
  image_url text,
  image_rights_status text not null default 'unknown' check (image_rights_status in ('unknown','authorized','licensed','owned','rejected')),
  resale_status text not null default 'pending' check (resale_status in ('pending','authorized','rejected')),
  last_source_update timestamptz,
  last_verified_at timestamptz,
  raw_payload jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (supplier_id, external_product_id)
);

create table if not exists public.supplier_price_snapshots (
  id uuid primary key default gen_random_uuid(),
  supplier_product_id uuid not null references public.supplier_products(id) on delete cascade,
  supplier_price integer not null check (supplier_price >= 0),
  stock_qty integer not null default 0 check (stock_qty >= 0),
  captured_at timestamptz not null default now()
);

create table if not exists public.product_sources (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  supplier_product_id uuid references public.supplier_products(id) on delete set null,
  source_type text not null check (source_type in ('owned','supplier','partner','affiliate','licensed')),
  source_url text,
  source_product_id text,
  resale_authorized boolean not null default false,
  media_authorized boolean not null default false,
  status text not null default 'pending' check (status in ('pending','verified','rejected','expired')),
  verified_at timestamptz,
  created_at timestamptz not null default now(),
  unique (product_id, source_type)
);

create table if not exists public.sync_runs (
  id uuid primary key default gen_random_uuid(),
  supplier_id uuid references public.suppliers(id) on delete set null,
  status text not null default 'running' check (status in ('running','succeeded','failed')),
  discovered_count integer not null default 0,
  accepted_count integer not null default 0,
  rejected_count integer not null default 0,
  error_count integer not null default 0,
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  error_message text
);

create index if not exists supplier_products_supplier_idx on public.supplier_products(supplier_id);
create index if not exists supplier_products_status_idx on public.supplier_products(resale_status, image_rights_status, stock_qty);
create index if not exists supplier_price_snapshots_product_idx on public.supplier_price_snapshots(supplier_product_id, captured_at desc);
create index if not exists product_sources_product_idx on public.product_sources(product_id);
create index if not exists sync_runs_supplier_idx on public.sync_runs(supplier_id, started_at desc);

alter table public.suppliers enable row level security;
alter table public.supplier_products enable row level security;
alter table public.supplier_price_snapshots enable row level security;
alter table public.product_sources enable row level security;
alter table public.sync_runs enable row level security;

revoke all on public.suppliers from anon, authenticated;
revoke all on public.supplier_products from anon, authenticated;
revoke all on public.supplier_price_snapshots from anon, authenticated;
revoke all on public.product_sources from anon, authenticated;
revoke all on public.sync_runs from anon, authenticated;
