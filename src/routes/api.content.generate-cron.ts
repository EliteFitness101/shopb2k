import { createFileRoute } from "@tanstack/react-router";

const GEMINI_MODEL = process.env.GEMINI_CONTENT_MODEL || "gemini-3.6-flash";
const DEFAULT_ITEM_LIMIT = 2;
const PLATFORMS = ["tiktok", "youtube", "google_business"] as const;
type Platform = (typeof PLATFORMS)[number];

function cronAuthorized(request: Request) {
  const secret = process.env.CRON_SECRET || process.env.CHATGPT_PUBLISH_SECRET;
  const authorization = request.headers.get("authorization") ?? "";
  return Boolean(secret && authorization === `Bearer ${secret}`);
}

function productUrl(handle: string) {
  return `https://www.resofit.fit/product/${encodeURIComponent(handle)}`;
}

function safeJsonText(value: unknown) {
  const text = String(value ?? "").replace(/^```json\s*/i, "").replace(/\s*```$/i, "").trim();
  return text;
}

async function geminiGenerate(apiKey: string, product: {
  sku: string;
  title: string;
  body_html: string | null;
  vendor: string | null;
  product_type: string | null;
  tags: string[] | null;
  variant_price: number | null;
  image_src: string | null;
  handle: string;
}) {
  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(GEMINI_MODEL)}:generateContent?key=${encodeURIComponent(apiKey)}`;
  const prompt = `You are ChatB2K™, ResoFit's production content intelligence engine. Create a factual social-content package for this verified ResoFit product record.

RULES:
- Use ONLY the supplied product facts.
- Never invent specifications, seller claims, availability, discounts, testimonials, medical outcomes, certifications, locations, or external URLs.
- Do not alter the supplied price.
- The canonical product URL is supplied; use it only as the CTA destination.
- Brand voice: premium, practical, energetic, African wellness, CoachB2K authority.
- Make TikTok punchy, YouTube descriptive, and Google Business locally useful without inventing a location.
- Return ONLY valid JSON.

PRODUCT:
${JSON.stringify({
  sku: product.sku,
  title: product.title,
  description: product.body_html,
  vendor: product.vendor,
  product_type: product.product_type,
  tags: product.tags,
  price_ngn: product.variant_price,
  image_url: product.image_src,
  canonical_url: productUrl(product.handle),
})}

JSON shape:
{
  "content_angle": "string",
  "hook": "string",
  "description": "string",
  "cta": "string",
  "keywords": ["string"],
  "tiktok": "string",
  "youtube": "string",
  "google_business": "string",
  "media_brief": "string",
  "confidence": 0.0
}`;

  const started = Date.now();
  const response = await fetch(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: {
        responseMimeType: "application/json",
        temperature: 0.7,
      },
    }),
  });

  const body = await response.json().catch(() => ({}));
  const latencyMs = Date.now() - started;
  const usage = body?.usageMetadata ?? {};

  if (!response.ok) {
    return {
      ok: false as const,
      httpStatus: response.status,
      latencyMs,
      usage,
      error: body?.error?.message || JSON.stringify(body),
    };
  }

  const generatedText = body?.candidates?.[0]?.content?.parts
    ?.map((part: { text?: string }) => part.text || "")
    .join("") || "";

  let enrichment: Record<string, unknown>;
  try {
    enrichment = JSON.parse(safeJsonText(generatedText));
  } catch {
    return {
      ok: false as const,
      httpStatus: response.status,
      latencyMs,
      usage,
      error: "Gemini returned non-JSON content",
    };
  }

  return {
    ok: true as const,
    httpStatus: response.status,
    latencyMs,
    usage,
    enrichment,
  };
}

export const Route = createFileRoute("/api/content/generate-cron")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        if (!cronAuthorized(request)) {
          return Response.json({ ok: false, error: "Unauthorized" }, { status: 401 });
        }

        const supabaseUrl = process.env.SUPABASE_URL;
        const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
        const geminiKey = process.env.GEMINI_API_KEY;
        if (!supabaseUrl || !serviceRoleKey || !geminiKey) {
          return Response.json({ ok: false, error: "Production content-generation configuration is incomplete" }, { status: 500 });
        }

        const { createClient } = await import("@supabase/supabase-js");
        const supabase = createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false } });

        const budgetResult = await supabase.rpc("chatb2k_gemini_budget_status");
        if (budgetResult.error) throw budgetResult.error;
        const budget = budgetResult.data as Record<string, unknown>;
        const itemLimit = Math.max(1, Math.min(
          Number(process.env.CHATB2K_GEMINI_AUTOGEN_ITEMS || DEFAULT_ITEM_LIMIT),
          5,
        ));

        if (budget.monthly_request_ok !== true || budget.daily_request_ok !== true || budget.monthly_cost_ok !== true || budget.daily_cost_ok !== true) {
          return Response.json({ ok: true, status: "budget_guard", budget, generated: 0 });
        }

        const { data: products, error: productsError } = await supabase
          .from("products")
          .select("sku,handle,title,body_html,vendor,product_type,tags,published,variant_price,image_src,created_at")
          .eq("published", true)
          .not("image_src", "is", null)
          .order("created_at", { ascending: false })
          .limit(30);
        if (productsError) throw productsError;

        const candidates = [];
        for (const product of products ?? []) {
          if (!product.sku || !product.handle || !product.title || !product.image_src) continue;
          const autoSku = `GEMINI-AUTO-${product.sku}`;
          const { data: recent } = await supabase
            .from("content_queue")
            .select("id")
            .eq("sku", autoSku)
            .gte("created_at", new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())
            .limit(1);
          if (!recent?.length) candidates.push({ ...product, autoSku });
          if (candidates.length >= itemLimit) break;
        }

        const generated: Array<Record<string, unknown>> = [];
        for (const product of candidates) {
          const result = await geminiGenerate(geminiKey, product);
          const usage = result.usage ?? {};
          const inputTokens = Number(usage.promptTokenCount || 0);
          const outputTokens = Number(usage.candidatesTokenCount || 0);
          const totalTokens = Number(usage.totalTokenCount || inputTokens + outputTokens);

          await supabase.from("chatb2k_gemini_usage").insert({
            function_name: "api.content.generate-cron",
            model: GEMINI_MODEL,
            operation: "content_autogen",
            status: result.ok ? "success" : "error",
            http_status: result.httpStatus,
            input_tokens: inputTokens,
            output_tokens: outputTokens,
            total_tokens: totalTokens,
            thinking_tokens: Number(usage.thoughtsTokenCount || 0),
            estimated_cost_usd: 0,
            grounded_search_queries: 0,
            latency_ms: result.latencyMs,
            metadata: { sku: product.sku, mode: "free-tier-content-autogen" },
          });

          if (!result.ok) {
            generated.push({ sku: product.sku, status: "generation_failed", error: result.error, http_status: result.httpStatus });
            continue;
          }

          const enrichment = result.enrichment as Record<string, unknown>;
          const campaignKey = `chatb2k-gemini-autogen-${new Date().toISOString().slice(0, 10)}`;
          const canonical = productUrl(product.handle);
          const baseMetadata = {
            source: "chatb2k-gemini-autogen",
            engine: "ChatB2K + Gemini",
            model: GEMINI_MODEL,
            product_id: product.sku,
            canonical_url: canonical,
            media_brief: enrichment.media_brief ?? null,
            content_angle: enrichment.content_angle ?? null,
            confidence: enrichment.confidence ?? null,
            generated_at: new Date().toISOString(),
            free_tier: true,
          };

          const now = Date.now();
          const rows = PLATFORMS.map((platform: Platform, index) => {
            const platformText = String(enrichment[platform] || enrichment.description || enrichment.hook || product.title);
            return {
              sku: product.autoSku,
              title: `${product.title} · ChatB2K · ${platform}`,
              asset_url: product.image_src,
              public_id: `gemini-auto-${product.sku}-${platform}`,
              caption: platformText,
              platforms: [platform],
              status: "approved",
              scheduled_at: new Date(now + (30 + index * 45) * 60 * 1000).toISOString(),
              campaign_key: campaignKey,
              platform,
              content_variant: 1,
              destination: canonical,
              keywords: Array.isArray(enrichment.keywords) ? enrichment.keywords.map(String) : [],
              safety_checked: true,
              metadata: { ...baseMetadata, platform, product_title: product.title },
            };
          });

          const { data: inserted, error: insertError } = await supabase
            .from("content_queue")
            .insert(rows)
            .select("id,platform,scheduled_at");
          if (insertError) {
            generated.push({ sku: product.sku, status: "queue_failed", error: insertError.message });
            continue;
          }

          generated.push({ sku: product.sku, status: "queued", queue: inserted ?? [], media_brief: enrichment.media_brief ?? null });
        }

        return Response.json({
          ok: true,
          status: "generated_and_queued",
          model: GEMINI_MODEL,
          free_tier: true,
          item_limit: itemLimit,
          candidates: candidates.length,
          generated,
        });
      },
    },
  },
});
