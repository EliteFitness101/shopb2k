import { createClient } from "npm:@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const admin = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } });

const allowedOrigins = new Set(["https://resofit.fit", "https://www.resofit.fit", "https://store.resofit.fit"]);
const corsHeaders = (origin: string | null) => ({
  "Access-Control-Allow-Origin": origin && allowedOrigins.has(origin) ? origin : "https://www.resofit.fit",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Vary": "Origin",
});
const json = (status: number, body: unknown, origin: string | null) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders(origin), "Content-Type": "application/json", "Cache-Control": "no-store" },
  });

Deno.serve(async (req: Request) => {
  const origin = req.headers.get("origin");
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: corsHeaders(origin) });
  if (req.method !== "POST") return json(405, { error: "method_not_allowed" }, origin);

  try {
    const authorization = req.headers.get("authorization") ?? "";
    const bearer = authorization.toLowerCase().startsWith("bearer ") ? authorization.slice(7).trim() : "";
    if (!bearer) return json(401, { error: "authentication_required" }, origin);

    const { data: authData, error: authError } = await admin.auth.getUser(bearer);
    if (authError || !authData.user) return json(401, { error: "invalid_session" }, origin);

    const { data: isAdmin, error: roleError } = await admin.rpc("has_role", {
      _user_id: authData.user.id,
      _role: "admin",
    });
    if (roleError) {
      console.error("bank transfer reviewer role lookup failed", roleError.message);
      return json(500, { error: "role_verification_failed" }, origin);
    }
    if (isAdmin !== true) return json(403, { error: "admin_role_required" }, origin);

    let body: Record<string, unknown>;
    try { body = await req.json(); } catch { return json(400, { error: "invalid_json" }, origin); }
    const action = String(body.action ?? "").trim().toLowerCase();

    if (action === "list") {
      const { data, error } = await admin
        .from("custom_payment_requests")
        .select("id,order_reference,user_id,customer_name,customer_email,customer_phone,amount_ngn,method,account_id,evidence_url,customer_note,product_sku,status,review_note,created_at")
        .eq("status", "pending_review")
        .order("created_at", { ascending: true })
        .limit(100);
      if (error) {
        console.error("bank transfer review queue lookup failed", error.message);
        return json(500, { error: "review_queue_unavailable" }, origin);
      }
      return json(200, { ok: true, requests: data ?? [] }, origin);
    }

    if (action !== "approve" && action !== "reject") return json(400, { error: "invalid_review_action" }, origin);

    const requestId = String(body.request_id ?? "").trim();
    const reviewNote = String(body.review_note ?? "").trim().slice(0, 1000);
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(requestId)) {
      return json(400, { error: "invalid_request_id" }, origin);
    }
    if (reviewNote.length < 8) return json(400, { error: "review_note_required" }, origin);

    const { data, error } = await admin.rpc("review_custom_payment_request", {
      p_request_id: requestId,
      p_decision: action,
      p_reviewer_id: authData.user.id,
      p_review_note: reviewNote,
    });
    if (error) {
      console.error("bank transfer review action failed", error.message);
      const status = error.code === "42501" ? 403 : error.code === "P0002" ? 404 : 409;
      return json(status, { error: error.message }, origin);
    }
    return json(200, { ok: true, review: data }, origin);
  } catch (error) {
    console.error("bank transfer review failed", String(error));
    return json(500, { error: "bank_transfer_review_failed" }, origin);
  }
});