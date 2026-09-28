import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

type Creator = {
  creator_username?: string;
  creator_nickname?: string;
  creator_avatar_url?: string;
  privacy_level_options?: string[];
};
type Profile = { username?: string; display_name?: string; bio_description?: string; profile_deep_link?: string; is_verified?: boolean };
type Stats = { follower_count?: number; following_count?: number; likes_count?: number; video_count?: number };
type Video = { id?: string; title?: string; video_description?: string; cover_image_url?: string; share_url?: string; embed_link?: string };

export const Route = createFileRoute("/tiktok")({ component: TikTokIntegrationPage });

function TikTokIntegrationPage() {
  const [sessionToken, setSessionToken] = useState("");
  const [creator, setCreator] = useState<Creator | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [stats, setStats] = useState<Stats | null>(null);
  const [videos, setVideos] = useState<Video[]>([]);
  const [title, setTitle] = useState("ResoFit — TikTok Direct Post Test");
  const [mediaUrl, setMediaUrl] = useState("");
  const [privacyLevel, setPrivacyLevel] = useState("");
  const [consent, setConsent] = useState(false);
  const [status, setStatus] = useState("Checking ResoFit authentication…");
  const [publishId, setPublishId] = useState("");

  useEffect(() => {
    void (async () => {
      const { data } = await supabase.auth.getSession();
      const token = data.session?.access_token ?? "";
      setSessionToken(token);
      setStatus(token ? "Ready to connect TikTok." : "Sign in to ResoFit first.");
      const params = new URLSearchParams(window.location.search);
      if (params.get("tiktok") === "connected") setStatus("TikTok connected. Load the creator data below.");
      if (params.get("tiktok") === "error") setStatus("TikTok connection failed: " + (params.get("message") ?? "unknown error"));
    })();
  }, []);

  async function call(path: string, body?: unknown) {
    return fetch(path, {
      method: "POST",
      headers: { Authorization: "Bearer " + sessionToken, ...(body ? { "Content-Type": "application/json" } : {}) },
      ...(body ? { body: JSON.stringify(body) } : {}),
    });
  }

  async function connect() {
    if (!sessionToken) return;
    setStatus("Opening TikTok authorization…");
    const response = await fetch("/api/auth/tiktok/start?return_to=/tiktok", { headers: { Authorization: "Bearer " + sessionToken } });
    const body = await response.json().catch(() => ({}));
    if (!response.ok || !body.authorizationUrl) return setStatus(body.error ?? "Unable to start TikTok authorization.");
    window.location.assign(body.authorizationUrl);
  }

  async function loadAll() {
    setStatus("Loading TikTok profile, statistics and videos…");
    const [creatorResponse, profileResponse, statsResponse, videosResponse] = await Promise.all([
      call("/api/tiktok/creator-info"),
      call("/api/tiktok/profile"),
      call("/api/tiktok/stats"),
      call("/api/tiktok/videos", { maxCount: 20 }),
    ]);
    const [creatorBody, profileBody, statsBody, videosBody] = await Promise.all([
      creatorResponse.json().catch(() => ({})),
      profileResponse.json().catch(() => ({})),
      statsResponse.json().catch(() => ({})),
      videosResponse.json().catch(() => ({})),
    ]);
    if (!creatorResponse.ok) return setStatus(creatorBody.error ?? "Unable to load TikTok creator settings.");
    setCreator(creatorBody.creator as Creator);
    setPrivacyLevel((creatorBody.creator?.privacy_level_options ?? [])[0] ?? "");
    if (profileResponse.ok) setProfile(profileBody.profile ?? null);
    if (statsResponse.ok) setStats(statsBody.stats ?? null);
    if (videosResponse.ok) setVideos(videosBody.videos ?? []);
    setStatus("TikTok account data loaded.");
  }

  async function directPost() {
    if (!sessionToken || !consent) return;
    setStatus("Submitting Direct Post to TikTok…");
    const response = await call("/api/tiktok/direct-post", { userConsent: consent, title, mediaUrl, privacyLevel, brandOrganicToggle: true, isAigc: false });
    const body = await response.json().catch(() => ({}));
    if (!response.ok) return setStatus(body.error ?? "Direct Post failed.");
    setPublishId(body.publishId ?? "");
    setStatus("TikTok accepted the Direct Post request.");
  }

  async function uploadDraft() {
    if (!mediaUrl) return;
    setStatus("Sending video to TikTok drafts…");
    const response = await call("/api/tiktok/upload-draft", { mediaUrl });
    const body = await response.json().catch(() => ({}));
    if (!response.ok) return setStatus(body.error ?? "Draft upload failed.");
    setPublishId(body.publishId ?? "");
    setStatus("TikTok draft upload initialized.");
  }

  return (
    <main className="mx-auto min-h-screen max-w-3xl px-4 py-10">
      <div className="rounded-2xl border bg-background p-6 shadow-sm">
        <p className="text-sm font-medium text-muted-foreground">ResoFit native TikTok</p>
        <h1 className="mt-2 text-3xl font-bold">TikTok Creator Command Center</h1>
        <p className="mt-2 text-sm text-muted-foreground">Login Kit + Content Posting API + creator profile, statistics and video display.</p>
        <div className="mt-6 space-y-4">
          <p className="rounded-lg bg-muted p-3 text-sm">{status}</p>
          {!creator ? (
            <div className="flex flex-wrap gap-3">
              <button type="button" onClick={connect} disabled={!sessionToken} className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-50">Connect TikTok</button>
              <button type="button" onClick={loadAll} disabled={!sessionToken} className="rounded-lg border px-4 py-2 text-sm font-semibold disabled:opacity-50">Load Connected TikTok</button>
            </div>
          ) : (
            <>
              <div className="rounded-lg border p-3">
                <div className="font-semibold">{creator.creator_nickname ?? creator.creator_username ?? "TikTok creator"}</div>
                <div className="text-xs text-muted-foreground">@{creator.creator_username ?? profile?.username ?? "connected"}</div>
              </div>
              {profile ? <div className="rounded-lg border p-3 text-sm"><b>Profile</b><div>{profile.display_name ?? "—"} {profile.is_verified ? "✓" : ""}</div><div className="text-muted-foreground">{profile.bio_description ?? "No bio returned."}</div></div> : null}
              {stats ? <div className="grid grid-cols-2 gap-2 text-sm sm:grid-cols-4">{[["Followers",stats.follower_count],["Following",stats.following_count],["Likes",stats.likes_count],["Videos",stats.video_count]].map(([label,value]) => <div key={String(label)} className="rounded-lg border p-3"><div className="text-muted-foreground">{label}</div><b>{String(value ?? "—")}</b></div>)}</div> : null}
              <div className="rounded-lg border p-3"><b className="text-sm">Public TikTok videos</b><div className="mt-2 space-y-2">{videos.slice(0,5).map((video) => <a key={video.id} href={video.embed_link ?? video.share_url ?? "#"} target="_blank" rel="noreferrer" className="block rounded border p-2 text-sm hover:bg-muted">{video.title || video.video_description || video.id}</a>)}</div></div>
              <label className="block text-sm font-medium">Caption<textarea value={title} onChange={(event) => setTitle(event.target.value)} maxLength={2200} className="mt-1 min-h-24 w-full rounded-lg border bg-background p-3" /></label>
              <label className="block text-sm font-medium">Verified ResoFit video URL<input value={mediaUrl} onChange={(event) => setMediaUrl(event.target.value)} placeholder="https://resofit.fit/…/video.mp4" className="mt-1 w-full rounded-lg border bg-background p-3" /></label>
              <label className="block text-sm font-medium">Privacy<select value={privacyLevel} onChange={(event) => setPrivacyLevel(event.target.value)} className="mt-1 w-full rounded-lg border bg-background p-3">{(creator.privacy_level_options ?? []).map((option) => <option key={option} value={option}>{option}</option>)}</select></label>
              <label className="flex items-start gap-2 text-sm"><input type="checkbox" checked={consent} onChange={(event) => setConsent(event.target.checked)} className="mt-1" /><span>I explicitly authorize ResoFit to send this video to my TikTok account.</span></label>
              <div className="flex flex-wrap gap-3">
                <button type="button" onClick={directPost} disabled={!consent || !mediaUrl} className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-50">Direct Post</button>
                <button type="button" onClick={uploadDraft} disabled={!mediaUrl} className="rounded-lg border px-4 py-2 text-sm font-semibold disabled:opacity-50">Upload as Draft</button>
              </div>
              {publishId ? <p className="text-xs text-muted-foreground">Publish ID: {publishId}</p> : null}
            </>
          )}
        </div>
      </div>
    </main>
  );
}
