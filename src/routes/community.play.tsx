import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { track } from "@/lib/tracking";
import type { Game, Profile } from "@/lib/play";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { Coins, Flame, Sparkles, Trophy, Users, Zap } from "lucide-react";

export const Route = createFileRoute("/community/play")({
  head: () => ({
    meta: [
      { title: "ResoFit Play — Games, XP & Rewards" },
      { name: "description", content: "Play wellness trivia, chess, and more. Earn XP, ResoCoins, and unlock rewards on ResoFit's community play layer." },
      { property: "og:title", content: "ResoFit Play — Games, XP & Rewards" },
      { property: "og:description", content: "Wellness-powered games with XP, ResoCoins, tournaments, and leaderboards." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: PlayHome,
});

function PlayHome() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    track("play_home_view" as any);
  }, []);

  useEffect(() => {
    if (!loading && !user) navigate({ to: "/auth" });
  }, [loading, user, navigate]);

  const games = useQuery({
    queryKey: ["play", "games"],
    queryFn: async () => {
      const { data, error } = await supabase.from("games").select("*").order("sort_order");
      if (error) throw error;
      return data as Game[];
    },
  });

  const profile = useQuery({
    queryKey: ["play", "profile", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, display_name, avatar_url, xp, reso_coins, level")
        .eq("id", user!.id)
        .maybeSingle();
      if (error) throw error;
      return data as Profile | null;
    },
  });

  const leaderboard = useQuery({
    queryKey: ["play", "leaderboard"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, display_name, avatar_url, xp, level")
        .order("xp", { ascending: false })
        .limit(5);
      if (error) throw error;
      return data as Pick<Profile, "id" | "display_name" | "avatar_url" | "xp" | "level">[];
    },
  });

  const recent = useQuery({
    queryKey: ["play", "activity"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("activity_feed")
        .select("id, kind, payload, created_at")
        .order("created_at", { ascending: false })
        .limit(6);
      if (error) throw error;
      return data ?? [];
    },
  });

  if (loading || !user) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-background text-sm text-muted-foreground">
        Loading Play…
      </div>
    );
  }

  const displayName = profile.data?.display_name ?? user.email?.split("@")[0] ?? "Player";
  const xp = profile.data?.xp ?? 0;
  const coins = profile.data?.reso_coins ?? 0;
  const level = profile.data?.level ?? 1;
  const nextLevelXp = level * 500;
  const progress = Math.min(100, Math.round(((xp % 500) / 500) * 100));

  async function signOut() {
    await supabase.auth.signOut();
    navigate({ to: "/" });
  }

  return (
    <div className="min-h-dvh bg-background">
      <SiteHeader />
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
        {/* Season banner */}
        <section className="mb-6 overflow-hidden rounded-lg border border-gold/40 bg-gradient-to-r from-black via-black/80 to-gold/10 p-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <Avatar
                url={profile.data?.avatar_url}
                name={displayName}
                className="h-14 w-14 text-base"
              />
              <div>
                <p className="text-[10px] uppercase tracking-widest text-gold">Season 1 · Wellness Rising</p>
                <h1 className="mt-2 font-display text-3xl sm:text-4xl">
                  Welcome back, <span className="text-gold">{displayName}</span>
                </h1>
                <p className="mt-1 text-sm text-muted-foreground">Play, move, and earn — every session counts.</p>
              </div>
            </div>
            <button
              onClick={signOut}
              className="rounded-sm border border-border px-3 py-1.5 text-xs uppercase tracking-widest text-muted-foreground hover:text-foreground"
            >
              Sign out
            </button>
          </div>
        </section>

        {/* Stats row */}
        <section className="mb-8 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <StatCard icon={<Zap className="h-4 w-4 text-gold" />} label="XP" value={xp.toLocaleString()} sub={`Level ${level}`} />
          <StatCard icon={<Coins className="h-4 w-4 text-gold" />} label="ResoCoins" value={coins.toLocaleString()} />
          <StatCard icon={<Flame className="h-4 w-4 text-gold" />} label="Streak" value="—" sub="Play daily" />
          <StatCard icon={<Trophy className="h-4 w-4 text-gold" />} label="Rank" value="—" sub="Play to rank" />
        </section>

        {/* XP progress */}
        <section className="mb-8 rounded-lg border border-border bg-card p-4">
          <div className="flex items-center justify-between text-xs">
            <span className="uppercase tracking-widest text-muted-foreground">Level {level} → {level + 1}</span>
            <span className="text-muted-foreground">{xp % 500} / 500 XP</span>
          </div>
          <div className="mt-2 h-2 overflow-hidden rounded-full bg-muted">
            <div className="h-full bg-gold transition-all" style={{ width: `${progress}%` }} />
          </div>
        </section>

        <div className="grid gap-8 lg:grid-cols-3">
          {/* Games catalog */}
          <section className="lg:col-span-2">
            <div className="mb-4 flex items-baseline justify-between">
              <h2 className="font-display text-2xl">Featured Games</h2>
              <span className="text-xs uppercase tracking-widest text-muted-foreground">Phase 1</span>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              {games.data?.map((g) => <GameCard key={g.id} game={g} />)}
              {games.isLoading && (
                <>
                  <SkeletonCard />
                  <SkeletonCard />
                </>
              )}
            </div>

            {/* Daily challenge */}
            <div className="mt-8 rounded-lg border border-border bg-card p-6">
              <div className="flex items-center gap-2 text-[10px] uppercase tracking-widest text-gold">
                <Sparkles className="h-3 w-3" /> Daily Wellness Challenge
              </div>
              <h3 className="mt-2 font-display text-xl">Answer 5 trivia questions today</h3>
              <p className="mt-1 text-sm text-muted-foreground">Complete for 2× XP and a mystery ResoCoin bonus.</p>
              <Link
                to="/community/play/$game"
                params={{ game: "trivia" }}
                className="mt-4 inline-flex items-center rounded-sm bg-gold px-4 py-2 text-xs font-semibold uppercase tracking-widest text-gold-foreground"
              >
                Start challenge
              </Link>
            </div>
          </section>

          {/* Side rail: leaderboard + activity */}
          <aside className="space-y-6">
            <div className="rounded-lg border border-border bg-card p-4">
              <h3 className="flex items-center gap-2 font-display text-lg">
                <Trophy className="h-4 w-4 text-gold" /> Leaderboard
              </h3>
              <ol className="mt-4 space-y-2 text-sm">
                {leaderboard.data?.map((p, i) => (
                  <li key={p.id} className="flex items-center justify-between border-b border-border/50 pb-2 last:border-0">
                    <span className="flex items-center gap-2">
                      <span className="w-5 text-xs text-muted-foreground">{i + 1}</span>
                      <Avatar url={p.avatar_url} name={p.display_name ?? "Anonymous"} />
                      <span>{p.display_name ?? "Anonymous"}</span>
                    </span>
                    <span className="text-xs text-gold">{p.xp} XP</span>
                  </li>
                ))}
                {(!leaderboard.data || leaderboard.data.length === 0) && (
                  <li className="text-xs text-muted-foreground">Be the first to score.</li>
                )}
              </ol>
            </div>

            <div className="rounded-lg border border-border bg-card p-4">
              <h3 className="flex items-center gap-2 font-display text-lg">
                <Users className="h-4 w-4 text-gold" /> Recent Activity
              </h3>
              <ul className="mt-4 space-y-2 text-xs text-muted-foreground">
                {recent.data?.map((a) => (
                  <li key={a.id}>
                    <span className="text-foreground">{a.kind.replace(/_/g, " ")}</span>{" "}
                    · {new Date(a.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                  </li>
                ))}
                {(!recent.data || recent.data.length === 0) && <li>No activity yet — play to fill this feed.</li>}
              </ul>
            </div>
          </aside>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}

function StatCard({ icon, label, value, sub }: { icon: React.ReactNode; label: string; value: string; sub?: string }) {
  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <div className="flex items-center gap-2 text-[10px] uppercase tracking-widest text-muted-foreground">
        {icon} {label}
      </div>
      <div className="mt-2 font-display text-2xl">{value}</div>
      {sub && <div className="mt-0.5 text-[10px] text-muted-foreground">{sub}</div>}
    </div>
  );
}

function GameCard({ game }: { game: Game }) {
  const live = game.status === "live";
  const inner = (
    <div className={`group relative flex h-full flex-col justify-between rounded-lg border p-5 transition ${live ? "border-border bg-card hover:border-gold/60 hover:bg-card/80" : "border-border/50 bg-card/40"}`}>
      <div>
        <div className="flex items-center justify-between text-[10px] uppercase tracking-widest">
          <span className="text-gold">{game.category}</span>
          <span className={live ? "text-emerald-400" : "text-muted-foreground"}>{live ? "Live" : "Coming soon"}</span>
        </div>
        <h3 className="mt-3 font-display text-2xl">{game.name}</h3>
        <p className="mt-1 text-sm text-muted-foreground">{game.description}</p>
      </div>
      <div className="mt-6 text-[11px] uppercase tracking-widest text-muted-foreground">
        {game.min_players === game.max_players
          ? `${game.min_players} player${game.min_players > 1 ? "s" : ""}`
          : `${game.min_players}–${game.max_players} players`}
      </div>
    </div>
  );
  if (!live) return <div aria-disabled className="opacity-60">{inner}</div>;
  return (
    <Link
      to="/community/play/$game"
      params={{ game: game.slug }}
      onClick={() => track("game_selected" as any, { game: game.slug })}
    >
      {inner}
    </Link>
  );
}

function SkeletonCard() {
  return <div className="h-40 animate-pulse rounded-lg border border-border/40 bg-card/40" />;
}
