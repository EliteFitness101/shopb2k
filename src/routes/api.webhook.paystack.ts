import { createFileRoute } from "@tanstack/react-router";

const SUPABASE_URL =
  process.env.SUPABASE_URL ??
  process.env.VITE_SUPABASE_URL ??
  "https://vbqjvmnhdtdhmeeudqnn.supabase.co";

/**
 * Canonical-domain ingress for Paystack events.
 * The existing Supabase paystack-webhook function remains the signature-verification
 * and reconciliation authority. Preserve the raw request body because Paystack's
 * HMAC signature is calculated over the exact bytes received.
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
        const upstreamUrl = \`\${SUPABASE_URL.replace(/\\/$/, "")}/functions/v1/paystack-webhook\`;

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
