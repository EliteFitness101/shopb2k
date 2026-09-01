import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Sparkles, Video, CheckCircle2, AlertTriangle, Loader2, Send } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { MARTIAL_VIDEOS } from "@/content/martialVideos";

const BUFFER_API = "https://api.buffer.com";
const BUFFER_CHANNELS = {
  tiktok: "6a7cfe5ab2d9d57743686cc5",
  youtube: "6a7d4ae7b2d9d577436a9c08",
  google_business: "6a7d4d1fb2d9d577436aa192",
} as const;

type BufferChannel = keyof typeof BUFFER_CHANNELS;

function gqlString(value: unknown) {
  return JSON.stringify(String(value ?? ""));
}

async function publishDirectToBuffer(input: {
  mediaUrl: string;
  title: string;
  caption: string;
  platform: BufferChannel;
}) {
  const key = process.env.BUFFER_API_KEY;
  if (!key) throw new Error("BUFFER_API_KEY is not configured server-side");

  const channelId = BUFFER_CHANNELS[input.platform];
  const text = input.platform === "youtube"
    ? `${input.title}\n\n${input.caption}`
    : input.caption;

  const query = `mutation CreateResoFitPost {
    createPost(input: {
      text: ${gqlString(text)}
      channelId: ${gqlString(channelId)}
      schedulingType: automatic
      mode: addToQueue
      assets: [{ video: { url: ${gqlString(input.mediaUrl)} } }]
      source: "resofit-content-engine"
      aiAssisted: true
      metadata: { }
    }) {
      ... on PostActionSuccess { post { id dueAt status channelId assets { id mimeType } } }
      ... on MutationError { message }
    }
  }`;

  const response = await fetch(BUFFER_API, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${key}`,
    },
    body: JSON.stringify({ query }),
  });

  const body = await response.json().catch(() => ({}));
  if (!response.ok || body.errors?.length) {
    throw new Error(JSON.stringify(body.errors || body));
  }

  const result = body?.data?.createPost;
  if (result?.message) throw new Error(result.message);
  if (!result?.post?.id) throw new Error(`Buffer did not return a post ID: ${JSON.stringify(body)}`);
  return result.post;
}

export const Route = createFileRoute("/content")({
  head: () => ({
    meta: [
      { title: "Content Engine — ResoFit" },
      { name: "description", content: "ResoFit ChatB2K content intelligence and publishing control center." },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: ContentEnginePage,
  server: {
    handlers: {
      POST: async ({ request }) => {
        const auth = request.headers.get("authorization") ?? "";
        if (!auth.startsWith("Bearer ")) return Response.json({ ok: false, error: "Unauthorized" }, { status: 401 });
        const token = auth.slice(7);
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { data: userData, error: userError } = await supabaseAdmin.auth.getUser(token);
        if (userError || !userData.user) return Response.json({ ok: false, error: "Unauthorized" }, { status: 401 });
        const { data: isAdmin } = await supabaseAdmin.rpc("has_role", { _user_id: userData.user.id, _role: "admin" });
        if (!isAdmin) return Response.json({ ok: false, error: "Admin role required" }, { status: 403 });

        const body = await request.json().catch(() => ({}));
        const asset = MARTIAL_VIDEOS.find((item) => item.id === body.assetId);
        if (!asset) return Response.json({ ok: false, error: "Unknown content asset" }, { status: 400 });

        const { data: existing, error: duplicateError } = await supabaseAdmin
          .from("content_queue")
          .select("id,status,buffer_post_ids")
          .eq("asset_url", asset.url)
          .limit(1);
        if (duplicateError) throw duplicateError;
        if (existing?.length) return Response.json({ ok: true, status: "duplicate", queueId: existing[0].id, bufferPostIds: existing[0].buffer_post_ids ?? [] });

        const geminiKey = process.env.GEMINI_API_KEY;
        if (!geminiKey) return Response.json({ ok: false, error: "GEMINI_API_KEY is not configured server-side" }, { status: 503 });

        const mediaResponse = await fetch(asset.url);
        if (!mediaResponse.ok) throw new Error(`Media fetch failed: ${mediaResponse.status}`);
        const mediaBytes = new Uint8Array(await mediaResponse.arrayBuffer());
        const mimeType = mediaResponse.headers.get("content-type") || "video/mp4";

        const uploadStart = await fetch(`https://generativelanguage.googleapis.com/upload/v1beta/files?key=${encodeURIComponent(geminiKey)}`, {
          method: "POST",
          headers: {
            "X-Goog-Upload-Protocol": "resumable",
            "X-Goog-Upload-Command": "start",
            "X-Goog-Upload-Header-Content-Length": String(mediaBytes.byteLength),
            "X-Goog-Upload-Header-Content-Type": mimeType,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ file: { display_name: asset.id } }),
        });
        if (!uploadStart.ok) throw new Error(`Gemini upload start failed: ${await uploadStart.text()}`);
        const uploadUrl = uploadStart.headers.get("x-goog-upload-url");
        if (!uploadUrl) throw new Error("Gemini upload URL missing");

        const upload = await fetch(uploadUrl, {
          method: "POST",
          headers: {
            "Content-Length": String(mediaBytes.byteLength),
            "X-Goog-Upload-Offset": "0",
            "X-Goog-Upload-Command": "upload, finalize",
          },
          body: mediaBytes,
        });
        if (!upload.ok) throw new Error(`Gemini upload failed: ${await upload.text()}`);
        let file = (await upload.json()).file;
        for (let attempt = 0; attempt < 20 && file?.state !== "ACTIVE"; attempt += 1) {
          await new Promise((resolve) => setTimeout(resolve, 3000));
          const status = await fetch(`https://generativelanguage.googleapis.com/v1beta/${file.name}?key=${encodeURIComponent(geminiKey)}`);
          if (!status.ok) throw new Error(`Gemini processing check failed: ${await status.text()}`);
          file = (await status.json()).file;
        }
        if (!file?.uri || file.state !== "ACTIVE") throw new Error("Gemini video processing did not complete");

        const prompt = `You are ChatB2K™, ResoFit's content intelligence engine. Analyze this Martial-X video and return ONLY valid JSON. Describe only what is actually visible. Generate: title, visual_summary, accessible alt_text, SEO description, hook, a general caption suitable for TikTok/YouTube Shorts/Google Business, platform-specific captions for tiktok/youtube_shorts/google_business, hashtags array, keywords array, CTA, audience, content_category, confidence. Brand voice: premium, energetic, disciplined, African wellness/fitness. Do not invent facts, identities, locations, achievements or medical claims. Media role: ${asset.role}.`;
        const generated = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-3.7-flash:generateContent?key=${encodeURIComponent(geminiKey)}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }, { file_data: { mime_type: file.mimeType || mimeType, file_uri: file.uri } }] }],
            generationConfig: { responseMimeType: "application/json" },
          }),
        });
        if (!generated.ok) throw new Error(`Gemini generation failed: ${await generated.text()}`);
        const generatedBody = await generated.json();
        const generatedText = generatedBody?.candidates?.[0]?.content?.parts?.map((part: { text?: string }) => part.text || "").join("") || "";
        const cleaned = generatedText.replace(/^```json\s*/i, "").replace(/\s*```$/i, "").trim();
        const enrichment = JSON.parse(cleaned);

        const { data: row, error: insertError } = await supabaseAdmin
          .from("content_queue")
          .insert({
            sku: `MARTIAL-${asset.id}`,
            title: enrichment.title || asset.label,
            asset_url: asset.url,
            public_id: asset.id,
            caption: enrichment.caption || enrichment.hook || enrichment.platforms?.tiktok || enrichment.title || asset.label,
            platforms: ["tiktok", "youtube_shorts", "google_business"],
            status: "approved",
            metadata: {
              source: "resofit_content_engine",
              site_section: "martial",
              brand: "ResoFit",
              experience: "Martial-X",
              media_role: asset.role,
              enrichment_engine: "ChatB2K + Gemini",
              enrichment,
              generated_by: userData.user.id,
              generated_at: new Date().toISOString(),
            },
          })
          .select("id")
          .single();
        if (insertError) throw insertError;

        const posts: Array<{ id: string; channelId: string; dueAt?: string; status?: string }> = [];
        const platformCaption = (platform: BufferChannel) => {
          if (platform === "tiktok") return enrichment.platforms?.tiktok || enrichment.hook || enrichment.caption || enrichment.title || asset.label;
          if (platform === "youtube") return enrichment.platforms?.youtube_shorts || enrichment.caption || enrichment.title || asset.label;
          return enrichment.platforms?.google_business || enrichment.caption || enrichment.title || asset.label;
        };

        try {
          for (const platform of Object.keys(BUFFER_CHANNELS) as BufferChannel[]) {
            const post = await publishDirectToBuffer({
              mediaUrl: asset.url,
              title: enrichment.title || asset.label,
              caption: platformCaption(platform),
              platform,
            });
            posts.push(post);
          }
        } catch (publishError) {
          await supabaseAdmin.from("content_queue").update({
            status: "publish_failed",
            error_message: publishError instanceof Error ? publishError.message : String(publishError),
            metadata: {
              source: "resofit_content_engine",
              site_section: "martial",
              brand: "ResoFit",
              experience: "Martial-X",
              media_role: asset.role,
              enrichment_engine: "ChatB2K + Gemini",
              enrichment,
              generated_by: userData.user.id,
              generated_at: new Date().toISOString(),
              direct_buffer: true,
              partial_buffer_posts: posts,
            },
          }).eq("id", row.id);
          throw publishError;
        }

        await supabaseAdmin.from("content_queue").update({
          status: "published",
          buffer_post_ids: posts.map((post) => post.id),
          published_at: new Date().toISOString(),
          metadata: {
            source: "resofit_content_engine",
            site_section: "martial",
            brand: "ResoFit",
            experience: "Martial-X",
            media_role: asset.role,
            enrichment_engine: "ChatB2K + Gemini",
            enrichment,
            generated_by: userData.user.id,
            generated_at: new Date().toISOString(),
            direct_buffer: true,
            buffer_channels: BUFFER_CHANNELS,
          },
        }).eq("id", row.id);

        return Response.json({ ok: true, status: "published_direct_to_buffer", queueId: row.id, posts, enrichment });
      },
    },
  },
});

function ContentEnginePage() {
  const { user, loading } = useAuth();
  const [running, setRunning] = useState<string | null>(null);
  const [results, setResults] = useState<Record<string, string>>({});

  const queue = useQuery({
    queryKey: ["content-engine", "queue"],
    enabled: Boolean(user),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("content_queue")
        .select("id,title,caption,status,asset_url,created_at,buffer_post_ids")
        .order("created_at", { ascending: false })
        .limit(20);
      if (error) throw error;
      return data ?? [];
    },
  });

  async function runAsset(assetId: string) {
    setRunning(assetId);
    try {
      const session = await supabase.auth.getSession();
      const token = session.data.session?.access_token;
      if (!token) throw new Error("Sign in required");
      const response = await fetch("/content", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ assetId }),
      });
      const body = await response.json();
      setResults((current) => ({ ...current, [assetId]: body.ok ? body.status : body.error || "failed" }));
      await queue.refetch();
    } catch (error) {
      setResults((current) => ({ ...current, [assetId]: error instanceof Error ? error.message : "failed" }));
    } finally {
      setRunning(null);
    }
  }

  async function runAll() {
    for (const asset of MARTIAL_VIDEOS) await runAsset(asset.id);
  }

  if (loading) return <div className="flex min-h-dvh items-center justify-center"><Loader2 className="h-5 w-5 animate-spin" /></div>;

  return (
    <div className="min-h-dvh bg-background">
      <SiteHeader />
      <main className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
        <div className="flex items-center gap-2 text-[10px] uppercase tracking-[0.2em] text-gold"><Sparkles className="h-3 w-3" /> ChatB2K™ Content Engine</div>
        <div className="mt-2 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
          <div><h1 className="font-display text-4xl">ResoFit Content Command</h1><p className="mt-2 max-w-2xl text-sm text-muted-foreground">Canonical content intake, Gemini enrichment and direct Buffer syndication. Martial-X is the first controlled production stream.</p></div>
          <button onClick={runAll} disabled={Boolean(running)} className="inline-flex items-center justify-center gap-2 rounded-md bg-gold px-5 py-3 text-xs font-semibold uppercase tracking-widest text-black disabled:opacity-50"><Send className="h-4 w-4" /> Run Martial Pipeline</button>
        </div>

        <section className="mt-8 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {MARTIAL_VIDEOS.map((asset) => (
            <article key={asset.id} className="overflow-hidden rounded-xl border border-border bg-card">
              <video src={asset.url} muted playsInline preload="metadata" className="aspect-video w-full object-cover" />
              <div className="p-4"><div className="flex items-start justify-between gap-3"><div><h2 className="text-sm font-semibold">{asset.label}</h2><p className="mt-1 text-[10px] uppercase tracking-widest text-muted-foreground">{asset.role.replaceAll("_", " ")}</p></div><Video className="h-4 w-4 text-gold" /></div>
                <button onClick={() => runAsset(asset.id)} disabled={Boolean(running)} className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-md border border-border px-3 py-2 text-xs uppercase tracking-widest disabled:opacity-50">{running === asset.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />} ChatB2K Enrich + Direct Buffer</button>
                {results[asset.id] && <p className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">{results[asset.id].includes("published") || results[asset.id] === "duplicate" ? <CheckCircle2 className="h-3 w-3" /> : <AlertTriangle className="h-3 w-3" />} {results[asset.id]}</p>}
              </div>
            </article>
          ))}
        </section>

        <section className="mt-10 rounded-xl border border-border bg-card p-5">
          <h2 className="text-xs uppercase tracking-widest text-muted-foreground">Canonical publishing queue</h2>
          <div className="mt-4 divide-y divide-border">{queue.data?.map((item) => <div key={item.id} className="flex flex-col gap-2 py-3 sm:flex-row sm:items-center sm:justify-between"><div><p className="text-sm">{item.title || "Untitled"}</p><p className="text-xs text-muted-foreground">{item.status} · {new Date(item.created_at).toLocaleString()}</p></div><span className="text-[10px] uppercase tracking-widest text-gold">{item.buffer_post_ids?.length ? "Buffer IDs recorded" : "Awaiting Buffer"}</span></div>)}</div>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
