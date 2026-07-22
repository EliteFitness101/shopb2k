import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { track } from "@/lib/tracking";
import { toast } from "sonner";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { CheckCircle2, XCircle, Sparkles } from "lucide-react";

export const Route = createFileRoute("/community/play/$game")({
  head: ({ params }) => ({
    meta: [
      { title: `${cap(params.game)} — ResoFit Play` },
      { name: "description", content: `Play ${cap(params.game)} on ResoFit Play. Earn XP and ResoCoins.` },
      { property: "og:title", content: `${cap(params.game)} — ResoFit Play` },
      { property: "og:description", content: `Play ${cap(params.game)} — earn XP and ResoCoins on ResoFit.` },
    ],
  }),
  component: GamePage,
});

function cap(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

interface TriviaQ {
  id: string;
  question: string;
  choices: string[];
  correct_index: number;
  explanation: string | null;
  category: string;
}

const ROUND_SIZE = 5;

function GamePage() {
  const { game } = Route.useParams();
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && !user) navigate({ to: "/auth" });
  }, [loading, user, navigate]);

  if (loading || !user) {
    return <div className="flex min-h-dvh items-center justify-center bg-background text-sm text-muted-foreground">Loading…</div>;
  }

  return (
    <div className="min-h-dvh bg-background">
      <SiteHeader />
      <main className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
        <Link to="/community/play" className="text-xs uppercase tracking-widest text-muted-foreground hover:text-foreground">
          ← Play
        </Link>
        {game === "trivia" ? <Trivia userId={user.id} /> : <ComingSoon slug={game} />}
      </main>
      <SiteFooter />
    </div>
  );
}

function ComingSoon({ slug }: { slug: string }) {
  return (
    <div className="mt-8 rounded-lg border border-border bg-card p-8 text-center">
      <h1 className="font-display text-3xl">{cap(slug)}</h1>
      <p className="mt-2 text-sm text-muted-foreground">Coming soon. ChatB2K™ is training the coach.</p>
    </div>
  );
}

function Trivia({ userId }: { userId: string }) {
  const [phase, setPhase] = useState<"idle" | "playing" | "review" | "done">("idle");
  const [index, setIndex] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [correctCount, setCorrectCount] = useState(0);
  const [startedAt, setStartedAt] = useState<number>(0);

  const round = useQuery({
    queryKey: ["trivia", "round", phase],
    enabled: phase === "playing",
    queryFn: async () => {
      const { data, error } = await supabase
        .from("trivia_questions")
        .select("id, question, choices, correct_index, explanation, category")
        .eq("active", true)
        .limit(50);
      if (error) throw error;
      const shuffled = [...(data ?? [])].sort(() => Math.random() - 0.5).slice(0, ROUND_SIZE);
      return shuffled as unknown as TriviaQ[];
    },
  });

  const questions = useMemo(() => round.data ?? [], [round.data]);
  const current = questions[index];

  function start() {
    setPhase("playing");
    setIndex(0);
    setCorrectCount(0);
    setSelected(null);
    setStartedAt(Date.now());
    track("match_started" as any, { game: "trivia" });
  }

  function choose(i: number) {
    if (selected !== null) return;
    setSelected(i);
    if (i === current.correct_index) setCorrectCount((c) => c + 1);
    setPhase("review");
  }

  function next() {
    if (index + 1 < questions.length) {
      setIndex(index + 1);
      setSelected(null);
      setPhase("playing");
    } else {
      finish();
    }
  }

  async function finish() {
    setPhase("done");
    const duration = Math.round((Date.now() - startedAt) / 1000);
    const perfect = correctCount === questions.length;
    const xp = correctCount * 20 + (perfect ? 100 : 0);
    const coins = correctCount * 5 + (perfect ? 50 : 0);

    try {
      await supabase.from("game_results").insert({
        user_id: userId,
        game_slug: "trivia",
        score: correctCount,
        duration_seconds: duration,
        metadata: { total: questions.length, perfect },
      });
      const { error: rpcErr } = await supabase.rpc("award_xp_coins", { _xp: xp, _coins: coins });
      if (rpcErr) throw rpcErr;
      await supabase.from("activity_feed").insert({
        user_id: userId,
        kind: "match_finished",
        payload: { game: "trivia", score: correctCount, total: questions.length, xp, coins },
      });
      // Achievement checks
      if (correctCount >= 5) await tryUnlock(userId, "trivia_5");
      if (perfect) await tryUnlock(userId, "trivia_perfect");
      await tryUnlock(userId, "first_match");

      track("match_finished" as any, { game: "trivia", score: correctCount, xp, coins, duration });
      toast.success(`+${xp} XP · +${coins} ResoCoins`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not save your score");
    }
  }

  if (phase === "idle") {
    return (
      <div className="mt-6 rounded-lg border border-gold/40 bg-card p-6">
        <div className="flex items-center gap-2 text-[10px] uppercase tracking-widest text-gold">
          <Sparkles className="h-3 w-3" /> Wellness Trivia
        </div>
        <h1 className="mt-2 font-display text-4xl">5-question sprint</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Nutrition · Movement · Recovery · Longevity. Earn 20 XP per correct answer, +100 XP for a perfect round.
        </p>
        <button onClick={start} className="mt-6 rounded-sm bg-gold px-6 py-3 text-xs font-semibold uppercase tracking-widest text-gold-foreground">
          Start round
        </button>
      </div>
    );
  }

  if (phase === "done") {
    const perfect = correctCount === questions.length;
    return (
      <div className="mt-6 rounded-lg border border-border bg-card p-6 text-center">
        <div className="text-[10px] uppercase tracking-widest text-gold">Round complete</div>
        <h1 className="mt-2 font-display text-5xl">
          {correctCount}/{questions.length}
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">{perfect ? "Perfect round — legendary." : "Nice run — keep the streak alive."}</p>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <button onClick={start} className="rounded-sm bg-gold px-4 py-2 text-xs font-semibold uppercase tracking-widest text-gold-foreground">
            Play again
          </button>
          <Link to="/community/play" className="rounded-sm border border-border px-4 py-2 text-xs uppercase tracking-widest">
            Back to Play
          </Link>
        </div>
      </div>
    );
  }

  if (round.isLoading || !current) {
    return <div className="mt-8 text-sm text-muted-foreground">Loading question…</div>;
  }

  return (
    <div className="mt-6">
      <div className="mb-3 flex items-center justify-between text-xs text-muted-foreground">
        <span className="uppercase tracking-widest">
          Q {index + 1} / {questions.length}
        </span>
        <span className="uppercase tracking-widest text-gold">{current.category}</span>
      </div>
      <div className="rounded-lg border border-border bg-card p-6">
        <h2 className="font-display text-2xl">{current.question}</h2>
        <div className="mt-6 grid gap-2">
          {current.choices.map((c, i) => {
            const isSelected = selected === i;
            const isCorrect = i === current.correct_index;
            const showState = phase === "review";
            return (
              <button
                key={i}
                onClick={() => choose(i)}
                disabled={selected !== null}
                className={`flex items-center justify-between rounded-sm border px-4 py-3 text-left text-sm transition
                  ${showState && isCorrect ? "border-emerald-500/60 bg-emerald-500/10" : ""}
                  ${showState && isSelected && !isCorrect ? "border-red-500/60 bg-red-500/10" : ""}
                  ${!showState ? "border-border hover:border-gold/60 hover:bg-muted" : "border-border"}
                `}
              >
                <span>{c}</span>
                {showState && isCorrect && <CheckCircle2 className="h-4 w-4 text-emerald-500" />}
                {showState && isSelected && !isCorrect && <XCircle className="h-4 w-4 text-red-500" />}
              </button>
            );
          })}
        </div>
        {phase === "review" && (
          <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-border pt-4 text-sm">
            <p className="text-muted-foreground">{current.explanation}</p>
            <button onClick={next} className="rounded-sm bg-gold px-4 py-2 text-xs font-semibold uppercase tracking-widest text-gold-foreground">
              {index + 1 < questions.length ? "Next" : "Finish"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

async function tryUnlock(userId: string, slug: string) {
  const { error } = await supabase.from("achievement_unlocks").insert({ user_id: userId, achievement_slug: slug });
  if (error && !error.message.includes("duplicate")) return;
  if (!error) {
    track("achievement_unlocked" as any, { slug });
    toast.success(`Achievement unlocked: ${slug}`);
  }
}
