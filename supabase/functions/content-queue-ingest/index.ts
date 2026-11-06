import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

async function automationKillReason(): Promise<{blocked:boolean;reason:string}> {
 const {data,error}=await supabase.from("chatb2k_control_plane").select("kill_switch_enabled,kill_switch_reason").eq("id",true).maybeSingle();
 if(error||!data)return {blocked:true,reason:"Control plane unavailable; automation paused"};
 return {blocked:data.kill_switch_enabled===true,reason:String(data.kill_switch_reason||"Orchestration globally paused")};
}
Deno.serve(async (req: Request) => {
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "POST required" }), { status: 405, headers: { "content-type": "application/json" } });
  }
  const gate=await automationKillReason();
  if (gate.blocked) return new Response(JSON.stringify({ error: "CHATB2K_GLOBAL_KILL_SWITCH_ACTIVE", reason: gate.reason }), { status: 503, headers: { "content-type": "application/json", "cache-control": "no-store" } });

  try {
    const body = await req.json();
    const publicId = String(body.public_id || "").trim();
    const assetUrl = String(body.asset_url || "").trim();
    const sku = String(body.sku || "").trim() || null;
    const title = String(body.title || "").trim() || null;
    const caption = String(body.caption || "").trim() || null;
    const platforms = Array.isArray(body.platforms) && body.platforms.length
      ? body.platforms.map((p: unknown) => String(p))
      : ["tiktok", "youtube_shorts", "google_business"];

    if (!publicId || !assetUrl) {
      return new Response(JSON.stringify({ error: "public_id and asset_url are required" }), { status: 400, headers: { "content-type": "application/json" } });
    }

    const metadata = {
      source: "cloudinary",
      cloud_name: "ihlmr2hd",
      public_id: publicId,
      media_type: "video",
      aspect_ratio: "9:16",
      duration_seconds: body.duration_seconds ?? null,
      resolution: body.resolution ?? null,
      delivery: { quality: "auto", format: "auto", codec: "auto" },
      previews: {
        poster_url: body.poster_url ?? null,
        sprite_vtt_url: body.sprite_vtt_url ?? null,
        sprite_jpg_url: body.sprite_jpg_url ?? null
      },
      pipeline: ["cloudinary", "supabase_content_queue", "buffer"],
      generated_at: new Date().toISOString()
    };

    const { data, error } = await supabase
      .from("content_queue")
      .insert({
        sku,
        title,
        asset_url: assetUrl,
        public_id: publicId,
        caption,
        platforms,
        status: "approved",
        metadata
      })
      .select()
      .single();

    if (error) throw error;

    return new Response(JSON.stringify({ ok: true, item: data }), { status: 201, headers: { "content-type": "application/json" } });
  } catch (error) {
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : "Unexpected error" }), { status: 500, headers: { "content-type": "application/json" } });
  }
});
