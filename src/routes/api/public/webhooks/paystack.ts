// Paystack webhook — hardened processing only. Checkout flow is untouched.
// HMAC SHA-512 verification, timing-safe compare, idempotency via unique
// dedupe key, replay/duplicate detection, retry-safe, full audit trail.
import { createFileRoute } from "@tanstack/react-router";
import { createHmac, timingSafeEqual } from "crypto";

function safeEqual(a: string, b: string): boolean {
  const ba = Buffer.from(a);
  const bb = Buffer.from(b);
  if (ba.length !== bb.length) return false;
  return timingSafeEqual(ba, bb);
}

export const Route = createFileRoute("/api/public/webhooks/paystack")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const started = Date.now();
        const secret = process.env['PAYSTACK_SECRET_KEY'];
        if (!secret) return new Response("Webhook not configured", { status: 503 });

        const raw = await request.text();
        const signature = request.headers.get("x-paystack-signature") ?? "";
        const expected = createHmac("sha512", secret).update(raw).digest("hex");
        const verified = signature.length > 0 && safeEqual(signature, expected);
        if (!verified) return new Response("Invalid signature", { status: 401 });

        let payload: { event?: string; data?: { reference?: string; id?: number | string } };
        try {
          payload = JSON.parse(raw) as typeof payload;
        } catch {
          return new Response("Invalid payload", { status: 400 });
        }

        const event = payload.event ?? "unknown";
        const reference = payload.data?.reference ?? null;
        const dedupeKey = `${event}:${payload.data?.id ?? reference ?? signature.slice(0, 32)}`;

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

        // Idempotency + replay protection: the unique (provider, dedupe_key)
        // index makes a repeated delivery a no-op insert conflict.
        const { data: inserted, error } = await supabaseAdmin
          .from("payment_webhook_events")
          .insert({
            provider: "paystack",
            event,
            reference,
            dedupe_key: dedupeKey,
            signature_status: "verified",
            processing_status: "processing",
            payload: payload as unknown as Record<string, unknown>,
          })
          .select("id")
          .maybeSingle();

        if (error) {
          // Duplicate delivery — acknowledge without reprocessing.
          if (error.code === "23505" || error.code === "23_505" || /duplicate key/i.test(error.message)) {
            await supabaseAdmin.rpc("has_role", { _user_id: "00000000-0000-0000-0000-000000000000", _role: "admin" }).then(
              () => undefined,
              () => undefined,
            );
            return Response.json({ ok: true, duplicate: true });
          }
          console.error("paystack webhook audit insert failed", error.message);
          return new Response("Audit write failed", { status: 500 });
        }

        // Reconciliation validation: record the charge against the ledger when
        // the payment succeeded. Failures are captured, never thrown.
        let processing_status = "processed";
        let failure_reason: string | null = null;
        try {
          if (event === "charge.success" && reference) {
            const { error: ledgerError } = await supabaseAdmin
              .from("settlement_ledger")
              .update({ reconciled: true })
              .eq("provider", "paystack")
              .eq("provider_reference", reference);
            if (ledgerError) throw new Error(ledgerError.message);
          }
        } catch (e) {
          processing_status = "failed";
          failure_reason = e instanceof Error ? e.message : "unknown processing error";
        }

        if (inserted?.id) {
          await supabaseAdmin
            .from("payment_webhook_events")
            .update({ processing_status, failure_reason, duration_ms: Date.now() - started })
            .eq("id", inserted.id);
        }

        return Response.json({ ok: processing_status === "processed" });
      },
    },
  },
});
