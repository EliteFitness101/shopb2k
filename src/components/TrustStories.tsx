import { Link } from "@tanstack/react-router";
import heroImg from "@/assets/hero-barbell.jpg";
import productDumbbell from "@/assets/product-dumbbell.jpg";
import productRack from "@/assets/product-rack.jpg";

type Story = {
  label: string;
  title: string;
  body: string;
  image: string;
  alt: string;
};

const stories: Story[] = [
  {
    label: "Built for consistency",
    title: "A wellness system designed around real life.",
    body: "ResoFit brings assessment, personalized programs, premium equipment and ongoing guidance into one ecosystem — so the next step is always clear.",
    image: heroImg,
    alt: "Premium strength training environment with an Olympic barbell",
  },
  {
    label: "ResoFlex equipment",
    title: "Premium training tools without the guesswork.",
    body: "From strength and mobility to recovery and home training, the ResoFlex catalogue is organized around practical outcomes rather than isolated products.",
    image: productDumbbell,
    alt: "Premium ResoFlex-style dumbbell equipment",
  },
  {
    label: "Ecosystem authority",
    title: "One platform. Multiple wellness paths.",
    body: "Programs, equipment, coaching, wellness intelligence and community experiences are connected so members can progress without rebuilding their journey from scratch.",
    image: productRack,
    alt: "Premium training rack in a modern fitness environment",
  },
];

export function TrustStories({ compact = false }: { compact?: boolean }) {
  return (
    <section className="border-t border-border/60 bg-card/20 py-24" aria-labelledby="trust-stories-title">
      <div className="mx-auto max-w-7xl px-6">
        <div className="max-w-3xl">
          <p className="mb-3 text-xs uppercase tracking-[0.3em] text-gold">Trust & Authority</p>
          <h2 id="trust-stories-title" className="font-display text-4xl md:text-6xl">Proof should feel as premium as the experience.</h2>
          <p className="mt-5 text-sm leading-7 text-muted-foreground md:text-base">
            We do not manufacture customer quotes or attach invented identities to stock photography. Verified member stories are published as evidence becomes available; until then, this section uses transparent ecosystem proof and premium brand imagery.
          </p>
        </div>

        <div className="mt-12 grid gap-px bg-border/50 md:grid-cols-3">
          {stories.map((story) => (
            <article key={story.label} className="group overflow-hidden bg-background">
              <div className="relative aspect-[4/3] overflow-hidden">
                <img src={story.image} alt={story.alt} width={1200} height={900} loading="lazy" decoding="async" className="h-full w-full object-cover transition duration-700 group-hover:scale-105" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/10 to-transparent" />
                <p className="absolute bottom-5 left-5 text-[10px] font-semibold uppercase tracking-[0.25em] text-white/80">{story.label}</p>
              </div>
              <div className="p-7">
                <h3 className="font-display text-2xl leading-tight">{story.title}</h3>
                <p className="mt-4 text-sm leading-6 text-muted-foreground">{story.body}</p>
              </div>
            </article>
          ))}
        </div>

        {!compact && (
          <div className="mt-10 flex flex-wrap items-center justify-between gap-5 border-t border-border/60 pt-8">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.25em] text-gold">Verified member stories</p>
              <p className="mt-2 text-sm text-muted-foreground">Only authenticated, approved stories should be presented as testimonials.</p>
            </div>
            <Link to="/stories" className="inline-flex h-12 items-center rounded-sm border border-border px-6 text-xs font-semibold uppercase tracking-widest transition-colors hover:border-gold hover:text-gold">Explore Stories →</Link>
          </div>
        )}
      </div>
    </section>
  );
}
