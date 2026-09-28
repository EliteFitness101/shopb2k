import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

type Creator = {
  creator_username?: string;
  creator_nickname?: string;
  creator_avatar_url?: string;
  privacy_level_options?: string[];
};

export const Route = createFileRoute("/tiktok")({
  component: TikTokIntegrationPage,
});

function TikTokIntegrationPage() {
  const [sessionToken, setSessionToken] = useState("");
  const [creator, setCreator] = useState<Creator | null>(null);
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
      if (params.get("tiktok") === "connected") setStatus("TikTok connected. Query creator information before posting.");
      if (params.get("tiktok") === "error") setStatus("TikTok connection failed: " + (params.get("message") ?? "unknown error"));
    })();
  }, []);

  async function connect() {
    if (!sessionToken) return;
    setStatus("Opening TikTok authorization…");
    const response = await fetch("/api/auth/tiktok/start?return_to=/tiktok", {
      headers: { Authorization: "Bearer " + sessionToken },
    });
    if (!response.ok) {
      setStatus((await response.json().catch(() => ({})))?.error ?? "Unable to start TikTok authorization.");
      return;
    }
    window.location.assign(response.url);
  }

  async function loadCreator() {
    setStatus("Loading TikTok creator settings…");
    const response = await fetch("/api/tiktok/creator-info", {
      method: "POST",
      headers: { Authorization: "Bearer " + sessionToken },
    });
    const body = await response.json().catch(() => ({}));
    if (!response.ok) {
      setStatus(body.error ?? "Unable to load creator settings.");
      return;
    }
    const nextCreator = body.creator as Creator;
    setCreator(nextCreator);
    setPrivacyLevel(nextCreator.privacy_level_options?.[0] ?? "");
    setStatus("Creator settings loaded.");
  }

  async function directPost() {
    if (!sessionToken || !consent) return;
    setStatus("Submitting Direct Post to TikTok…");
    const response = await fetch("/api/tiktok/direct-post", {
      method: "POST",
      headers: {
        Authorization: "Bearer " + sessionToken,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        userConsent: consent,
        title,
        mediaUrl,
        privacyLevel,
        brandOrganicToggle: true,
        isAigc: false,
      }),
    });
    const body = await response.json().catch(() => ({}));
    if (!response.ok) {
      setStatus(body.error ?? "Direct Post failed.");
      return;
    }
    setPublishId(body.publishId ?? "");
    setStatus("TikTok accepted the Direct Post request.");
  }

  return (
    <main className="mx-auto min-h-screen max-w-3xl px-4 py-10">
      <div className="rounded-2xl border bg-background p-6 shadow-sm">
        <p className="text-sm font-medium text-muted-foreground">ResoFit native TikTok</p>
        <h1 className="mt-2 text-3xl font-bold">TikTok Direct Post</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Login Kit + Content Posting API integration for authorized ResoFit creators.
        </p>
        <div className="mt-6 space-y-4">
          <p className="rounded-lg bg-muted p-3 text-sm">{status}</p>
          {!creator ? (
            <div className="flex flex-wrap gap-3">
              <button type="button" onClick={connect} disabled={!sessionToken} className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-50">
                Connect TikTok
              </button>
              <button type="button" onClick={loadCreator} disabled={!sessionToken} className="rounded-lg border px-4 py-2 text-sm font-semibold disabled:opacity-50">
                Check Existing Connection
              </button>
            </div>
          ) : (
            <>
              <div className="rounded-lg border p-3">
                <div className="font-semibold">{creator.creator_nickname ?? creator.creator_username ?? "TikTok creator"}</div>
                <div className="text-xs text-muted-foreground">@{creator.creator_username ?? "connected"}</div>
              </div>
              <label className="block text-sm font-medium">
                Caption
                <textarea value={title} onChange={(event) => setTitle(event.target.value)} maxLength={2200} className="mt-1 min-h-24 w-full rounded-lg border bg-background p-3" />
              </label>
              <label className="block text-sm font-medium">
                Verified ResoFit video URL
                <input value={mediaUrl} onChange={(event) => setMediaUrl(event.target.value)} placeholder="https://resofit.fit/…/video.mp4" className="mt-1 w-full rounded-lg border bg-background p-3" />
              </label>
              <label className="block text-sm font-medium">
                Privacy
                <select value={privacyLevel} onChange={(event) => setPrivacyLevel(event.target.value)} className="mt-1 w-full rounded-lg border bg-background p-3">
                  {(creator.privacy_level_options ?? []).map((option) => <option key={option} value={option}>{option}</option>)}
                </select>
              </label>
              <label className="flex items-start gap-2 text-sm">
                <input type="checkbox" checked={consent} onChange={(event) => setConsent(event.target.checked)} className="mt-1" />
                <span>I explicitly authorize ResoFit to send this video to my TikTok account.</span>
              </label>
              <button type="button" onClick={directPost} disabled={!consent || !mediaUrl} className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-50">
                Direct Post to TikTok
              </button>
              {publishId ? <p className="text-xs text-muted-foreground">Publish ID: {publishId}</p> : null}
            </>
          )}
        </div>
      </div>
    </main>
  );
}
