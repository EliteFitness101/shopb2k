-- ResoFit Wellness Geo-Locator v1
-- Canonical location layer. Public reads are intentionally routed through
-- the wellness-locator Edge Function; raw tables remain non-public.

create table if not exists public.resofit_wellness_states (
  id uuid primary key default gen_random_uuid(),
  country_code text not null default 'NG',
  state_code text not null,
  name text not null,
  slug text not null unique,
  status text not null default 'active' check (status in ('active','inactive')),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(country_code, state_code)
);

create table if not exists public.resofit_wellness_cities (
  id uuid primary key default gen_random_uuid(),
  state_id uuid not null references public.resofit_wellness_states(id) on delete cascade,
  name text not null,
  slug text not null,
  latitude double precision,
  longitude double precision,
  status text not null default 'active' check (status in ('active','inactive')),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(state_id, slug)
);

create table if not exists public.resofit_wellness_hubs (
  id uuid primary key default gen_random_uuid(),
  state_id uuid not null references public.resofit_wellness_states(id) on delete restrict,
  city_id uuid not null references public.resofit_wellness_cities(id) on delete restrict,
  hub_code text not null unique,
  name text not null,
  slug text not null unique,
  description text,
  address text,
  latitude double precision not null,
  longitude double precision not null,
  phone text,
  whatsapp text,
  website text,
  verification_status text not null default 'pending' check (verification_status in ('pending','verified','rejected')),
  status text not null default 'draft' check (status in ('draft','active','inactive')),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.resofit_wellness_hub_services (
  id uuid primary key default gen_random_uuid(),
  hub_id uuid not null references public.resofit_wellness_hubs(id) on delete cascade,
  service_entity_id uuid references public.resofit_canonical_entities(id) on delete set null,
  service_name text not null,
  description text,
  price numeric(12,2),
  currency text not null default 'NGN',
  duration_minutes integer,
  booking_method text not null default 'whatsapp' check (booking_method in ('whatsapp','call','internal','external','human_escalation')),
  status text not null default 'active' check (status in ('active','inactive')),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(hub_id, service_name)
);

create table if not exists public.resofit_wellness_hub_hours (
  id uuid primary key default gen_random_uuid(),
  hub_id uuid not null references public.resofit_wellness_hubs(id) on delete cascade,
  day_of_week smallint not null check (day_of_week between 0 and 6),
  opens_at time,
  closes_at time,
  closed boolean not null default false,
  unique(hub_id, day_of_week)
);

create table if not exists public.resofit_wellness_availability (
  id uuid primary key default gen_random_uuid(),
  hub_id uuid not null references public.resofit_wellness_hubs(id) on delete cascade,
  service_id uuid references public.resofit_wellness_hub_services(id) on delete cascade,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  capacity integer not null default 1 check (capacity >= 0),
  booked integer not null default 0 check (booked >= 0),
  status text not null default 'open' check (status in ('open','held','booked','cancelled')),
  created_at timestamptz not null default now(),
  check (ends_at > starts_at),
  check (booked <= capacity)
);

create index if not exists idx_wellness_cities_state on public.resofit_wellness_cities(state_id);
create index if not exists idx_wellness_hubs_city on public.resofit_wellness_hubs(city_id);
create index if not exists idx_wellness_hubs_geo on public.resofit_wellness_hubs(latitude, longitude);
create index if not exists idx_wellness_services_hub on public.resofit_wellness_hub_services(hub_id);
create index if not exists idx_wellness_availability_lookup on public.resofit_wellness_availability(hub_id, service_id, starts_at, status);

alter table public.resofit_wellness_states enable row level security;
alter table public.resofit_wellness_cities enable row level security;
alter table public.resofit_wellness_hubs enable row level security;
alter table public.resofit_wellness_hub_services enable row level security;
alter table public.resofit_wellness_hub_hours enable row level security;
alter table public.resofit_wellness_availability enable row level security;

revoke all on public.resofit_wellness_states from anon, authenticated;
revoke all on public.resofit_wellness_cities from anon, authenticated;
revoke all on public.resofit_wellness_hubs from anon, authenticated;
revoke all on public.resofit_wellness_hub_services from anon, authenticated;
revoke all on public.resofit_wellness_hub_hours from anon, authenticated;
revoke all on public.resofit_wellness_availability from anon, authenticated;
