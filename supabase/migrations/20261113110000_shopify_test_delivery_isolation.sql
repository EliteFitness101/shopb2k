-- Isolated Shopify QA delivery: test_success payments can only be claimed
-- when both the payment and delivery job explicitly target test@resofit.fit.
-- Production success payments retain the existing delivery behavior.
create or replace function public.claim_resofit_digital_delivery_job(p_email_configured boolean default false)
returns setof public.digital_product_delivery_jobs
language plpgsql
security definer
set search_path to 'public', 'pg_temp'
as $function$
begin
  return query
  with candidate as (
    select j.id
    from public.digital_product_delivery_jobs j
    join public.payments p on p.id = j.payment_id
    join public.products pr on pr.id = j.product_id
    where j.product_sku not like 'MX-%'
      and j.attempts < 4
      and (
        (
          p.status = 'success'
          and p.product_sku = j.product_sku
        )
        or (
          p.status = 'test_success'
          and p.metadata->>'test_mode' = 'true'
          and lower(coalesce(p.customer_email, '')) = 'test@resofit.fit'
          and j.provenance->>'test_mode' = 'true'
          and j.provenance->>'test_recipient' = 'test@resofit.fit'
          and lower(coalesce(j.buyer_email, '')) = 'test@resofit.fit'
          and p.product_sku = j.product_sku
        )
      )
      and pr.sku = j.product_sku
      and pr.published = true
      and lower(coalesce(pr.fulfillment_mode, '')) = 'digital'
      and (
        j.status = 'queued'
        or (
          p_email_configured
          and j.status = 'ready'
          and coalesce(nullif(j.buyer_email, ''), nullif(p.customer_email, '')) is not null
        )
        or (j.status = 'failed' and j.updated_at < now() - interval '2 minutes')
        or (j.status = 'processing' and j.updated_at < now() - interval '15 minutes')
      )
    order by j.created_at asc
    for update of j skip locked
    limit 1
  )
  update public.digital_product_delivery_jobs j
  set status = 'processing',
      attempts = j.attempts + 1,
      last_error = null,
      updated_at = now()
  from candidate c
  where j.id = c.id
  returning j.*;
end;
$function$;

-- Test records must not attach to a real auth user or synchronize identity state.
create or replace function public.attach_verified_auth_user_to_payment()
returns trigger
language plpgsql
security definer
set search_path to 'public', 'auth', 'pg_temp'
as $function$
declare
  v_user_id uuid;
begin
  if coalesce(new.metadata->>'test_mode', 'false') = 'true' then
    return new;
  end if;
  if new.user_id is not null or coalesce(new.customer_email, '') = '' then
    return new;
  end if;
  select u.id into v_user_id
  from auth.users u
  join public.profiles p on p.id = u.id
  where lower(u.email) = lower(new.customer_email)
    and u.email_confirmed_at is not null
  order by u.created_at
  limit 1;
  if v_user_id is not null then
    new.user_id := v_user_id;
  end if;
  return new;
end;
$function$;

create or replace function public.resofit_identity_payment_sync()
returns trigger
language plpgsql
security definer
set search_path to ''
as $function$
begin
  if coalesce(new.metadata->>'test_mode', 'false') = 'true' then
    return new;
  end if;
  if new.user_id is not null then
    begin
      perform private.sync_resofit_ecosystem_identity(
        new.user_id,
        new.rsid,
        null,
        null,
        new.funnel_origin,
        coalesce(new.metadata, '{}'::jsonb),
        null
      );
    exception when others then
      null;
    end;
  end if;
  return new;
end;
$function$;
