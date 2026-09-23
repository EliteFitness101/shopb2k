import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, Brain, Dumbbell, Leaf, Sparkles, Target, Users, Zap } from "lucide-react";
import heroImg from "@/assets/hero-barbell.jpg";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";

const CANONICAL_ORIGIN = "https://www.resofit.fit";

const STATE = [
  { icon: Dumbbell, label: "Body", text: "Strength, mobility and physical capacity." },
  { icon: Brain, label: "Mind", text: "Clarity, discipline and resilient thinking." },
  { icon: Leaf, label: "Food", text: "Practical nourishment built around real life." },
  { icon: Target, label: "Purpose", text: "Turn personal progress into meaningful action." },
];

const PATHS = [
  { title: "Reset", text: "Discover → Assess → Personalize → Act → Track → Adapt → Resonate.", to: "/me" },
  { title: "ResoFlex™", text: "Train across home, gym, bunker, jungle, travel, hotel and community environments.", to: "/programs" },
  { title: "Resilience Lab", text: "Build practical capacity for bunker, jungle, city, travel and premium-life conditions.", to: "/coach-buchi" },
  { title: "AI-SI Academy", text: "Progress from AI literacy and prompting into research, content, automation and intelligent systems.", to: "/knowledge" },
  { title: "Community XP", text: "Turn learning, habits, participation and contribution into visible progression and rewards.", to: "/community/play" },
  { title: "Stories", text: "Explore journeys through starting state, reset, action, change and next state.", to: "/stories" },
  { title: "Opportunities", text: "Find pathways to train, work, create, earn, volunteer, partner and lead.", to: "/network" },
];

export const Route = createFileRoute("/coach-buchi")({
  head: () => ({
    meta: [
      { title: "Coach Buchi | LordB2K · Resonance Fitness" },
      { name: "description", content: "Coach Buchi, LordB2K and the vision behind Resonance Fitness, ResoFit™ and ResoFlex™ — a premium African wellness, capability and community experience." },
      { property: "og:title", content: "Coach Buchi | LordB2K · Resonance Fitness" },
      { property: "og:description", content: "Reset the human. Build better communities." },
      { property: "og:type", content: "profile" },
      { property: "og:url", content: `${CANONICAL_ORIGIN}/coach-buchi` },
    ],
    links: [{ rel: "canonical", href: `${CANONICAL_ORIGIN}/coach-buchi` }],
  }),
  component: CoachBuchi,
});

function CoachBuchi() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <SiteHeader />

      <main>
        <section className="relative isolate min-h-[88vh] overflow-hidden border-b border-border/60">
          <img src={heroImg} alt="" aria-hidden className="absolute inset-0 h-full w-full object-cover opacity-40" />
          <div className="absolute inset-0 bg-gradient-to-r from-background via-background/85 to-background/35" />
          <div className="absolute inset-0 bg-gradient-to-t from-background via-transparent to-background/20" />

          <div className="relative mx-auto flex min-h-[88vh] max-w-7xl items-end px-6 py-20 sm:py-28">
            <div className="max-w-4xl">
              <div className="mb-7 flex flex-wrap items-center gap-3 text-[11px] uppercase tracking-[0.32em] text-gold">
                <span className="inline-flex items-center gap-2"><Sparkles className="h-3.5 w-3.5" /> LordB2K</span>
                <span className="h-px w-8 bg-gold/60" />
                <span>Coach O. J. Moses</span>
              </div>

              <p className="max-w-xl text-sm uppercase tracking-[0.22em] text-muted-foreground sm:text-base">
                Founder · Resonance Fitness · Architect of the ResoFit™ wellness ecosystem
              </p>

              <h1 className="mt-5 font-display text-6xl leading-[0.88] sm:text-8xl md:text-9xl">
                Reset the
                <br />
                <span className="text-gradient-gold">human.</span>
              </h1>

              <p className="mt-8 max-w-2xl text-base leading-relaxed text-muted-foreground sm:text-lg">
                A premium founder experience connecting wellness, fitness, African lifestyle,
                resilience, community leadership, youth opportunity and AI-SI productivity.
              </p>

              <div className="mt-9 flex flex-wrap gap-3">
                <Link to="/me" className="inline-flex h-13 items-center gap-3 rounded-sm bg-gold px-7 text-xs font-semibold uppercase tracking-[0.2em] text-gold-foreground shadow-gold transition-transform hover:-translate-y-0.5">
                  Begin your reset <ArrowRight className="h-4 w-4" />
                </Link>
                <a href="#vision" className="inline-flex h-13 items-center rounded-sm border border-border px-7 text-xs font-semibold uppercase tracking-[0.2em] text-foreground transition-colors hover:border-gold hover:text-gold">
                  Explore the vision
                </a>
              </div>
            </div>
          </div>
        </section>

        <section id="vision" className="border-b border-border/60 py-20 sm:py-28">
          <div className="mx-auto grid max-w-7xl gap-12 px-6 lg:grid-cols-[0.8fr_1.2fr] lg:gap-24">
            <div>
              <p className="text-xs uppercase tracking-[0.3em] text-gold">The philosophy</p>
              <h2 className="mt-4 font-display text-5xl leading-none sm:text-6xl">Build from the state.</h2>
            </div>
            <div className="space-y-6 text-base leading-relaxed text-muted-foreground sm:text-lg">
              <p>
                The Coach Buchi philosophy begins with the individual state: body, mind, food,
                movement, recovery, habits, productivity, community and purpose.
              </p>
              <p>
                ResoFit™ turns that philosophy into practical experiences. ResoFlex™ gives the
                movement system structure. ChatB2K™ provides an intelligent interface for
                discovery, learning and personalized next actions.
              </p>
              <p>
                The long-range vision is human capability: healthier people, stronger communities,
                practical skills, responsible technology adoption and pathways into meaningful
                opportunity.
              </p>
            </div>
          </div>
        </section>

        <section className="border-b border-border/60 bg-card/20 py-20 sm:py-28">
          <div className="mx-auto max-w-7xl px-6">
            <div className="flex flex-col justify-between gap-5 md:flex-row md:items-end">
              <div>
                <p className="text-xs uppercase tracking-[0.3em] text-gold">The State</p>
                <h2 className="mt-3 font-display text-5xl sm:text-6xl">One human. Many dimensions.</h2>
              </div>
              <p className="max-w-md text-sm leading-relaxed text-muted-foreground">
                A simple interface for a complex human system — designed to keep the next step visible.
              </p>
            </div>

            <div className="mt-12 grid gap-px bg-border/60 sm:grid-cols-2 lg:grid-cols-4">
              {STATE.map(({ icon: Icon, label, text }) => (
                <article key={label} className="group min-h-56 bg-background p-7 transition-colors hover:bg-card">
                  <Icon className="h-6 w-6 text-gold transition-transform group-hover:-translate-y-1" />
                  <h3 className="mt-12 font-display text-2xl">{label}</h3>
                  <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{text}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="border-b border-border/60 py-20 sm:py-28">
          <div className="mx-auto max-w-7xl px-6">
            <div className="max-w-3xl">
              <p className="text-xs uppercase tracking-[0.3em] text-gold">The ecosystem</p>
              <h2 className="mt-4 font-display text-5xl leading-none sm:text-7xl">
                Complex underneath.
                <br />
                <span className="text-gradient-gold">Simple above.</span>
              </h2>
            </div>

            <div className="mt-14 grid gap-4 md:grid-cols-2">
              {PATHS.map((path, index) => (
                <Link key={path.title} to={path.to} className="group rounded-2xl border border-border/70 bg-card/30 p-7 transition-all hover:-translate-y-1 hover:border-gold/50 hover:bg-card">
                  <div className="flex items-start justify-between gap-6">
                    <span className="text-xs uppercase tracking-[0.25em] text-gold">0{index + 1}</span>
                    <ArrowRight className="h-5 w-5 text-muted-foreground transition-transform group-hover:translate-x-1 group-hover:text-gold" />
                  </div>
                  <h3 className="mt-12 font-display text-3xl">{path.title}</h3>
                  <p className="mt-3 max-w-md text-sm leading-relaxed text-muted-foreground">{path.text}</p>
                </Link>
              ))}
            </div>
          </div>
        </section>

        <section id="resilience" className="border-b border-border/60 py-20 sm:py-28">
          <div className="mx-auto max-w-7xl px-6">
            <p className="text-xs uppercase tracking-[0.3em] text-gold">Resilience Lab</p>
            <div className="mt-4 grid gap-10 lg:grid-cols-[0.9fr_1.1fr] lg:items-end">
              <h2 className="font-display text-5xl leading-none sm:text-7xl">Train for real life.</h2>
              <p className="max-w-2xl text-base leading-relaxed text-muted-foreground sm:text-lg">
                Resilience is practiced across contexts: bunker, jungle, city and luxury. The system
                adapts movement, food, recovery and decision-making to the environment rather than
                requiring one fixed lifestyle.
              </p>
            </div>
            <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {[
                ["Bunker", "Minimal-space strength, conditioning and discipline."],
                ["Jungle", "Resource-aware movement, endurance and adaptability."],
                ["City", "Efficient routines for work, commuting and pressure."],
                ["Luxury", "Travel, hotel and private-jet routines without losing the state."],
              ].map(([title, text]) => <div key={title} className="rounded-2xl border border-border/60 bg-card/20 p-6"><h3 className="font-display text-2xl">{title}</h3><p className="mt-3 text-sm leading-relaxed text-muted-foreground">{text}</p></div>)}
            </div>
          </div>
        </section>

        <section id="ai-si" className="border-b border-border/60 py-20 sm:py-28">
          <div className="mx-auto max-w-7xl px-6">
            <p className="text-xs uppercase tracking-[0.3em] text-gold">AI-SI Academy</p>
            <h2 className="mt-4 font-display text-5xl leading-none sm:text-7xl">Learn. Build. Automate. Lead.</h2>
            <div className="mt-12 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {["AI Literacy", "Prompting & Research", "Content & Automation", "Agents & Intelligent Systems"].map((title, i) =>
                <div key={title} className="rounded-2xl border border-border/60 bg-card/20 p-6"><span className="text-xs text-gold">0{i+1}</span><h3 className="mt-8 font-display text-2xl">{title}</h3><p className="mt-3 text-sm text-muted-foreground">Progressive capability building connected to practical wellness, work and business use.</p></div>
              )}
            </div>
            <Link to="/knowledge" className="mt-8 inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-gold">Enter Knowledge Hub <ArrowRight className="h-4 w-4" /></Link>
          </div>
        </section>

        <section id="community-xp" className="border-b border-border/60 bg-card/20 py-20 sm:py-28">
          <div className="mx-auto max-w-7xl px-6">
            <div className="grid gap-12 lg:grid-cols-[1fr_0.9fr]">
              <div>
                <p className="text-xs uppercase tracking-[0.3em] text-gold">Community XP</p>
                <h2 className="mt-4 font-display text-5xl leading-none sm:text-7xl">Progress becomes participation.</h2>
                <p className="mt-7 max-w-2xl text-base leading-relaxed text-muted-foreground sm:text-lg">XP is designed as a participation layer: assessments, workouts, habits, learning, challenges, referrals, events, contributions, youth training and stewardship can become measurable activity.</p>
              </div>
              <div className="space-y-3">
                {["Explorer", "Starter", "Builder", "ResoFlex Member", "Community Builder", "Ambassador"].map((level, i) =>
                  <div key={level} className="flex items-center gap-4 rounded-xl border border-border/60 bg-background p-4"><span className="text-xs text-gold">0{i+1}</span><span className="font-medium">{level}</span><span className="ml-auto text-xs text-muted-foreground">XP progression</span></div>
                )}
              </div>
            </div>
          </div>
        </section>

        <section id="opportunities" className="border-b border-border/60 py-20 sm:py-28">
          <div className="mx-auto max-w-7xl px-6">
            <p className="text-xs uppercase tracking-[0.3em] text-gold">Opportunity Centre</p>
            <h2 className="mt-4 font-display text-5xl leading-none sm:text-7xl">Capability should open doors.</h2>
            <div className="mt-10 flex flex-wrap gap-3">
              {["Train", "Work", "Create", "Earn", "Volunteer", "Partner", "Lead"].map(item => <Link key={item} to="/network" className="rounded-full border border-border/70 px-5 py-3 text-xs uppercase tracking-widest transition-colors hover:border-gold hover:text-gold">{item}</Link>)}
            </div>
          </div>
        </section>

        <section className="border-b border-border/60 bg-black py-20 sm:py-28">
          <div className="mx-auto grid max-w-7xl gap-12 px-6 lg:grid-cols-2 lg:items-center">
            <div>
              <p className="text-xs uppercase tracking-[0.3em] text-gold">AI-SI productivity</p>
              <h2 className="mt-4 font-display text-5xl leading-none sm:text-7xl">
                Technology should
                <br />
                <span className="text-gradient-gold">amplify people.</span>
              </h2>
            </div>
            <div className="rounded-3xl border border-gold/20 bg-background/60 p-8 shadow-2xl backdrop-blur-xl">
              <Zap className="h-7 w-7 text-gold" />
              <p className="mt-6 text-lg leading-relaxed">
                Learn AI-SI progressively: literacy → prompting → research → content →
                automation → business → agents → intelligent systems.
              </p>
              <div className="mt-8 grid grid-cols-2 gap-3 text-xs uppercase tracking-widest text-muted-foreground sm:grid-cols-4">
                {["Learn", "Build", "Automate", "Contribute"].map((item) => (
                  <div key={item} className="rounded-xl border border-border/60 px-3 py-4 text-center">{item}</div>
                ))}
              </div>
              <Link to="/knowledge" className="mt-8 inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-gold hover:text-foreground">
                Enter the knowledge hub <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
        </section>

        <section className="border-b border-border/60 py-20 sm:py-28">
          <div className="mx-auto max-w-7xl px-6">
            <div className="grid gap-12 lg:grid-cols-[1fr_0.8fr]">
              <div>
                <p className="text-xs uppercase tracking-[0.3em] text-gold">Community leadership</p>
                <h2 className="mt-4 font-display text-5xl leading-none sm:text-7xl">
                  Personal progress.
                  <br />
                  <span className="text-gradient-gold">Collective capability.</span>
                </h2>
                <p className="mt-7 max-w-2xl text-base leading-relaxed text-muted-foreground sm:text-lg">
                  The ecosystem is designed to move members from learning and wellness into
                  contribution, opportunity, leadership and stewardship — while keeping the
                  human experience straightforward.
                </p>
              </div>

              <div className="grid gap-3">
                {[
                  ["01", "Assess", "Understand your current state."],
                  ["02", "Act", "Take one practical next step."],
                  ["03", "Learn", "Build capability that compounds."],
                  ["04", "Connect", "Participate in the community."],
                  ["05", "Contribute", "Turn capability into opportunity."],
                ].map(([n, title, text]) => (
                  <div key={n} className="flex items-center gap-5 rounded-2xl border border-border/60 bg-card/20 p-5">
                    <span className="font-display text-2xl text-gold">{n}</span>
                    <div><h3 className="font-display text-xl">{title}</h3><p className="mt-1 text-xs text-muted-foreground">{text}</p></div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="py-24 sm:py-32">
          <div className="mx-auto max-w-4xl px-6 text-center">
            <Users className="mx-auto h-8 w-8 text-gold" />
            <p className="mt-7 text-xs uppercase tracking-[0.3em] text-gold">The next state</p>
            <h2 className="mt-4 font-display text-5xl leading-none sm:text-7xl">
              Your next state
              <br />
              begins here.
            </h2>
            <p className="mx-auto mt-7 max-w-xl text-base leading-relaxed text-muted-foreground">
              Enter the ResoFit experience, discover what matters now and let the ecosystem guide
              you toward a practical next action.
            </p>
            <div className="mt-9 flex flex-wrap justify-center gap-3">
              <Link to="/me" className="inline-flex h-13 items-center gap-3 rounded-sm bg-gold px-8 text-xs font-semibold uppercase tracking-[0.2em] text-gold-foreground shadow-gold hover:-translate-y-0.5">
                Begin your private consultation <ArrowRight className="h-4 w-4" />
              </Link>
              <a href="https://chatb2k.resofit.fit" className="inline-flex h-13 items-center gap-3 rounded-sm border border-border px-8 text-xs font-semibold uppercase tracking-[0.2em] hover:border-gold hover:text-gold">
                Open ChatB2K™
              </a>
            </div>
          </div>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}
