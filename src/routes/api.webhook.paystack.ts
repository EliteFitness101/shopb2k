import { createFileRoute } from "@tanstack/react-router";

const SUPABASE_URL =
  process.env.SUPABASE_URL ??
  process.env.VITE_SUPABASE_URL ??
  "https://vbqjvmnhdtdhmeeudqnn.supabase.co";
const SUPABASE_BASE_URL = SUPABASE_URL.endsWith("/") ? SUPABASE_URL.slice(0, -1) : SUPABASE_URL;

/**
 * Canonical-domain ingress for Paystack events.
 * Supabase paystack-webhook remains the signature-verification and reconciliation
 * authority. Preserve the raw request body for Paystack HMAC validation.
 */
export const Route = createFileRoute("/api/webhook/paystack")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const signature = request.headers.get("x-paystack-signature");
        if (!signature) {
          return Response.json({ ok: false, error: "Missing Paystack signature" }, { status: 401 });
        }

        const rawBody = await request.arrayBuffer();
        const upstreamUrl = SUPABASE_BASE_URL + "/functions/v1/paystack-webhook";

        try {
          const upstream = await fetch(upstreamUrl, {
            method: "POST",
            headers: {
              "content-type": request.headers.get("content-type") ?? "application/json",
              "x-paystack-signature": signature,
            },
            body: rawBody,
            signal: AbortSignal.timeout(15000),
          });

          const body = await upstream.arrayBuffer();
          return new Response(body, {
            status: upstream.status,
            headers: {
              "content-type": upstream.headers.get("content-type") ?? "application/json",
              "cache-control": "no-store",
            },
          });
        } catch {
          return Response.json(
            { ok: false, error: "Paystack webhook upstream temporarily unavailable" },
            { status: 502, headers: { "cache-control": "no-store" } },
          );
        }
      },
    },
  },
});
