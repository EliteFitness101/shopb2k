-- Supplier fulfilment is only for physical or hybrid products.
-- Digital and service purchases are fulfilled by the canonical ResoFit fulfilment pipeline.
CREATE OR REPLACE FUNCTION public.enqueue_supplier_fulfillment_from_payment()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'pg_catalog', 'public', 'pg_temp'
AS $function$
DECLARE
  meta jsonb := coalesce(new.metadata, '{}'::jsonb);
  assigned_supplier uuid;
  assigned_product uuid;
  v_fulfillment_mode text;
BEGIN
  IF lower(coalesce(new.status, '')) NOT IN ('paid', 'success', 'successful', 'completed') THEN
    RETURN new;
  END IF;

  IF coalesce(new.product_sku, '') = '' THEN
    RETURN new;
  END IF;

  SELECT lower(coalesce(p.fulfillment_mode, ''))
    INTO v_fulfillment_mode
  FROM public.products AS p
  WHERE p.sku = new.product_sku
  LIMIT 1;

  -- Fail closed: do not create supplier tasks for unknown, digital, or service SKUs.
  IF NOT FOUND OR v_fulfillment_mode NOT IN ('physical', 'hybrid') THEN
    RETURN new;
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.resofit_supplier_fulfillment_orders
    WHERE payment_id = new.id
  ) THEN
    RETURN new;
  END IF;

  SELECT sp.supplier_id, sp.id
    INTO assigned_supplier, assigned_product
  FROM public.supplier_products AS sp
  JOIN public.suppliers AS s ON s.id = sp.supplier_id
  JOIN public.resofit_supplier_partner_profiles AS rp ON rp.supplier_id = s.id
  WHERE sp.sku = new.product_sku
    AND s.status = 'active'
    AND s.resale_authorized = true
    AND rp.verification_status = 'verified'
  ORDER BY sp.last_verified_at DESC NULLS LAST
  LIMIT 1;

  INSERT INTO public.resofit_supplier_fulfillment_orders (
    payment_id, order_id, product_sku, supplier_id, supplier_product_id,
    supplier_assignment_status, buyer_email, destination_state, destination_city,
    destination_lga, delivery_mode, metadata
  ) VALUES (
    new.id, new.order_id, new.product_sku, assigned_supplier, assigned_product,
    CASE WHEN assigned_supplier IS NULL THEN 'needs_assignment' ELSE 'assigned' END,
    new.customer_email,
    nullif(meta->>'destination_state', ''),
    nullif(meta->>'destination_city', ''),
    nullif(meta->>'destination_lga', ''),
    CASE
      WHEN lower(coalesce(meta->>'delivery_mode', 'pickup_center')) IN ('park', 'door_delivery')
        THEN lower(meta->>'delivery_mode')
      ELSE 'pickup_center'
    END,
    jsonb_build_object(
      'payment_status', new.status,
      'paystack_ref', new.paystack_ref,
      'created_from', 'payment_trigger'
    )
  );

  IF assigned_supplier IS NOT NULL THEN
    INSERT INTO public.resofit_supplier_notifications (
      fulfillment_order_id, supplier_id, notification_type, recipient_ref, payload
    )
    SELECT
      fo.id,
      assigned_supplier,
      'order_paid',
      sp.whatsapp_business_phone,
      jsonb_build_object(
        'order_id', new.order_id,
        'product_sku', new.product_sku,
        'amount_ngn', coalesce(new.final_selling_price_ngn, new.gross_amount)
      )
    FROM public.resofit_supplier_fulfillment_orders AS fo
    JOIN public.resofit_supplier_partner_profiles AS sp
      ON sp.supplier_id = assigned_supplier
     AND sp.verification_status = 'verified'
    WHERE fo.payment_id = new.id
    LIMIT 1;
  END IF;

  RETURN new;
END;
$function$;
