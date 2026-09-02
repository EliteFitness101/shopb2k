import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const publishableKeys = JSON.parse(Deno.env.get("SUPABASE_PUBLISHABLE_KEYS") ?? "{}");
const allowedKeys = new Set<string>([
  ...Object.values(publishableKeys).filter((v): v is string => typeof v === "string"),
  Deno.env.get("SUPABASE_ANON_KEY") ?? "",
].filter(Boolean));
const db = createClient(SUPABASE_URL, SERVICE_ROLE, { auth: { persistSession: false } });

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), {
  status,
  headers: { ...cors, "Content-Type": "application/json", "Cache-Control": "private, max-age=15" },
});

function authorized(req: Request) {
  const api = req.headers.get("apikey");
  if (api && allowedKeys.has(api)) return true;
  const bearer = req.headers.get("authorization")?.match(/^Bearer\s+(.+)$/i)?.[1];
  return Boolean(bearer && allowedKeys.has(bearer));
}

const norm = (v: unknown) => String(v ?? "").trim().toLowerCase();
const terms = (v: unknown) => norm(v).split(/[^a-z0-9]+/).filter((x) => x.length > 2);

function scoreProduct(p: any, ctx: any, performance: any) {
  const hay = [p.title, p.body_html, p.product_type, p.vendor, ...(p.tags ?? [])].filter(Boolean).join(" ").toLowerCase();
  const queryTerms = terms(ctx.query);
  const goalTerms = terms(ctx.goal);
  const interestTerms = terms(ctx.interests);
  const matched = (xs: string[]) => xs.reduce((n, x) => n + (hay.includes(x) ? 1 : 0), 0);
  let score = matched(queryTerms) * 20 + matched(goalTerms) * 14 + matched(interestTerms) * 10;
  if (ctx.product_type && norm(p.product_type) === norm(ctx.product_type)) score += 18;
  if (ctx.gender && hay.includes(norm(ctx.gender))) score += 4;
  if (ctx.location && hay.includes(norm(ctx.location))) score += 3;
  const price = Number(p.variant_price ?? 0);
  const budget = norm(ctx.budget_tier);
  if (budget === "entry" && price > 0) score += price <= 25000 ? 8 : -4;
  if (budget === "standard" && price > 0) score += price <= 100000 ? 6 : 0;
  if (budget === "premium" && price > 0) score += price >= 50000 ? 7 : 0;
  if (Number(p.variant_inventory_qty ?? 0) <= 0) score -= 100;
  const perf = performance?.[p.id];
  score += Math.min(20, Number(perf?.recommendation_weight ?? 0) / 5);
  score += Math.min(10, Number(perf?.conversion_score ?? 0) / 10);
  return Math.max(0, Math.min(100, score));
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "GET" && req.method !== "POST") return json({ error: "Method not allowed" }, 405);
  if (!authorized(req)) return json({ error: "Unauthorized" }, 401);

  try {
    const url = new URL(req.url);
    let input: any = Object.fromEntries(url.searchParams.entries());
    if (req.method === "POST") input = { ...input, ...(await req.json().catch(() => ({}))) };

    const userId = input.user_id ? String(input.user_id) : null;
    let state: any = null;
    let prefs: any = null;
    if (userId) {
      const [s, p] = await Promise.all([
        db.from("resofit_member_states").select("*").eq("user_id", userId).maybeSingle(),
        db.from("customer_preferences").select("*").eq("user_id", userId).maybeSingle(),
      ]);
      state = s.data ?? null;
      prefs = p.data ?? null;
    }

    const ctx = {
      query: input.query ?? input.q ?? "",
      goal: input.goal ?? state?.primary_objective ?? prefs?.goal ?? "",
      interests: input.interests ?? "",
      gender: input.gender ?? state?.gender ?? prefs?.gender ?? "",
      budget_tier: input.budget_tier ?? state?.budget_tier ?? "",
      location: input.location ?? state?.location ?? "",
      product_type: input.product_type ?? "",
    };

    const { data: products, error } = await db
      .from("products")
      .select("id,sku,handle,title,body_html,vendor,product_type,tags,published,variant_price,variant_inventory_qty,image_src")
      .eq("published", true)
      .gt("variant_inventory_qty", 0)
      .limit(1000);
    if (error) throw error;

    const ids = (products ?? []).map((p: any) => p.id);
    const performance: Record<string, any> = {};
    if (ids.length) {
      const { data: intel } = await db
        .from("product_intelligence")
        .select("product_id,recommendation_weight,conversion_score,performance_score,lifecycle")
        .in("product_id", ids);
      for (const row of intel ?? []) performance[row.product_id] = row;
    }

    const ranked = (products ?? [])
      .map((p: any) => ({ ...p, recommendation_score: scoreProduct(p, ctx, performance) }))
      .sort((a: any, b: any) => b.recommendation_score - a.recommendation_score)
      .slice(0, Math.min(Number(input.limit ?? 6), 12));

    const sessionId = input.session_id ? String(input.session_id) : null;
    const rsid = input.rsid ? String(input.rsid) : null;
    if (ranked.length) {
      await db.from("chat_commerce_events").insert(ranked.map((p: any) => ({
        session_id: sessionId ?? `recommendation:${crypto.randomUUID()}`,
        event: "recommendation_served",
        product_sku: p.sku,
        value: p.recommendation_score,
        metadata: { user_id: userId, query: ctx.query, goal: ctx.goal, budget_tier: ctx.budget_tier, rsid, source: "chatb2k-recommend" },
      })));
    }

    return json({
      orchestrator: "ChatB2K",
      version: "1.0",
      source_of_truth: "public.products + public.product_intelligence",
      context: ctx,
      recommendations: ranked.map((p: any) => ({
        id: p.id,
        sku: p.sku,
        handle: p.handle,
        title: p.title,
        product_type: p.product_type,
        price: p.variant_price,
        inventory: p.variant_inventory_qty,
        image: p.image_src,
        score: p.recommendation_score,
        lifecycle: performance[p.id]?.lifecycle ?? null,
        rationale: "Matched to current intent, profile context, availability and observed product performance.",
        route: `/product/${p.handle}`,
      })),
      rules: {
        fixed_offer: false,
        fixed_price: false,
        fixed_sku: false,
        catalog_authoritative: true,
        unavailable_products_excluded: true,
        revenue_feedback_ready: true,
      },
    });
  } catch (error) {
    console.error("chatb2k-recommend", error);
    return json({ error: "Recommendation failed" }, 500);
  }
});
