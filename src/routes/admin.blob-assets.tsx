import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Loader2, RefreshCw, Save, ShieldAlert } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";

export const Route = createFileRoute("/admin/blob-assets")({
  head: () => ({
    meta: [
      { title: "Blob Asset Manifest — ResoFit" },
      { name: "description", content: "Admin tagging control for Vercel Blob content assets." },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: BlobAssetsPage,
});

type Item = {
  id: string;
  blob_pathname: string;
  handle: string | null;
  campaign_type: string;
  platform: string | null;
  status: string;
  title: string | null;
  caption: string | null;
  destination: string | null;
  keywords: string[] | null;
  safety_checked: boolean;
  notes: string | null;
};

async function token() {
  const session = await supabase.auth.getSession();
  const accessToken = session.data.session?.access_token;
  if (!accessToken) throw new Error("Sign in required");
  return accessToken;
}

function BlobAssetsPage() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [saving, setSaving] = useState<string | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (!loading && !user) navigate({ to: "/auth" });
  }, [loading, user, navigate]);

  const query = useQuery({
    queryKey: ["admin", "blob-manifest"],
    enabled: Boolean(user),
    queryFn: async () => {
      const response = await fetch("/api/admin/blob-manifest", { headers: { Authorization: `Bearer ${await token()}` } });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error || "Unable to load manifest");
      return body.items as Item[];
    },
  });

  async function save(item: Item) {
    setSaving(item.id);
    setMessage("");
    try {
      const response = await fetch("/api/admin/blob-manifest", {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${await token()}` },
        body: JSON.stringify(item),
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error || "Save failed");
      setMessage(`Saved ${item.blob_pathname}`);
      await query.refetch();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Save failed");
    } finally {
      setSaving(null);
    }
  }

  async function runSync() {
    setSyncing(true);
    setMessage("");
    try {
      const response = await fetch("/api/blob-queue-sync", { headers: { Authorization: `Bearer ${await token()}` } });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error || "Sync failed");
      setMessage(`Sync complete · scanned ${body.scanned} · discovered ${body.discovered} · queued ${body.queued} · unchanged ${body.unchanged}`);
      await query.refetch();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Sync failed");
    } finally {
      setSyncing(false);
    }
  }

  if (loading || !user) return <div className="flex min-h-dvh items-center justify-center"><Loader2 className="h-5 w-5 animate-spin" /></div>;

  const items = query.data ?? [];
  const pending = items.filter((item) => item.status === "pending_review").length;

  return (
    <div className="min-h-dvh bg-background">
      <SiteHeader />
      <main className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
        <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
          <div>
            <div className="text-[10px] uppercase tracking-[0.2em] text-gold">Admin · Blob ingestion</div>
            <h1 className="mt-2 font-display text-4xl">Asset Manifest</h1>
            <p className="mt-2 max-w-3xl text-sm text-muted-foreground">
              Tag Vault and Elite assets once. Nothing outside the deterministic product DAM path is guessed or published without an explicit manifest approval.
            </p>
          </div>
          <button onClick={runSync} disabled={syncing} className="inline-flex items-center justify-center gap-2 rounded-md border border-border bg-card px-4 py-3 text-xs font-semibold uppercase tracking-widest disabled:opacity-50">
            {syncing ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />} Poll Blob
          </button>
        </div>

        <div className="mt-6 flex items-center gap-3 rounded-lg border border-border bg-card p-4 text-xs">
          <ShieldAlert className="h-4 w-4 text-gold" />
          <span><strong>{pending}</strong> assets awaiting explicit review. Approved rows require a platform before they can enter <code>content_queue</code>.</span>
        </div>

        {message && <p className="mt-4 text-xs text-muted-foreground">{message}</p>}
        {query.isLoading && <div className="mt-8 flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Loading manifest…</div>}
        {query.error && <p className="mt-8 text-sm text-destructive">{query.error.message}</p>}

        <div className="mt-8 space-y-4">
          {items.map((original) => (
            <ManifestRow key={original.id} item={original} saving={saving === original.id} onSave={save} />
          ))}
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}

function ManifestRow({ item: initial, saving, onSave }: { item: Item; saving: boolean; onSave: (item: Item) => void }) {
  const [item, setItem] = useState(initial);
  useEffect(() => setItem(initial), [initial]);
  const set = <K extends keyof Item>(key: K, value: Item[K]) => setItem((current) => ({ ...current, [key]: value }));

  return (
    <article className="rounded-xl border border-border bg-card p-4 sm:p-5">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0">
          <code className="break-all text-xs text-muted-foreground">{item.blob_pathname}</code>
          <div className="mt-2 flex flex-wrap gap-2 text-[10px] uppercase tracking-widest">
            <span className="rounded-full border border-border px-2 py-1">{item.status}</span>
            <span className="rounded-full border border-border px-2 py-1">{item.campaign_type}</span>
          </div>
        </div>
        <button onClick={() => onSave(item)} disabled={saving} className="inline-flex items-center justify-center gap-2 rounded-md bg-gold px-4 py-2 text-xs font-semibold uppercase tracking-widest text-black disabled:opacity-50">
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} Save
        </button>
      </div>

      <div className="mt-5 grid gap-3 md:grid-cols-2 lg:grid-cols-4">
        <label className="text-xs">Handle<input value={item.handle ?? ""} onChange={(e) => set("handle", e.target.value || null)} className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2" placeholder="optional product handle" /></label>
        <label className="text-xs">Campaign<select value={item.campaign_type} onChange={(e) => set("campaign_type", e.target.value)} className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2"><option value="brand">brand</option><option value="background">background</option><option value="product">product</option><option value="music">music</option></select></label>
        <label className="text-xs">Platform<select value={item.platform ?? ""} onChange={(e) => set("platform", e.target.value || null)} className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2"><option value="">Pending platform</option><option value="tiktok">TikTok</option><option value="youtube">YouTube</option><option value="google_business">Google Business</option></select></label>
        <label className="text-xs">Status<select value={item.status} onChange={(e) => set("status", e.target.value)} className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2"><option value="pending_review">pending_review</option><option value="approved">approved</option><option value="rejected">rejected</option><option value="ingested">ingested</option></select></label>
      </div>

      <div className="mt-3 grid gap-3 md:grid-cols-2">
        <label className="text-xs">Title<input value={item.title ?? ""} onChange={(e) => set("title", e.target.value || null)} className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2" /></label>
        <label className="text-xs">Destination<input value={item.destination ?? ""} onChange={(e) => set("destination", e.target.value || null)} className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2" placeholder="https://www.resofit.fit" /></label>
      </div>
      <label className="mt-3 block text-xs">Caption<textarea value={item.caption ?? ""} onChange={(e) => set("caption", e.target.value || null)} rows={3} className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2" /></label>
      <label className="mt-3 block text-xs">Notes<textarea value={item.notes ?? ""} onChange={(e) => set("notes", e.target.value || null)} rows={2} className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2" /></label>
      <label className="mt-3 flex items-center gap-2 text-xs"><input type="checkbox" checked={item.safety_checked} onChange={(e) => set("safety_checked", e.target.checked)} /> Safety checked</label>
    </article>
  );
}
