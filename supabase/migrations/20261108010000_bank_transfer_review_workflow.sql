alter table public.custom_payment_requests
  add column if not exists product_sku text,
  add column if not exists review_note text;

update public.custom_payment_requests
set product_sku = nullif(btrim((regexp_match(customer_note, 'SKU:[[:space:]]*([^|]+)'))[1]), '')
where product_sku is null
  and customer_note is not null;

create index if not exists idx_custom_payment_requests_review_queue
  on public.custom_payment_requests (status, created_at desc);

create table if not exists public.custom_payment_request_review_events (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null references public.custom_payment_requests(id),
  action text not null check (action in ('approved', 'rejected')),
  reviewer_id uuid not null,
  review_note text not null,
  payment_id uuid references public.payments(id),
  payment_reference text,
  created_at timestamptz not null default now()
);

alter table public.custom_payment_request_review_events enable row level security;

do $policy$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'custom_payment_request_review_events'
      and policyname = 'service_role_internal_access'
  ) then
    create policy service_role_internal_access
      on public.custom_payment_request_review_events
      for all to service_role
      using (true)
      with check (true);
  end if;
end
$policy$;

create or replace function public.review_custom_payment_request(
  p_request_id uuid,
  p_decision text,
  p_reviewer_id uuid,
  p_review_note text
)
returns jsonb
language plpgsql
security definer
set search_path to 'public', 'auth', 'pg_temp'
as $function$
declare
  v_request public.custom_payment_requests%rowtype;
  v_product public.products%rowtype;
  v_payment public.payments%rowtype;
  v_identity_user_id uuid;
  v_user_id uuid;
  v_rsid text;
  v_review_note text;
begin
  if p_reviewer_id is null
     or not public.has_role(p_reviewer_id, 'admin'::public.app_role) then
    raise exception using errcode = '42501', message = 'admin_role_required';
  end if;

  if p_decision not in ('approve', 'reject') then
    raise exception using errcode = '22023', message = 'invalid_review_decision';
  end if;

  v_review_note := left(btrim(coalesce(p_review_note, '')), 1000);
  if length(v_review_note) < 8 then
    raise exception using errcode = '22023', message = 'review_note_required';
  end if;

  select *
    into v_request
    from public.custom_payment_requests
   where id = p_request_id
   for update;

  if not found then
    raise exception using errcode = 'P0002', message = 'payment_request_not_found';
  end if;

  if v_request.status = 'approved' and p_decision = 'approve' then
    select * into v_payment
      from public.payments
     where paystack_ref = v_request.order_reference;
    if found and v_payment.status = 'success'
       and v_payment.product_sku = v_request.product_sku
       and v_payment.amount = v_request.amount_ngn then
      return jsonb_build_object(
        'ok', true,
        'duplicate', true,
        'status', 'approved',
        'request_id', v_request.id,
        'payment_id', v_payment.id,
        'payment_reference', v_payment.paystack_ref
      );
    end if;
    raise exception using errcode = '23505', message = 'approved_request_payment_reconciliation_mismatch';
  end if;

  if v_request.status = 'rejected' and p_decision = 'reject' then
    return jsonb_build_object(
      'ok', true,
      'duplicate', true,
      'status', 'rejected',
      'request_id', v_request.id
    );
  end if;

  if v_request.status <> 'pending_review' then
    raise exception using errcode = '55000', message = 'payment_request_not_pending_review';
  end if;

  if p_decision = 'reject' then
    update public.custom_payment_requests
       set status = 'rejected',
           verified_by = p_reviewer_id,
           verified_at = now(),
           review_note = v_review_note,
           updated_at = now()
     where id = v_request.id;

    insert into public.custom_payment_request_review_events
      (request_id, action, reviewer_id, review_note, payment_reference)
    values
      (v_request.id, 'rejected', p_reviewer_id, v_review_note, v_request.order_reference);

    return jsonb_build_object(
      'ok', true,
      'status', 'rejected',
      'request_id', v_request.id,
      'payment_reference', v_request.order_reference
    );
  end if;

  if v_request.method <> 'bank_transfer' then
    raise exception using errcode = '22023', message = 'unsupported_payment_method';
  end if;

  if v_request.product_sku is null then
    raise exception using errcode = '22023', message = 'payment_request_missing_product_sku';
  end if;

  select *
    into v_product
    from public.products
   where sku = v_request.product_sku
     and published = true
     and lower(coalesce(fulfillment_mode, 'unknown')) = 'service'
   for share;

  if not found then
    raise exception using errcode = '22023', message = 'published_service_product_not_found';
  end if;

  if round(v_request.amount_ngn, 2) <> round(v_product.variant_price, 2) then
    raise exception using errcode = '22023', message = 'payment_amount_no_longer_matches_catalogue';
  end if;

  select auth_user_id, rsid
    into v_identity_user_id, v_rsid
    from public.resofit_ecosystem_identity
   where (v_request.user_id is not null and auth_user_id = v_request.user_id)
      or lower(email) = lower(v_request.customer_email)
   order by case when auth_user_id = v_request.user_id then 0 else 1 end,
            last_seen_at desc nulls last
   limit 1;

  v_user_id := coalesce(v_request.user_id, v_identity_user_id);

  if v_request.product_sku like 'RF-COACH-NUTRI-%' and v_user_id is null then
    raise exception using errcode = '23514', message = 'coaching_purchase_requires_verified_customer_account';
  end if;

  insert into public.payments (
    user_id,
    amount,
    currency,
    status,
    plan_type,
    paystack_ref,
    rsid,
    customer_email,
    gateway_response,
    paid_at,
    product_sku,
    funnel_origin,
    gross_amount,
    settlement_status,
    reconciled,
    reconciled_at,
    metadata
  ) values (
    v_user_id,
    v_request.amount_ngn,
    'NGN',
    'success',
    v_product.title,
    v_request.order_reference,
    v_rsid,
    lower(v_request.customer_email),
    'bank_transfer_verified',
    now(),
    v_request.product_sku,
    'bank_transfer_manual_review',
    round(v_request.amount_ngn)::integer,
    'settled',
    true,
    now(),
    jsonb_build_object(
      'payment_method', 'bank_transfer',
      'custom_payment_request_id', v_request.id,
      'verified_by', p_reviewer_id,
      'verified_at', now(),
      'evidence_url', v_request.evidence_url,
      'customer_note', v_request.customer_note,
      'review_note', v_review_note
    )
  )
  on conflict (paystack_ref) do nothing
  returning * into v_payment;

  if v_payment.id is null then
    select * into v_payment
      from public.payments
     where paystack_ref = v_request.order_reference;

    if not found
       or v_payment.status <> 'success'
       or v_payment.product_sku <> v_request.product_sku
       or v_payment.amount <> v_request.amount_ngn then
      raise exception using errcode = '23505', message = 'payment_reference_already_used';
    end if;
  end if;

  update public.custom_payment_requests
     set status = 'approved',
         verified_by = p_reviewer_id,
         verified_at = now(),
         review_note = v_review_note,
         updated_at = now()
   where id = v_request.id;

  insert into public.custom_payment_request_review_events
    (request_id, action, reviewer_id, review_note, payment_id, payment_reference)
  values
    (v_request.id, 'approved', p_reviewer_id, v_review_note, v_payment.id, v_payment.paystack_ref);

  return jsonb_build_object(
    'ok', true,
    'status', 'approved',
    'request_id', v_request.id,
    'payment_id', v_payment.id,
    'payment_reference', v_payment.paystack_ref,
    'user_id', v_payment.user_id,
    'product_sku', v_payment.product_sku
  );
end;
$function$;

revoke all on function public.review_custom_payment_request(uuid, text, uuid, text) from public, anon, authenticated;
grant execute on function public.review_custom_payment_request(uuid, text, uuid, text) to service_role;
