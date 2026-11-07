import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { toast } from "sonner";
import {
  Loader2,
  ShieldAlert,
  Users,
  Trophy,
  Coins,
  Activity,
  Gamepad2,
  Sparkles,
  CheckCircle2,
  XCircle,
  RefreshCw,
} from "lucide-react";

export const Route = createFileRoute("/admin")({
  head: () => ({
    meta: [
      { title: "Admin — ResoFit" },
      { name: "description", content: "ResoFit operator dashboard." },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: AdminPage,
});

function AdminPage() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);

  useEffect(() => {
    if (!loading && !user) navigate({ to: "/auth" });
  }, [loading, user, navigate]);

  useEffect(() => {
    if (!user) return;
    supabase
      .rpc("has_role", { _user_id: user.id, _role: "admin" })
      .then(({ data }) => setIsAdmin(Boolean(data)));
  }, [user]);

  if (loading || isAdmin === null) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-background">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="min-h-dvh bg-background">
        <SiteHeader />
        <main className="mx-auto max-w-2xl px-6 py-24 text-center">
          <ShieldAlert className="mx-auto h-10 w-10 text-gold" />
          <h1 className="mt-4 font-display text-4xl">Admin only</h1>
          <p className="mt-3 text-sm text-muted-foreground">
            You need the admin role to view this page. Contact CoachB2K™ if you believe this is an
            error.
          </p>
          <Link to="/" className="mt-8 inline-block text-xs uppercase tracking-widest text-gold">
            ← Home
          </Link>
        </main>
        <SiteFooter />
      </div>
    );
  }

  return <AdminDashboard />;
}

function AdminDashboard() {
  const stats = useQuery({
    queryKey: ["admin", "overview"],
    queryFn: async () => {
      const [profiles, matches, achievements, activity, games, wellness] = await Promise.all([
        supabase.from("profiles").select("id", { count: "exact", head: true }),
        supabase.from("game_results").select("id", { count: "exact", head: true }),
        supabase.from("achievement_unlocks").select("id", { count: "exact", head: true }),
        supabase.from("activity_feed").select("id", { count: "exact", head: true }),
        supabase.from("games").select("id", { count: "exact", head: true }),
        supabase.from("wellness_bonus_events").select("id", { count: "exact", head: true }),
      ]);
      return {
        players: profiles.count ?? 0,
        matches: matches.count ?? 0,
        achievements: achievements.count ?? 0,
        activity: activity.count ?? 0,
        games: games.count ?? 0,
        wellness: wellness.count ?? 0,
      };
    },
  });

  const top = useQuery({
    queryKey: ["admin", "top-players"],
    queryFn: async () => {
      const { data } = await supabase
        .from("profiles")
        .select("id, display_name, xp, reso_coins, level")
        .order("xp", { ascending: false })
        .limit(10);
      return data ?? [];
    },
  });

  const recent = useQuery({
    queryKey: ["admin", "recent-activity"],
    queryFn: async () => {
      const { data } = await supabase
        .from("activity_feed")
        .select("id, kind, payload, created_at")
        .order("created_at", { ascending: false })
        .limit(20);
      return data ?? [];
    },
  });

  const s = stats.data;

  return (
    <div className="min-h-dvh bg-background">
      <SiteHeader />
      <main className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
        <div className="flex items-center gap-2 text-[10px] uppercase tracking-widest text-gold">
          <Sparkles className="h-3 w-3" /> Operator dashboard
        </div>
        <h1 className="mt-2 font-display text-4xl">ResoFit Admin</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Community, play, wellness and governed payment review.
        </p>

        <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          <StatCard icon={Users} label="Players" value={s?.players} />
          <StatCard icon={Gamepad2} label="Games" value={s?.games} />
          <StatCard icon={Trophy} label="Matches" value={s?.matches} />
          <StatCard icon={Coins} label="Achievements" value={s?.achievements} />
          <StatCard icon={Activity} label="Activity" value={s?.activity} />
          <StatCard icon={Sparkles} label="Wellness events" value={s?.wellness} />
        </div>

        <BankTransferReviewQueue />

        <div className="mt-10 grid gap-6 lg:grid-cols-2">
          <section className="rounded-lg border border-border bg-card p-5">
            <h2 className="mb-4 text-xs uppercase tracking-widest text-muted-foreground">
              Top players by XP
            </h2>
            {top.data && top.data.length > 0 ? (
              <ol className="space-y-2 text-sm">
                {top.data.map((p, i) => (
                  <li
                    key={p.id}
                    className="flex items-center justify-between border-b border-border/60 pb-2 last:border-0"
                  >
                    <span className="flex items-center gap-3">
                      <span className="w-5 text-xs text-muted-foreground">{i + 1}</span>
                      <span>{p.display_name ?? "Anonymous"}</span>
                      <span className="text-xs text-muted-foreground">Lv {p.level}</span>
                    </span>
                    <span className="flex items-center gap-3 text-xs">
                      <span className="text-gold">{p.xp} XP</span>
                      <span className="text-muted-foreground">{p.reso_coins} RC</span>
                    </span>
                  </li>
                ))}
              </ol>
            ) : (
              <p className="text-sm text-muted-foreground">No players yet.</p>
            )}
          </section>

          <section className="rounded-lg border border-border bg-card p-5">
            <h2 className="mb-4 text-xs uppercase tracking-widest text-muted-foreground">
              Recent activity
            </h2>
            {recent.data && recent.data.length > 0 ? (
              <ul className="space-y-2 text-sm">
                {recent.data.map((a) => (
                  <li
                    key={a.id}
                    className="flex items-center justify-between border-b border-border/60 pb-2 last:border-0"
                  >
                    <span className="text-foreground">{a.kind}</span>
                    <span className="text-xs text-muted-foreground">
                      {new Date(a.created_at).toLocaleString()}
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-muted-foreground">No activity yet.</p>
            )}
          </section>
        </div>

        <p className="mt-10 text-xs text-muted-foreground">
          Commerce, inventory, payments, and revenue state are governed by the canonical ResoFit
          backend. This dashboard focuses on community, play, and wellness engagement.
        </p>
      </main>
      <SiteFooter />
    </div>
  );
}

type BankTransferRequest = {
  id: string;
  order_reference: string;
  user_id: string | null;
  customer_name: string | null;
  customer_email: string | null;
  customer_phone: string | null;
  amount_ngn: number;
  method: string;
  account_id: string;
  evidence_url: string | null;
  customer_note: string | null;
  product_sku: string | null;
  status: string;
  review_note: string | null;
  created_at: string;
};

function BankTransferReviewQueue() {
  const queryClient = useQueryClient();
  const [reviewNotes, setReviewNotes] = useState<Record<string, string>>({});
  const queue = useQuery({
    queryKey: ["admin", "bank-transfer-review-queue"],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke("resofit-bank-transfer-review", {
        body: { action: "list" },
      });
      if (error) throw error;
      if (data?.ok !== true) throw new Error(data?.error ?? "Review queue unavailable.");
      return (data.requests ?? []) as BankTransferRequest[];
    },
  });

  const review = useMutation({
    mutationFn: async (input: { requestId: string; action: "approve" | "reject"; reviewNote: string }) => {
      const { data, error } = await supabase.functions.invoke("resofit-bank-transfer-review", {
        body: {
          action: input.action,
          request_id: input.requestId,
          review_note: input.reviewNote.trim(),
        },
      });
      if (error) throw error;
      if (data?.ok !== true) throw new Error(data?.error ?? "Payment review failed.");
      return data.review;
    },
    onSuccess: (_data, input) => {
      toast.success(
        input.action === "approve"
          ? "Payment verified. Service fulfillment and entitlement triggers have run."
          : "Bank transfer request rejected.",
      );
      queryClient.invalidateQueries({ queryKey: ["admin", "bank-transfer-review-queue"] });
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "Payment review failed.");
    },
  });

  return (
    <section className="mt-10 rounded-xl border border-gold/25 bg-card p-5 sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 text-xs uppercase tracking-widest text-gold">
            <ShieldAlert className="h-4 w-4" /> Governed payment review
          </div>
          <h2 className="mt-2 font-display text-2xl">Bank transfer verification</h2>
          <p className="mt-2 max-w-2xl text-xs leading-5 text-muted-foreground">
            Verify cleared funds against the bank statement before approving. Approval atomically records
            the payment and triggers the configured service fulfillment and entitlement.
          </p>
        </div>
        <button
          type="button"
          onClick={() => void queue.refetch()}
          disabled={queue.isFetching}
          className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-border px-3 text-xs font-semibold text-muted-foreground hover:border-gold/50 hover:text-foreground disabled:opacity-50"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${queue.isFetching ? "animate-spin" : ""}`} />
          Refresh queue
        </button>
      </div>

      {queue.isLoading ? (
        <div className="mt-6 flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading pending transfers…
        </div>
      ) : queue.isError ? (
        <p className="mt-6 rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
          {queue.error instanceof Error ? queue.error.message : "Unable to load payment review queue."}
        </p>
      ) : queue.data?.length ? (
        <div className="mt-6 space-y-4">
          {queue.data.map((request) => {
            const busy = review.isPending && review.variables?.requestId === request.id;
            const note = reviewNotes[request.id] ?? "";
            return (
              <article key={request.id} className="rounded-xl border border-border/70 bg-background/60 p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-semibold">{request.customer_name || "Customer"}</p>
                    <p className="mt-1 break-all text-xs text-muted-foreground">{request.customer_email || "No email supplied"}</p>
                    <p className="mt-2 font-mono text-[11px] text-gold">{request.order_reference}</p>
                    <p className="mt-1 text-xs text-muted-foreground">{request.product_sku || "SKU missing"} · {request.customer_phone || "No phone"}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-display text-2xl text-gold">₦{Number(request.amount_ngn).toLocaleString("en-NG")}</p>
                    <p className="mt-1 text-[10px] uppercase tracking-widest text-muted-foreground">
                      {new Date(request.created_at).toLocaleString()}
                    </p>
                  </div>
                </div>

                <div className="mt-3 rounded-lg border border-border/60 p-3 text-xs">
                  <p className="text-muted-foreground">{request.customer_note || "No transfer reference supplied."}</p>
                  {request.evidence_url ? (
                    <a
                      href={request.evidence_url}
                      target="_blank"
                      rel="noreferrer"
                      className="mt-2 inline-block font-semibold text-gold underline"
                    >
                      Open transfer receipt
                    </a>
                  ) : (
                    <p className="mt-2 text-amber-400">No receipt attached — verify the credit directly in the bank statement.</p>
                  )}
                </div>

                <label className="mt-3 block text-xs">
                  Verification / rejection note (required)
                  <input
                    value={note}
                    onChange={(event) => setReviewNotes((current) => ({ ...current, [request.id]: event.target.value }))}
                    maxLength={1000}
                    placeholder="e.g. Confirmed cleared credit in Union Bank statement"
                    className="mt-1.5 h-11 w-full rounded-lg border border-border bg-card px-3 text-sm outline-none focus:border-gold"
                  />
                </label>
                <div className="mt-3 flex flex-wrap gap-2">
                  <button
                    type="button"
                    disabled={review.isPending || note.trim().length < 8}
                    onClick={() => review.mutate({ requestId: request.id, action: "approve", reviewNote: note })}
                    className="inline-flex min-h-10 items-center gap-2 rounded-lg bg-gold px-4 text-xs font-semibold text-black hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    {busy && review.variables?.action === "approve" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle2 className="h-3.5 w-3.5" />}
                    Approve & activate access
                  </button>
                  <button
                    type="button"
                    disabled={review.isPending || note.trim().length < 8}
                    onClick={() => review.mutate({ requestId: request.id, action: "reject", reviewNote: note })}
                    className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-border px-4 text-xs font-semibold text-muted-foreground hover:border-destructive/50 hover:text-destructive disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    {busy && review.variables?.action === "reject" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <XCircle className="h-3.5 w-3.5" />}
                    Reject request
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      ) : (
        <p className="mt-6 rounded-lg border border-border/60 p-4 text-sm text-muted-foreground">
          No bank transfers are awaiting review.
        </p>
      )}
    </section>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Users;
  label: string;
  value: number | undefined;
}) {
  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <div className="flex items-center gap-2 text-xs uppercase tracking-widest text-muted-foreground">
        <Icon className="h-4 w-4 text-gold" /> {label}
      </div>
      <p className="mt-2 font-display text-3xl">{value ?? "—"}</p>
    </div>
  );
}
