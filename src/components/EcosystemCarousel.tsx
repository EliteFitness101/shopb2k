// Reusable ecosystem carousel — one implementation used everywhere.
// - Native scroll-snap (no libs)
// - Keyboard: ArrowLeft / ArrowRight
// - Auto-scroll unless prefers-reduced-motion
// - Analytics via existing track()
import { Link } from "@tanstack/react-router";
import { useEffect, useRef } from "react";
import { ArrowRight, ChevronLeft, ChevronRight } from "lucide-react";
import { ECOSYSTEM_CARDS, type EcosystemCard } from "@/lib/ecosystem";
import { track } from "@/lib/tracking";
import { cn } from "@/lib/utils";

interface Props {
  eyebrow?: string;
  title?: string;
  cards?: EcosystemCard[];
  autoScroll?: boolean;
  className?: string;
  surface?: string; // where the carousel is placed — used for analytics
}

export function EcosystemCarousel({
  eyebrow = "The ResoFit Ecosystem",
  title = "One platform. Every wellness path.",
  cards = ECOSYSTEM_CARDS,
  autoScroll = true,
  className,
  surface = "unknown",
}: Props) {
  const scrollerRef = useRef<HTMLDivElement>(null);

  const scrollBy = (dir: 1 | -1) => {
    const el = scrollerRef.current;
    if (!el) return;
    const step = Math.min(el.clientWidth * 0.9, 480);
    el.scrollBy({ left: dir * step, behavior: "smooth" });
  };

  useEffect(() => {
    if (!autoScroll) return;
    if (typeof window === "undefined") return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const el = scrollerRef.current;
    if (!el) return;
    let paused = false;
    const onEnter = () => (paused = true);
    const onLeave = () => (paused = false);
    el.addEventListener("mouseenter", onEnter);
    el.addEventListener("mouseleave", onLeave);
    el.addEventListener("touchstart", onEnter, { passive: true });
    const id = window.setInterval(() => {
      if (paused) return;
      const nearEnd = el.scrollLeft + el.clientWidth >= el.scrollWidth - 8;
      if (nearEnd) el.scrollTo({ left: 0, behavior: "smooth" });
      else scrollBy(1);
    }, 5500);
    return () => {
      window.clearInterval(id);
      el.removeEventListener("mouseenter", onEnter);
      el.removeEventListener("mouseleave", onLeave);
      el.removeEventListener("touchstart", onEnter);
    };
  }, [autoScroll]);

  const onKey = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowRight") scrollBy(1);
    if (e.key === "ArrowLeft") scrollBy(-1);
  };

  return (
    <section
      aria-label={title}
      className={cn("border-t border-border/60 py-20", className)}
    >
      <div className="mx-auto max-w-7xl px-6">
        <div className="mb-8 flex items-end justify-between gap-6">
          <div>
            <p className="mb-3 text-xs uppercase tracking-[0.3em] text-gold">{eyebrow}</p>
            <h2 className="font-display text-4xl md:text-5xl">{title}</h2>
          </div>
          <div className="hidden gap-2 md:flex">
            <button
              type="button"
              onClick={() => scrollBy(-1)}
              aria-label="Scroll left"
              className="grid h-11 w-11 place-items-center border border-border/60 text-muted-foreground transition-colors hover:border-gold hover:text-gold focus-visible:outline-2 focus-visible:outline-gold"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => scrollBy(1)}
              aria-label="Scroll right"
              className="grid h-11 w-11 place-items-center border border-border/60 text-muted-foreground transition-colors hover:border-gold hover:text-gold focus-visible:outline-2 focus-visible:outline-gold"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div
          ref={scrollerRef}
          role="region"
          tabIndex={0}
          onKeyDown={onKey}
          aria-label="Ecosystem carousel"
          className="-mx-6 flex snap-x snap-mandatory gap-4 overflow-x-auto scroll-smooth px-6 pb-4 focus-visible:outline-none"
          style={{ scrollbarWidth: "thin" }}
        >
          {cards.map((c, i) => (
            <CarouselCard key={c.id} card={c} placement={i} surface={surface} />
          ))}
        </div>
      </div>
    </section>
  );
}

function CarouselCard({
  card,
  placement,
  surface,
}: {
  card: EcosystemCard;
  placement: number;
  surface: string;
}) {
  const onClick = () => {
    track("product_click", {
      surface: `ecosystem:${surface}`,
      cardId: card.id,
      category: card.category,
      placement,
    });
  };

  const body = (
    <div className="flex h-full min-h-[260px] w-[85vw] max-w-[360px] shrink-0 snap-start flex-col justify-between border border-border/60 bg-card/40 p-6 transition-colors hover:border-gold/60 sm:w-[340px]">
      <div>
        <p className="text-[10px] uppercase tracking-[0.3em] text-gold">{card.category}</p>
        <h3 className="mt-3 font-display text-2xl leading-tight">{card.title}</h3>
        <p className="mt-3 text-sm text-muted-foreground">{card.tagline}</p>
      </div>
      <p className="mt-6 inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-gold">
        {card.cta} <ArrowRight className="h-3.5 w-3.5" />
      </p>
    </div>
  );

  if (card.external) {
    return (
      <a
        href={card.href}
        target="_blank"
        rel="noopener noreferrer"
        onClick={onClick}
        className="focus-visible:outline-2 focus-visible:outline-gold"
      >
        {body}
      </a>
    );
  }
  return (
    <Link
      to={card.href as any}
      onClick={onClick}
      className="focus-visible:outline-2 focus-visible:outline-gold"
    >
      {body}
    </Link>
  );
}
