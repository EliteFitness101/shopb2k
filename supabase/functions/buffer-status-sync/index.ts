import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const supabase = createClient(SUPABASE_URL, SERVICE_ROLE);

async function sameSecret(a: string, b: string) {
  const encoder = new TextEncoder();
  const [x, y] = await Promise.all([
    crypto.subtle.digest("SHA-256", encoder.encode(a)),
    crypto.subtle.digest("SHA-256", encoder.encode(b)),
  ]);
  const aa = new Uint8Array(x);
  const bb = new Uint8Array(y);
  let diff = aa.length ^ bb.length;
  for (let i = 0; i < aa.length; i++) diff |= aa[i] ^ bb[i];
  return diff === 0;
}

async function cronSecret() {
  const configured = Deno.env.get("BUFFER_CRON_SECRET") || "";
  if (configured) return configured;
  const { data, error } = await supabase.rpc("get_buffer_cron_secret");
  if (error || !data) throw new Error("BUFFER_CRON_SECRET unavailable");
  return String(data);
}

async function authorized(req: Request) {
  const provided = req.headers.get("x-buffer-cron-secret") || "";
  if (provided) {
    try {
      const expected = await cronSecret();
      if (expected && await sameSecret(provided, expected)) return true;
    } catch { /* fall through to service-role authorization */ }
  }
  const auth = req.headers.get("authorization") || "";
  const bearer = auth.startsWith("Bearer ") ? auth.slice(7) : "";
  return Boolean(SERVICE_ROLE && bearer && await sameSecret(bearer, SERVICE_ROLE));
}

async function bufferToken() {
  const { data, error } = await supabase.rpc("get_buffer_access_token");
  if (error || !data) throw new Error("XBANG Buffer credential unavailable");
  return String(data);
}

async function gql(token: string, query: string, variables: Record<string, unknown>) {
  const response = await fetch("https://api.buffer.com", {
    method: "POST",
    headers: { "content-type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify({ query, variables }),
  });
  const raw = await response.text();
  let json: any;
  try { json = JSON.parse(raw); } catch { throw new Error(`Buffer returned non-JSON HTTP ${response.status}`); }
  if (!response.ok || json.errors?.length) throw new Error(JSON.stringify(json.errors || json));
  return json.data;
}

const CHANNELS_QUERY = `query($organizationId:OrganizationId!){
  channels(input:{organizationId:$organizationId}){
    id name service type isDisconnected isLocked isQueuePaused
  }
}`;

const POSTS_QUERY = `query($organizationId:OrganizationId!,$channelIds:[ChannelId!]!,$after:String){
  posts(first:100,after:$after,input:{
    organizationId:$organizationId,
    filter:{channelIds:$channelIds,status:[scheduled,sent,error]}
  }){
    edges{node{
      id status dueAt sentAt schedulingType
      error{message}
      channel{id name service}
    }}
    pageInfo{hasNextPage endCursor}
  }
}`;

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", {
    headers: { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, x-buffer-cron-secret, content-type" },
  });
  if (req.method !== "POST") return Response.json({ ok: false, error: "POST required" }, { status: 405 });
  if (!await authorized(req)) return Response.json({ ok: false, error: "Unauthorized" }, { status: 401 });

  try {
    const body = await req.json().catch(() => ({}));
    const dryRun = body?.dry_run === true;
    const days = Math.min(Math.max(Number(body?.lookback_days || 14), 1), 30);
    const since = new Date(Date.now() - days * 86400000).toISOString();

    const { data: route, error: routeError } = await supabase
      .from("chatb2k_provider_routes")
      .select("config")
      .eq("service_type", "social_distribution")
      .eq("provider", "Buffer")
      .eq("status", "active")
      .maybeSingle();
    if (routeError) throw routeError;
    if (!route?.config?.enabled || !route?.config?.approved) throw new Error("No CEO-approved active Buffer distribution route");

    const { data: settings, error: settingsError } = await supabase
      .from("content_automation_settings")
      .select("organization_id")
      .eq("id", true)
      .single();
    if (settingsError) throw settingsError;

    const organizationId = String(route.config.organization_id || settings.organization_id || "").trim();
    if (!organizationId) throw new Error("Buffer organization_id missing");

    const { data: channelRows, error: channelError } = await supabase
      .from("buffer_channels")
      .select("channel_id,platform,active,verified_at")
      .eq("organization_id", organizationId)
      .eq("active", true)
      .not("verified_at", "is", null);
    if (channelError) throw channelError;

    const channelIds = [...new Set((channelRows || []).map((row: any) => String(row.channel_id)).filter(Boolean))];
    if (!channelIds.length) return Response.json({ ok: true, dry_run: dryRun, checked: 0, reason: "No active verified Buffer channels" });

    const token = await bufferToken();
    const providerPosts: any[] = [];
    let after: string | null = null;
    for (let page = 0; page < 3; page++) {
      const data = await gql(token, POSTS_QUERY, { organizationId, channelIds, after });
      const connection = data?.posts;
      providerPosts.push(...(connection?.edges || []).map((edge: any) => edge.node).filter(Boolean));
      if (!connection?.pageInfo?.hasNextPage || !connection?.pageInfo?.endCursor) break;
      after = connection.pageInfo.endCursor;
    }

    const { data: logs, error: logError } = await supabase
      .from("content_publish_log")
      .select("id,queue_id,platform,provider_post_id,status,created_at,metrics")
      .eq("provider", "buffer")
      .eq("status", "scheduled")
      .not("provider_post_id", "is", null)
      .gte("created_at", since)
      .order("created_at", { ascending: false })
      .limit(200);
    if (logError) throw logError;

    const byId = new Map(providerPosts.map((post: any) => [String(post.id), post]));
    const changes: any[] = [];
    let unchanged = 0;

    for (const log of logs || []) {
      const post: any = byId.get(String(log.provider_post_id));
      if (!post) { unchanged++; continue; }

      const metrics = {
        ...(log.metrics || {}),
        buffer_provider_status: post.status,
        buffer_scheduling_type: post.schedulingType || null,
        buffer_due_at: post.dueAt || null,
        buffer_sent_at: post.sentAt || null,
        buffer_channel_name: post.channel?.name || null,
        buffer_channel_service: post.channel?.service || null,
        buffer_last_synced_at: new Date().toISOString(),
      };

      if (post.status === "sent" && log.platform === "instagram" && post.schedulingType === "notification") {
        changes.push({ log_id: log.id, queue_id: log.queue_id, platform: log.platform, next_status: "notification_sent", post_id: post.id });
        if (!dryRun) {
          const { error } = await supabase.from("content_publish_log").update({
            status: "notification_sent",
            metrics: { ...metrics, final_platform_publish_confirmed: false, requires_manual_publish: true },
            error_message: "Buffer notification sent; finish publishing in the Instagram app.",
          }).eq("id", log.id).eq("status", "scheduled");
          if (error) throw error;
        }
      } else if (post.status === "sent") {
        changes.push({ log_id: log.id, queue_id: log.queue_id, platform: log.platform, next_status: "published", post_id: post.id, published_at: post.sentAt || null });
        if (!dryRun) {
          const { error: logUpdateError } = await supabase.from("content_publish_log").update({
            status: "published",
            published_at: post.sentAt || new Date().toISOString(),
            metrics,
            error_message: null,
          }).eq("id", log.id).eq("status", "scheduled");
          if (logUpdateError) throw logUpdateError;
          if (log.queue_id) {
            const { error: queueUpdateError } = await supabase.from("content_queue").update({
              status: "published",
              published_at: post.sentAt || new Date().toISOString(),
              error_message: null,
            }).eq("id", log.queue_id).in("status", ["scheduled", "publishing"]);
            if (queueUpdateError) throw queueUpdateError;
          }
        }
      } else if (post.status === "error") {
        const message = String(post.error?.message || "Buffer provider reported a publishing error").slice(0, 1200);
        changes.push({ log_id: log.id, queue_id: log.queue_id, platform: log.platform, next_status: "failed", post_id: post.id, error: message });
        if (!dryRun) {
          const { error: logUpdateError } = await supabase.from("content_publish_log").update({
            status: "failed",
            error_message: message,
            metrics,
          }).eq("id", log.id).eq("status", "scheduled");
          if (logUpdateError) throw logUpdateError;
          if (log.queue_id) {
            const { error: queueUpdateError } = await supabase.from("content_queue").update({
              status: "failed",
              error_message: message,
            }).eq("id", log.queue_id).in("status", ["scheduled", "publishing"]);
            if (queueUpdateError) throw queueUpdateError;
          }
        }
      } else {
        unchanged++;
      }
    }

    return Response.json({
      ok: true,
      dry_run: dryRun,
      organization_id: organizationId,
      provider_posts_checked: providerPosts.length,
      local_logs_checked: (logs || []).length,
      proposed_or_applied: changes.length,
      unchanged,
      changes,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("buffer-status-sync", message);
    return Response.json({ ok: false, error: message }, { status: 500 });
  }
});
