CREATE TABLE IF NOT EXISTS public.payment_webhook_events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  provider TEXT NOT NULL DEFAULT 'paystack',
  event TEXT NOT NULL,
  reference TEXT,
  dedupe_key TEXT NOT NULL,
  signature_status TEXT NOT NULL DEFAULT 'unverified',
  processing_status TEXT NOT NULL DEFAULT 'received',
  duration_ms INTEGER,
  retry_count INTEGER NOT NULL DEFAULT 0,
  failure_reason TEXT,
  payload JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS payment_webhook_events_dedupe_idx
  ON public.payment_webhook_events (provider, dedupe_key);

GRANT SELECT ON public.payment_webhook_events TO authenticated;
GRANT ALL ON public.payment_webhook_events TO service_role;

ALTER TABLE public.payment_webhook_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view payment webhook events"
  ON public.payment_webhook_events FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER trg_payment_webhook_events_updated
  BEFORE UPDATE ON public.payment_webhook_events
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();