import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const db = createClient(URL, SERVICE, { auth: { persistSession: false } });
const ORG = "6a7cfd9705e59fe6e2a3bf71";
const headers = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Content-Type": "application/json",
  "Cache-Control": "no-store"
};
const out = (v: unknown, status = 200) => new Response(JSON.stringify(v), { status, headers });

async function sameSecret(a: string, b: string) {
  const enc = new TextEncoder();
  const pair = await Promise.all([
    crypto.subtle.digest("SHA-256", enc.encode(a)),
    crypto.subtle.digest("SHA-256", enc.encode(b))
  ]);
  const x = new Uint8Array(pair[0]), y = new Uint8Array(pair[1]);
  let diff = x.length ^ y.length;
  for (let i = 0; i < x.length; i++) diff |= x[i] ^ y[i];
  return diff === 0;
}
async function authorized(req: Request) {
  const auth = req.headers.get("authorization") || "";
  if (auth === "Bearer " + SERVICE || req.headers.get("apikey") === SERVICE) return true;
  const cron = req.headers.get("x-content-cron-secret") || req.headers.get("x-buffer-cron-secret") || "";
  if (cron) {
    const { data, error } = await db.rpc("get_buffer_cron_secret");
    if (!error && data && await sameSecret(cron, String(data))) return true;
  }
  const token = auth.startsWith("Bearer ") ? auth.slice(7) : "";
  if (!token) return false;
  const { data, error } = await db.auth.getUser(token);
  if (error || !data.user) return false;
  if (data.user.email === "ceo@resofit.fit") return true;
  const { data: role } = await db.from("user_roles").select("role").eq("user_id", data.user.id).maybeSingle();
  return ["admin", "super_admin"].includes(String(role?.role || ""));
}

async function bufferToken() {
  const { data, error } = await db.rpc("get_buffer_access_token");
  if (error || !data) throw new Error("BUFFER_ACCESS_TOKEN unavailable through secret RPC");
  return String(data);
}

async function gql(query: string, variables: Record<string, unknown> = {}) {
  const token = await bufferToken();
  const r = await fetch("https://api.buffer.com", {
    method: "POST",
    headers: { "content-type": "application/json", Authorization: "Bearer " + token },
    body: JSON.stringify({ query, variables }),
    signal: AbortSignal.timeout(25000)
  });
  const raw = await r.text();
  let j: any;
  try { j = JSON.parse(raw); } catch { throw new Error("Buffer returned non-JSON HTTP " + r.status); }
  if (!r.ok || j.errors?.length) throw new Error("Buffer GraphQL error: " + JSON.stringify(j.errors || []).slice(0, 800));
  return j.data;
}

const mapPlatform = (service: string): string | null => {
  const s = String(service || "").toLowerCase();
  if (s === "googlebusiness") return "google_business";
  if (["linkedin", "pinterest", "tiktok", "youtube"].includes(s)) return s;
  return null;
};

async function automationKillReason(): Promise<{blocked:boolean;reason:string}> {
 const {data,error}=await db.from("chatb2k_control_plane").select("kill_switch_enabled,kill_switch_reason").eq("id",true).maybeSingle();
 if(error||!data)return {blocked:true,reason:"Control plane unavailable; automation paused"};
 return {blocked:data.kill_switch_enabled===true,reason:String(data.kill_switch_reason||"Orchestration globally paused")};
}
Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers });
  if (req.method !== "POST") return out({ error: "POST required" }, 405);
  if (!await authorized(req)) return out({ error: "Unauthorized" }, 401);
  const gate=await automationKillReason();if(gate.blocked)return out({error:"CHATB2K_GLOBAL_KILL_SWITCH_ACTIVE",reason:gate.reason},503);
  try {
    const body: any = await req.json().catch(() => ({}));
    const acct = await gql("query { account { organizations { id name } } }");
    const organizations = Array.isArray(acct?.account?.organizations) ? acct.account.organizations : [];
    if (!organizations.some((o: any) => String(o?.id) === ORG)) {
      return out({ ok: false, error: "Buffer organization mismatch; no registry changes made", expected_organization: ORG }, 409);
    }
    const channelData = await gql(
      "query($organizationId: OrganizationId!) { channels(input: { organizationId: $organizationId }) { id name displayName service isDisconnected isLocked isQueuePaused } }",
      { organizationId: ORG }
    );
    const all = Array.isArray(channelData?.channels) ? channelData.channels : [];
    const selected = all.filter((c: any) => mapPlatform(c.service) !== null);
    const active = selected.filter((c: any) => !c.isDisconnected && !c.isLocked);
    const synced: any[] = [];
    const errors: any[] = [];
    for (const c of active) {
      const platform = mapPlatform(c.service)!;
      const name = String(c.displayName || c.name || c.service);
      const now = new Date().toISOString();
      const channelRow = {
        organization_id: ORG,
        channel_id: String(c.id),
        platform,
        name,
        daily_limit: platform === "linkedin" ? 5 : platform === "google_business" ? 2 : 15,
        active: true,
        verified_at: now,
        updated_at: now
      };
      const { error: channelError } = await db.from("buffer_channels").upsert(channelRow, { onConflict: "channel_id" });
      if (channelError) { errors.push({ channel_id: c.id, target: "buffer_channels", error: channelError.message }); continue; }
      const destination = {
        provider: "buffer",
        platform,
        external_channel_id: String(c.id),
        display_name: name,
        active: true,
        daily_limit: platform === "linkedin" ? 5 : platform === "google_business" ? 2 : 15,
        rate_limit_per_minute: 6,
        auth_secret_ref: "buffer_access_token",
        capabilities: { text: true, image: true, video: platform !== "google_business", queue: true, analytics: true },
        metadata: { source: "buffer-live-channel", organization_id: ORG, service: c.service, is_queue_paused: Boolean(c.isQueuePaused), profile_edits_supported: false },
        last_verified_at: now,
        updated_at: now
      };
      const { error: destError } = await db.from("social_destinations").upsert(destination, { onConflict: "provider,platform,external_channel_id" });
      if (destError) { errors.push({ channel_id: c.id, target: "social_destinations", error: destError.message }); continue; }
      synced.push({ channel_id: c.id, platform, display_name: name, queue_paused: Boolean(c.isQueuePaused) });
    }

    const eventKey = "professional-channel-sync:" + new Date().toISOString().slice(0, 16);
    const { error: eventError } = await db.from("resofit_events").insert({
      event_name: "professional.platform_registry_synced",
      contract_version: "1.0",
      occurred_at: new Date().toISOString(),
      source_system: "buffer",
      adapter: "chatb2k-professional-authority-sync",
      idempotency_key: eventKey,
      payload: { organization_id: ORG, discovered: selected.length, connected: active.length, synced: synced.length, errors: errors.length, platforms: synced.map((x: any) => x.platform) }
    });
    if (eventError && eventError.code !== "23505") errors.push({ target: "resofit_events", error: eventError.message });

    let portfolioRefresh: any = { skipped: true };
    if (body.refresh_portfolio !== false) {
      const r = await fetch(URL + "/functions/v1/chatb2k-portfolio-intelligence", {
        method: "POST",
        headers: { "Content-Type": "application/json", apikey: SERVICE, Authorization: "Bearer " + SERVICE },
        body: JSON.stringify({
          action: "portfolio_refresh",
          query: String(body.query || "Refresh sourced CEO authority portfolio for ResoFit, ResoFlex, ChatB2K, Coach Buchi and LordB2K; prepare a LinkedIn profile draft and cite public evidence.")
        }),
        signal: AbortSignal.timeout(55000)
      });
      const raw = await r.text();
      try { portfolioRefresh = { http_status: r.status, ok: r.ok, result: JSON.parse(raw) }; }
      catch { portfolioRefresh = { http_status: r.status, ok: r.ok, result_excerpt: raw.slice(0, 600) }; }
    }

    return out({
      ok: errors.length === 0,
      action: "professional_authority_sync",
      organization_id: ORG,
      channels_discovered: selected.length,
      channels_connected: active.length,
      registry_rows_synced: synced.length,
      synced_channels: synced,
      errors,
      profile_refresh: portfolioRefresh,
      safety: { public_posts_created: 0, linkedin_profile_edits: 0, google_business_profile_edits: 0, note: "This endpoint reconciles connected channels and requests a sourced profile draft. It does not publish posts or modify profile/business details." },
      next_step: "Review the generated evidence-backed profile draft, then approve platform-specific posts through the existing content queue."
    });
  } catch (e) {
    console.error("chatb2k-professional-authority-sync", e);
    return out({ ok: false, error: e instanceof Error ? e.message : "sync_failed" }, 500);
  }
});