import { useEffect, useRef, useState } from "react";
import { useNavigate, useRouter } from "@tanstack/react-router";
import { Volume2, VolumeX, Play, Pause } from "lucide-react";
import { track } from "@/lib/tracking";
import { createIdentity, handoffToChatB2K, type IdentityChannel } from "@/lib/identity";
import { CTA } from "@/lib/ctas";
import heroImg from "@/assets/hero-barbell.jpg";

const DEFAULT_POSTER = "/assets/resofit-community-poster.webp";
const DEFAULT_VIDEO = "/assets/resofit-community-intro.mp4";
const DEFAULT_CAPTIONS = "/assets/resofit-community-intro.vtt";

// Four cinematic phases — 0–2 / 2–4 / 4–6 / 6–8 seconds.
// Poster-first (no LCP hit); optional muted video enhancement on idle.
const PHASES = [
  {
    kicker: "Trust · Authority",
    headline: "Your wellness journey deserves a personalized system.",
    sub: "Trusted Nigerian wellness platform — strength, longevity, nutrition, mobility.",
  },
  {
    kicker: "Community · Belonging",
    headline: "Built for every stage of life.",
    sub: "Young adults · Professionals · Parents · Active seniors — everyone seeking healthier living.",
  },
  {
    kicker: "Personalization · ChatB2K™",
    headline: "Your personalized wellness guide.",
    sub: "Assessment · Nutrition · Movement · Progress — matched to how you live.",
  },
  {
    kicker: "Action",
    headline: "Start living stronger, calmer, more confident.",
    sub: "One decision. A journey personalized in under 60 seconds.",
  },
] as const;

const PHASE_MS = 2000;

function useReducedMotion() {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    if (typeof window === "undefined") return;
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduced(mq.matches);
    const on = () => setReduced(mq.matches);
    mq.addEventListener?.("change", on);
    return () => mq.removeEventListener?.("change", on);
  }, []);
  return reduced;
}

interface IdentityGateProps {
  open: boolean;
  onClose: () => void;
  onComplete: () => void;
}

function IdentityGate({ open, onClose, onComplete }: IdentityGateProps) {
  const [channel, setChannel] = useState<IdentityChannel>("email");
  const [handle, setHandle] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const firstFieldRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (open) {
      track("identity_started", { channel });
      // Focus after mount for keyboard users
      requestAnimationFrame(() => firstFieldRef.current?.focus());
    }
  }, [open, channel]);

  if (!open) return null;

  const label =
    channel === "email"
      ? "Email address"
      : channel === "phone"
        ? "Phone (WhatsApp)"
        : channel === "telegram"
          ? "Telegram handle"
          : "Google email";

  const placeholder =
    channel === "email"
      ? "you@domain.com"
      : channel === "phone"
        ? "+234 800 000 0000"
        : channel === "telegram"
          ? "@yourhandle"
          : "you@gmail.com";

  const router = useRouter();
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!handle.trim() || submitting) return;
    setSubmitting(true);
    createIdentity(channel, handle);
    // Preload /personalize before handoff for instant mobile navigation.
    try {
      await router.preloadRoute({ to: "/personalize" });
    } catch {
      /* preload best-effort */
    }
    handoffToChatB2K("personalized_journey");
    onComplete();
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="identity-title"
      className="fixed inset-0 z-[80] flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-md rounded-md border border-gold/30 bg-background p-6 shadow-gold"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="absolute right-3 top-3 text-muted-foreground hover:text-foreground focus-visible:outline-2 focus-visible:outline-gold"
        >
          ✕
        </button>
        <p className="text-[10px] uppercase tracking-[0.3em] text-gold">ChatB2K™</p>
        <h3 id="identity-title" className="mt-2 font-display text-2xl leading-tight">
          One quick handshake, then your plan.
        </h3>
        <p className="mt-1 text-sm text-muted-foreground">
          No long signup. Just how ChatB2K™ should reach you.
        </p>

        <div className="mt-5 flex flex-wrap gap-2">
          {(["email", "phone", "telegram", "google"] as IdentityChannel[]).map((c) => (
            <button
              type="button"
              key={c}
              onClick={() => setChannel(c)}
              aria-pressed={channel === c}
              className={`rounded-sm border px-3 py-1.5 text-[11px] uppercase tracking-widest transition-colors focus-visible:outline-2 focus-visible:outline-gold ${
                channel === c
                  ? "border-gold bg-gold/10 text-gold"
                  : "border-border text-muted-foreground hover:text-foreground"
              }`}
            >
              {c === "google" ? "Google" : c.charAt(0).toUpperCase() + c.slice(1)}
            </button>
          ))}
        </div>

        <form onSubmit={handleSubmit} className="mt-5 space-y-3">
          <label className="block">
            <span className="mb-1 block text-xs uppercase tracking-widest text-muted-foreground">
              {label}
            </span>
            <input
              ref={firstFieldRef}
              type={channel === "phone" ? "tel" : "text"}
              inputMode={channel === "phone" ? "tel" : channel === "email" || channel === "google" ? "email" : "text"}
              autoComplete={channel === "phone" ? "tel" : "email"}
              required
              value={handle}
              onChange={(e) => setHandle(e.target.value)}
              placeholder={placeholder}
              className="w-full rounded-sm border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-gold focus-visible:outline-2 focus-visible:outline-gold"
            />
          </label>
          <button
            type="submit"
            disabled={submitting || !handle.trim()}
            className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-sm bg-gold text-sm font-semibold uppercase tracking-widest text-gold-foreground shadow-gold transition-transform hover:-translate-y-0.5 disabled:opacity-60 focus-visible:outline-2 focus-visible:outline-gold"
          >
            {submitting ? "Handing off…" : "Continue to ChatB2K™"}
            <span>→</span>
          </button>
          <p className="text-[11px] leading-relaxed text-muted-foreground">
            We use this only to personalize your plan. No spam. Unsubscribe anytime.
          </p>
        </form>
      </div>
    </div>
  );
}

interface Props {
  /** Optional video enhancement URL (mp4/webm). Loaded on idle only. */
  videoSrc?: string;
  posterSrc?: string;
}

export function CinematicWellnessExperience({ videoSrc, posterSrc }: Props) {
  const navigate = useNavigate();
  const reducedMotion = useReducedMotion();
  const [phase, setPhase] = useState(0);
  const [videoReady, setVideoReady] = useState(false);
  const [showGate, setShowGate] = useState(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const sectionRef = useRef<HTMLElement | null>(null);
  const viewFiredRef = useRef(false);

  // View tracking + phase progression
  useEffect(() => {
    if (!sectionRef.current) return;
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting && !viewFiredRef.current) {
            viewFiredRef.current = true;
            track("cinematic_view");
          }
        });
      },
      { threshold: 0.4 },
    );
    io.observe(sectionRef.current);
    return () => io.disconnect();
  }, []);

  useEffect(() => {
    if (reducedMotion) {
      setPhase(3);
      return;
    }
    const id = window.setInterval(() => {
      setPhase((p) => {
        if (p >= PHASES.length - 1) {
          window.clearInterval(id);
          track("cinematic_complete");
          return p;
        }
        return p + 1;
      });
    }, PHASE_MS);
    return () => window.clearInterval(id);
  }, [reducedMotion]);

  // Idle-load video enhancement — never blocks LCP.
  useEffect(() => {
    if (!videoSrc || reducedMotion) return;
    const idle: any =
      (window as any).requestIdleCallback ??
      ((cb: () => void) => window.setTimeout(cb, 1200));
    const handle = idle(() => setVideoReady(true));
    return () => {
      const cancel: any =
        (window as any).cancelIdleCallback ?? window.clearTimeout;
      cancel(handle);
    };
  }, [videoSrc, reducedMotion]);

  useEffect(() => {
    if (videoReady && videoRef.current) {
      videoRef.current.play().then(() => track("cinematic_play")).catch(() => {});
    }
  }, [videoReady]);

  const openGate = () => {
    track("cinematic_cta_click", { phase });
    setShowGate(true);
  };

  const onIdentityComplete = () => {
    setShowGate(false);
    navigate({ to: "/personalize" });
  };

  const active = PHASES[phase];

  return (
    <section
      ref={sectionRef}
      aria-label="ResoFit cinematic wellness introduction"
      className="relative isolate overflow-hidden border-b border-border/60 bg-background"
    >
      {/* Background layer: poster image (LCP-safe) + optional idle video */}
      <div className="absolute inset-0">
        <img
          src={posterSrc ?? heroImg}
          alt=""
          aria-hidden="true"
          width={1536}
          height={1280}
          fetchPriority="high"
          decoding="async"
          className="h-full w-full object-cover opacity-60"
        />
        {videoReady && videoSrc && (
          <video
            ref={videoRef}
            src={videoSrc}
            poster={posterSrc}
            muted
            playsInline
            loop
            autoPlay
            preload="none"
            aria-hidden="true"
            className="absolute inset-0 h-full w-full object-cover opacity-70"
            onEnded={() => track("cinematic_complete")}
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-r from-background via-background/75 to-background/10" />
        <div className="absolute inset-0 bg-gradient-to-t from-background via-transparent to-background/40" />
      </div>

      {/* Phase indicator (accessible timeline) */}
      <div
        className="absolute left-1/2 top-6 z-10 flex -translate-x-1/2 gap-2"
        role="tablist"
        aria-label="Cinematic chapters"
      >
        {PHASES.map((p, i) => (
          <button
            key={i}
            type="button"
            role="tab"
            aria-selected={phase === i}
            aria-label={`Chapter ${i + 1}: ${p.kicker}`}
            onClick={() => setPhase(i)}
            className={`h-1 rounded-full transition-all focus-visible:outline-2 focus-visible:outline-gold ${
              phase >= i ? "w-10 bg-gold" : "w-6 bg-border"
            }`}
          />
        ))}
      </div>

      <div className="relative mx-auto flex min-h-[80vh] max-w-7xl items-center px-6 py-24">
        <div key={phase} className="max-w-2xl animate-fade-in">
          <p className="mb-5 inline-flex items-center gap-3 text-[11px] uppercase tracking-[0.3em] text-gold">
            <span className="h-px w-10 bg-gold" />
            {active.kicker}
          </p>
          <h1 className="font-display text-5xl leading-[0.98] sm:text-6xl md:text-7xl lg:text-8xl">
            {active.headline}
          </h1>
          <p className="mt-6 max-w-xl text-base leading-relaxed text-muted-foreground sm:text-lg">
            {active.sub}
          </p>
          <div className="mt-10 flex flex-wrap items-center gap-4">
            <button
              type="button"
              onClick={openGate}
              className="group inline-flex h-14 items-center justify-center gap-3 rounded-sm bg-gold px-8 text-sm font-semibold uppercase tracking-widest text-gold-foreground shadow-gold transition-transform hover:-translate-y-0.5 focus-visible:outline-2 focus-visible:outline-gold"
            >
              Start My Personalized Journey
              <span className="transition-transform group-hover:translate-x-1">→</span>
            </button>
            <button
              type="button"
              onClick={() => {
                track("cinematic_cta_click", { phase, cta: "meet_chatb2k" });
                setShowGate(true);
              }}
              className="inline-flex h-14 items-center justify-center rounded-sm border border-border px-8 text-sm font-semibold uppercase tracking-widest text-foreground transition-colors hover:border-gold hover:text-gold focus-visible:outline-2 focus-visible:outline-gold"
            >
              Meet ChatB2K™
            </button>
          </div>
          <p className="mt-6 text-[11px] uppercase tracking-[0.25em] text-muted-foreground">
            {CTA.assessment} · 60 seconds · No spam
          </p>
        </div>
      </div>

      <IdentityGate open={showGate} onClose={() => setShowGate(false)} onComplete={onIdentityComplete} />
    </section>
  );
}
