create table if not exists public.flow_generation_gate (
  gate_key text primary key,
  enabled boolean not null default true,
  min_daily_clips integer not null default 1 check (min_daily_clips between 1 and 4),
  max_daily_clips integer not null default 4 check (max_daily_clips between 1 and 4),
  min_duration_seconds numeric not null default 8 check (min_duration_seconds >= 8),
  max_duration_seconds numeric not null default 10 check (max_duration_seconds <= 10),
  destination_platform text not null default 'tiktok',
  destination_selector text not null default 'resonancefitness',
  generation_provider text not null default 'google_flow_veo',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

insert into public.flow_generation_gate(gate_key) values ('default')
on conflict (gate_key) do nothing;

create table if not exists public.flow_generation_events (
  id uuid primary key default gen_random_uuid(),
  gate_key text not null default 'default',
  request_id text not null unique,
  status text not null default 'reserved',
  content_pillar text,
  prompt_hash text,
  provider text not null default 'google_flow_veo',
  model text,
  duration_seconds numeric,
  asset_id uuid,
  canonical_url text,
  metadata jsonb not null default '{}'::jsonb,
  reserved_at timestamptz not null default now(),
  completed_at timestamptz,
  failed_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists flow_generation_events_reserved_at_idx
on public.flow_generation_events(gate_key,reserved_at);

create index if not exists flow_generation_events_status_idx
on public.flow_generation_events(status);

create unique index if not exists content_asset_registry_google_flow_fingerprint_uidx
on public.content_asset_registry(fingerprint)
where source_provider='google_flow' and fingerprint is not null;

create unique index if not exists flow_generation_events_asset_uidx
on public.flow_generation_events(asset_id)
where asset_id is not null;

create or replace function public.reserve_flow_generation(
  p_request_id text,
  p_content_pillar text,
  p_prompt_hash text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  g public.flow_generation_gate%rowtype;
  n integer;
  ev public.flow_generation_events%rowtype;
begin
  select * into g from public.flow_generation_gate where gate_key='default' for update;
  if not found or not g.enabled then
    return jsonb_build_object('ok',false,'reason','flow_generation_disabled');
  end if;
  if exists(select 1 from public.flow_generation_events where request_id=p_request_id) then
    select * into ev from public.flow_generation_events where request_id=p_request_id;
    return jsonb_build_object('ok',true,'duplicate',true,'request_id',ev.request_id,'status',ev.status,'event_id',ev.id);
  end if;
  select count(*) into n
  from public.flow_generation_events
  where gate_key=g.gate_key
    and reserved_at >= date_trunc('day', now() at time zone 'Africa/Lagos')
    and reserved_at < date_trunc('day', now() at time zone 'Africa/Lagos') + interval '1 day'
    and status in ('reserved','generating','completed','published');
  if n >= g.max_daily_clips then
    return jsonb_build_object('ok',false,'reason','daily_flow_limit_reached','daily_count',n,'max_daily_clips',g.max_daily_clips);
  end if;
  insert into public.flow_generation_events(request_id,content_pillar,prompt_hash,status)
  values(p_request_id,p_content_pillar,p_prompt_hash,'reserved')
  returning * into ev;
  return jsonb_build_object('ok',true,'duplicate',false,'event_id',ev.id,'daily_count',n+1,'max_daily_clips',g.max_daily_clips,'min_daily_clips',g.min_daily_clips,'min_duration_seconds',g.min_duration_seconds,'max_duration_seconds',g.max_duration_seconds,'destination_platform',g.destination_platform,'destination_selector',g.destination_selector);
end;
$$;

create or replace function public.complete_flow_generation(
  p_request_id text,
  p_status text,
  p_asset_id uuid default null,
  p_canonical_url text default null,
  p_duration_seconds numeric default null,
  p_metadata jsonb default '{}'::jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  g public.flow_generation_gate%rowtype;
  ev public.flow_generation_events%rowtype;
begin
  select * into g from public.flow_generation_gate where gate_key='default';
  select * into ev from public.flow_generation_events where request_id=p_request_id for update;
  if not found then return jsonb_build_object('ok',false,'reason','request_not_found'); end if;
  if p_duration_seconds is not null and (p_duration_seconds < g.min_duration_seconds or p_duration_seconds > g.max_duration_seconds) then
    update public.flow_generation_events
    set status='failed',failed_at=now(),metadata=coalesce(p_metadata,'{}')||jsonb_build_object('reason','duration_out_of_range','min',g.min_duration_seconds,'max',g.max_duration_seconds)
    where request_id=p_request_id;
    return jsonb_build_object('ok',false,'reason','duration_out_of_range','min',g.min_duration_seconds,'max',g.max_duration_seconds,'duration_seconds',p_duration_seconds);
  end if;
  update public.flow_generation_events
  set status=p_status,asset_id=p_asset_id,canonical_url=p_canonical_url,duration_seconds=p_duration_seconds,metadata=coalesce(p_metadata,'{}'::jsonb),
      completed_at=case when p_status in ('completed','published') then now() else completed_at end,
      failed_at=case when p_status='failed' then now() else failed_at end
  where request_id=p_request_id;
  return jsonb_build_object('ok',true,'request_id',p_request_id,'status',p_status);
end;
$$;

alter table public.flow_generation_gate enable row level security;
alter table public.flow_generation_events enable row level security;

revoke all on function public.reserve_flow_generation(text,text,text) from public,anon,authenticated;
revoke all on function public.complete_flow_generation(text,text,uuid,text,numeric,jsonb) from public,anon,authenticated;
