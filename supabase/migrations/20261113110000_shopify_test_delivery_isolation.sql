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
