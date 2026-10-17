-- Secure, buyer-renewable access for paid ResoFit digital deliverables.
-- Service-role Edge Functions are the only intended writers/readers; no client RLS policies are created.
create table if not exists public.resofit_digital_access_sessions (
  id uuid primary key default gen_random_uuid(),
  delivery_job_id uuid not null references public.digital_product_delivery_jobs(id) on delete cascade,
  token_hash text not null unique,
  expires_at timestamptz not null,
  revoked_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists resofit_digital_access_sessions_job_idx
  on public.resofit_digital_access_sessions(delivery_job_id, created_at desc);

create table if not exists public.resofit_digital_access_challenges (
  id uuid primary key default gen_random_uuid(),
  delivery_job_id uuid not null references public.digital_product_delivery_jobs(id) on delete cascade,
  buyer_email text not null,
  code_hash text not null,
  expires_at timestamptz not null,
  attempts integer not null default 0 check (attempts between 0 and 5),
  consumed_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists resofit_digital_access_challenges_job_idx
  on public.resofit_digital_access_challenges(delivery_job_id, created_at desc);

alter table public.resofit_digital_access_sessions enable row level security;
alter table public.resofit_digital_access_challenges enable row level security;
