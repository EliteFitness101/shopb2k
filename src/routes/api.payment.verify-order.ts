import { createFileRoute } from "@tanstack/react-router";

const SUPABASE_URL =
  process.env.SUPABASE_URL ??
  process.env.VITE_SUPABASE_URL ??
  "https://vbqjvmnhdtdhmeeudqnn.supabase.co";
const SUPABASE_BASE_URL = SUPABASE_URL.endsWith("/") ? SUPABASE_URL.slice(0, -1) : SUPABASE_URL;

/**
 * Same-origin verification alias. Supabase verify-order remains authoritative
 * for Paystack verification, reconciliation and fulfillment handoff.
 */
export const Route = createFileRoute("/api/payment/verify-order")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const incoming = new URL(request.url);
        const reference = incoming.searchParams.get("reference")?.trim();
        if (!reference || reference.length > 100) {
          return Response.json(
            { ok: false, status: "pending", message: "A valid payment reference is required." },
            { status: 400, headers: { "cache-control": "no-store" } },
          );
        }

        const upstreamUrl = new URL(SUPABASE_BASE_URL + "/functions/v1/verify-order");
        upstreamUrl.searchParams.set("reference", reference);

        try {
          const upstream = await fetch(upstreamUrl, {
            method: "GET",
            headers: { accept: "application/json" },
            signal: AbortSignal.timeout(12000),
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
            { ok: false, status: "pending", message: "Payment verification is temporarily unavailable." },
            { status: 502, headers: { "cache-control": "no-store" } },
          );
        }
      },
    },
  },
});
