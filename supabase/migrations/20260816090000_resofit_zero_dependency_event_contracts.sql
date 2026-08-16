-- ResoFit Zero-Dependency Revenue Architecture v1.0
-- Canonical event envelope + durable adapter outbox + replaceable adapter registry.
-- Third-party systems consume these contracts; they never become the system of record.

create table if not exists public.resofit_events (
  id uuid primary key default gen_random_uuid(),
  event_name text not null,
  contract_version text not null default '1.0',
  occurred_at timestamptz not null default now(),
  source_system text not null default 'resofit',
  adapter text,
  idempotency_key text,
  correlation_id text,
  session_id text,
  user_id uuid references public.profiles(id) on delete set null,
  anonymous_id text,
  rsid text,
  funnel_origin text,
  utm jsonb not null default '{}'::jsonb,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  constraint resofit_events_idempotency_key_unique unique (idempotency_key)
);

create index if not exists idx_resofit_events_event_name_occurred_at on public.resofit_events(event_name, occurred_at desc);
create index if not exists idx_resofit_events_correlation_id on public.resofit_events(correlation_id);
create index if not exists idx_resofit_events_user_id_occurred_at on public.resofit_events(user_id, occurred_at desc);
create index if not exists idx_resofit_events_rsid on public.resofit_events(rsid);

create table if not exists public.resofit_adapter_deliveries (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.resofit_events(id) on delete cascade,
  adapter text not null,
  status text not null default 'pending' check (status in ('pending','processing','delivered','failed','dead_letter')),
  attempt_count integer not null default 0,
  next_attempt_at timestamptz not null default now(),
  external_event_id text,
  last_error text,
  delivered_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint resofit_adapter_delivery_unique unique (event_id, adapter)
);

create index if not exists idx_resofit_adapter_deliveries_pending on public.resofit_adapter_deliveries(status, next_attempt_at);
create index if not exists idx_resofit_adapter_deliveries_adapter_status on public.resofit_adapter_deliveries(adapter, status);

create table if not exists public.resofit_adapter_registry (
  adapter text primary key,
  category text not null,
  enabled boolean not null default true,
  critical boolean not null default false,
  config jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

insert into public.resofit_adapter_registry (adapter, category, enabled, critical)
values
  ('whatsapp_business_platform','conversation',true,true),
  ('twilio','sms_voice',true,false),
  ('respond_io','inbox',true,false),
  ('make','automation',true,false),
  ('buffer','publishing',true,false),
  ('paystack','payments',true,true),
  ('shopify','commerce_catalog',false,false)
on conflict (adapter) do update set category = excluded.category, critical = excluded.critical, updated_at = now();

alter table public.resofit_events enable row level security;
alter table public.resofit_adapter_deliveries enable row level security;
alter table public.resofit_adapter_registry enable row level security;

comment on table public.resofit_events is 'Canonical ResoFit event envelope. Third-party adapters consume events; they are never the system of record.';
comment on table public.resofit_adapter_deliveries is 'Durable adapter outbox for replaceable external integrations.';
comment on table public.resofit_adapter_registry is 'Registry of replaceable external adapters and whether they are critical.';

create table if not exists public.resofit_event_contracts (
  event_name text not null,
  contract_version text not null,
  description text not null,
  required_fields text[] not null default '{}'::text[],
  payload_schema jsonb not null default '{}'::jsonb,
  critical boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (event_name, contract_version)
);

insert into public.resofit_event_contracts (event_name, contract_version, description, required_fields, critical)
values
  ('lead.created','1.0','A lead has been created or first qualified identity captured.',array['lead_id'],true),
  ('lead.qualified','1.0','A lead has reached a defined qualification tier.',array['lead_id','lead_tier'],true),
  ('assessment.completed','1.0','A ResoFit assessment has been completed.',array['assessment_id','goal'],true),
  ('recommendation.created','1.0','ChatB2K has generated a verified recommendation.',array['recommendation_id','goal'],true),
  ('checkout.started','1.0','A customer has entered the purchase flow.',array['checkout_id'],true),
  ('payment.succeeded','1.0','A verified payment has succeeded.',array['payment_reference','amount','currency'],true),
  ('order.created','1.0','A commerce order has been created.',array['order_id'],true),
  ('fulfillment.completed','1.0','A purchased product or program has been delivered/activated.',array['order_id'],true),
  ('retention.milestone','1.0','A customer reached a defined activation or retention milestone.',array['customer_id','milestone'],false),
  ('content.published','1.0','ResoFit content was published through an external distribution adapter.',array['content_id','channel'],false)
on conflict (event_name, contract_version) do update set description = excluded.description, required_fields = excluded.required_fields, critical = excluded.critical, updated_at = now();

alter table public.resofit_event_contracts enable row level security;
comment on table public.resofit_event_contracts is 'Versioned ResoFit event contracts. Core services emit these contracts; adapters consume them without owning business state.';
