import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import {
  Loader2,
  ShieldAlert,
  Users,
  Trophy,
  Coins,
  Activity,
  Gamepad2,
  Sparkles,
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
          Overview of community, play, and wellness engagement. Read-only.
        </p>

        <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          <StatCard icon={Users} label="Players" value={s?.players} />
          <StatCard icon={Gamepad2} label="Games" value={s?.games} />
          <StatCard icon={Trophy} label="Matches" value={s?.matches} />
          <StatCard icon={Coins} label="Achievements" value={s?.achievements} />
          <StatCard icon={Activity} label="Activity" value={s?.activity} />
          <StatCard icon={Sparkles} label="Wellness events" value={s?.wellness} />
        </div>

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
