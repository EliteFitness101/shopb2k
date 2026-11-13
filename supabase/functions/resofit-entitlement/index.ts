import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const allowedOrigins = new Set([
  "https://resofit.fit",
  "https://www.resofit.fit",
  "https://shop.resofit.fit",
]);
const corsHeaders = (origin: string | null) => ({
  "Access-Control-Allow-Origin": origin && allowedOrigins.has(origin) ? origin : "https://resofit.fit",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Cache-Control": "no-store",
  "Vary": "Origin",
});
const json = (data: unknown, status = 200, origin: string | null = null) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders(origin), "Content-Type": "application/json" },
  });

Deno.serve(async (req) => {
  const origin = req.headers.get("origin");
  if (req.method === "OPTIONS") return new Response("ok", { status: 204, headers: corsHeaders(origin) });
  if (origin && !allowedOrigins.has(origin)) return json({ error: "Origin not allowed" }, 403, origin);
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405, origin);

  const auth = req.headers.get("Authorization") ?? "";
  if (!auth.startsWith("Bearer ")) return json({ error: "Sign in required" }, 401, origin);

  const url = Deno.env.get("SUPABASE_URL") ?? "";
  const publishable = Deno.env.get("SUPABASE_PUBLISHABLE_KEY") ?? Deno.env.get("SUPABASE_ANON_KEY") ?? "";
  if (!url || !publishable) return json({ error: "Supabase client configuration unavailable" }, 500, origin);

  const userClient = createClient(url, publishable, {
    global: { headers: { Authorization: auth } },
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data: userData, error: userError } = await userClient.auth.getUser();
  if (userError || !userData.user) return json({ error: "Sign in required" }, 401, origin);

  const body = await req.json().catch(() => ({}));
  const sku = typeof body?.product_sku === "string" ? body.product_sku.trim() : "";
  if (!sku) return json({ error: "product_sku is required" }, 400, origin);

  const { data, error } = await userClient.rpc("start_resofit_trial", { p_product_sku: sku });
  if (error) {
    const message = error.message || "Unable to start trial";
    const status = message.includes("already_claimed") ? 409 : message.includes("trial_not_configured") ? 404 : 400;
    return json({ error: message }, status, origin);
  }

  return json(data, 200, origin);
});
