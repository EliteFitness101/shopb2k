-- Shopify test checkout isolation + full Digital Product Media Factory dispatch.
-- Test orders never enter public.payments and never grant production entitlements.

create table if not exists public.shopify_test_order_events (
  id uuid primary key default gen_random_uuid(),
  shopify_order_id text not null unique,
  shopify_webhook_id text,
  shop_domain text not null,
  customer_email text not null,
  financial_status text not null,
  currency text not null,
  line_items jsonb not null default '[]'::jsonb,
  media_factory_entitled boolean not null default true,
  factory_job_ids uuid[] not null default '{}'::uuid[],
  status text not null default 'received',
  last_error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists shopify_test_order_events_webhook_id_uidx
  on public.shopify_test_order_events(shopify_webhook_id)
  where shopify_webhook_id is not null;

create table if not exists public.shopify_test_order_items (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.shopify_test_order_events(id) on delete cascade,
  product_sku text not null,
  product_id uuid not null references public.products(id),
  product_title text not null,
  quantity integer not null check (quantity > 0),
  line_total numeric not null default 0,
  factory_job_id uuid references public.digital_product_factory_jobs(id) on delete set null,
  status text not null default 'queued',
  last_error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(event_id, product_sku)
);

create index if not exists shopify_test_order_items_factory_job_idx
  on public.shopify_test_order_items(factory_job_id);

alter table public.shopify_test_order_events enable row level security;
alter table public.shopify_test_order_items enable row level security;
revoke all on public.shopify_test_order_events from anon, authenticated;
revoke all on public.shopify_test_order_items from anon, authenticated;
grant all on public.shopify_test_order_events to service_role;
grant all on public.shopify_test_order_items to service_role;

create or replace function public.start_shopify_test_media_job(_job_id uuid)
returns bigint
language plpgsql
security definer
set search_path to 'public', 'extensions', 'net', 'pg_temp'
as $function$
declare
  v_spec jsonb;
  v_token text;
  v_request_id bigint;
begin
  select generation_spec into v_spec
  from public.digital_product_factory_jobs
  where id = _job_id
  for update;

  if not found then raise exception 'shopify_test_media_job_not_found'; end if;
  if coalesce(v_spec->>'shopify_test_mode','false') <> 'true'
     or coalesce(v_spec->>'media_factory_entitled','false') <> 'true' then
    raise exception 'shopify_test_media_entitlement_required';
  end if;

  v_token := encode(gen_random_bytes(32), 'hex');
  update public.digital_product_factory_jobs
  set generation_spec = coalesce(generation_spec,'{}'::jsonb) ||
        jsonb_build_object('dispatch_token',v_token,
          'dispatch_token_expires_at',(extract(epoch from now() + interval '5 minutes') * 1000)::bigint),
      status = 'generating',
      updated_at = now()
  where id = _job_id;

  select net.http_post(
    url := 'https://vbqjvmnhdtdhmeeudqnn.supabase.co/functions/v1/digital-product-media-generator',
    headers := jsonb_build_object(
      'Content-Type','application/json',
      'x-resofit-factory-action','start',
      'x-resofit-factory-job',_job_id::text,
      'x-resofit-factory-dispatch-token',v_token
    ),
    body := jsonb_build_object('action','start','job_id',_job_id),
    timeout_milliseconds := 120000
  ) into v_request_id;

  return v_request_id;
end;
$function$;

create or replace function public.poll_shopify_test_media_jobs()
returns integer
language plpgsql
security definer
set search_path to 'public', 'extensions', 'net', 'pg_temp'
as $function$
declare
  v_job record;
  v_spec jsonb;
  v_token text;
  v_count integer := 0;
begin
  for v_job in
    select id, generation_spec
    from public.digital_product_factory_jobs
    where status = 'generating'
      and generation_spec->>'shopify_test_mode' = 'true'
      and generation_spec->>'media_factory_entitled' = 'true'
  loop
    v_token := encode(gen_random_bytes(32), 'hex');
    update public.digital_product_factory_jobs
    set generation_spec = coalesce(generation_spec,'{}'::jsonb) ||
          jsonb_build_object('dispatch_token',v_token,
            'dispatch_token_expires_at',(extract(epoch from now() + interval '5 minutes') * 1000)::bigint),
        updated_at = now()
    where id = v_job.id;

    perform net.http_post(
      url := 'https://vbqjvmnhdtdhmeeudqnn.supabase.co/functions/v1/digital-product-media-generator',
      headers := jsonb_build_object(
        'Content-Type','application/json',
        'x-resofit-factory-action','poll',
        'x-resofit-factory-job',v_job.id::text,
        'x-resofit-factory-dispatch-token',v_token
      ),
      body := jsonb_build_object('action','poll','job_id',v_job.id),
      timeout_milliseconds := 120000
    );
    v_count := v_count + 1;
  end loop;

  update public.shopify_test_order_items i
  set status = j.status,
      updated_at = now()
  from public.digital_product_factory_jobs j
  where i.factory_job_id = j.id
    and j.generation_spec->>'shopify_test_mode' = 'true'
    and i.status <> j.status;

  update public.shopify_test_order_events e
  set status = 'media_generated_pending_qa',
      updated_at = now()
  where e.status = 'media_generation_queued'
    and exists (
      select 1 from public.shopify_test_order_items i
      where i.event_id = e.id
    )
    and not exists (
      select 1 from public.shopify_test_order_items i
      join public.digital_product_factory_jobs j on j.id = i.factory_job_id
      where i.event_id = e.id and j.status not in ('qa','approved')
    );

  return v_count;
end;
$function$;

revoke all on function public.start_shopify_test_media_job(uuid) from public, anon, authenticated;
revoke all on function public.poll_shopify_test_media_jobs() from public, anon, authenticated;
grant execute on function public.start_shopify_test_media_job(uuid) to service_role;

do $schedule$
begin
  if exists (select 1 from cron.job where jobname = 'shopify-test-media-poll') then
    perform cron.unschedule(jobid) from cron.job where jobname = 'shopify-test-media-poll';
  end if;
  perform cron.schedule(
    'shopify-test-media-poll',
    '*/2 * * * *',
    'select public.poll_shopify_test_media_jobs();'
  );
end
$schedule$;
