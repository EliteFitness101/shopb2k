-- Classify checkout abandonment and unresolved provider responses separately from confirmed payment failures.
WITH updated AS (
  UPDATE public.payments
  SET status = 'cancelled',
      reconciled = true,
      reconciled_at = now()
  WHERE status = 'failed'
    AND gateway_response = 'Page closed without payment'
  RETURNING paystack_ref
)
UPDATE public.resoflex_subscribers s
SET payment_status = 'cancelled',
    updated_at = now()
WHERE s.reference IN (SELECT paystack_ref FROM updated)
  AND s.payment_status = 'failed';

WITH updated AS (
  UPDATE public.payments
  SET status = 'expired',
      reconciled = true,
      reconciled_at = now()
  WHERE status = 'failed'
    AND gateway_response = 'The order was closed due to timeout'
  RETURNING paystack_ref
)
UPDATE public.resoflex_subscribers s
SET payment_status = 'expired',
    updated_at = now()
WHERE s.reference IN (SELECT paystack_ref FROM updated)
  AND s.payment_status = 'failed';

-- No provider response is not evidence of a declined payment. Keep it pending for reconciliation.
WITH updated AS (
  UPDATE public.payments
  SET status = 'pending',
      gateway_response = 'verification_required: prior gateway response did not confirm final outcome',
      reconciled = false,
      reconciled_at = NULL
  WHERE status = 'failed'
    AND gateway_response = 'Didn''t get a response'
  RETURNING paystack_ref
)
UPDATE public.resoflex_subscribers s
SET payment_status = 'pending',
    updated_at = now()
WHERE s.reference IN (SELECT paystack_ref FROM updated)
  AND s.payment_status = 'failed';
