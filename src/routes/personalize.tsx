import { absoluteUrl } from "@/platform/routes";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import {
  ArrowRight,
  Check,
  Copy,
  Crown,
  Loader2,
  MessageCircle,
  Sparkles,
  Lock,
} from "lucide-react";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { ProductImage } from "@/components/ProductImage";
import {
  PRODUCT_BY_HANDLE_QUERY,
  approxUSD,
  formatMoney,
  storefrontApiRequest,
  type ShopifyProductNode,
} from "@/lib/shopify";
import { useCartStore } from "@/stores/cartStore";
import { trackEvent } from "@/lib/revenueOS";

export const Route = createFileRoute("/personalize")({
  component: PersonalizePage,
  head: () => ({
    meta: [
      { title: "ChatB2K Assessment — ResoFit" },
      {
        name: "description",
        content:
          "Take the ChatB2K Assessment and receive a personalized ResoFit bundle tailored to your goal, activity, and diet.",
      },
      { property: "og:title", content: "ChatB2K Assessment — ResoFit" },
      {
        property: "og:description",
        content: "A premium, personalized wellness recommendation in under a minute.",
      },
      { property: "og:type", content: "website" },
      { property: "og:url", content: absoluteUrl("/personalize") },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [{ rel: "canonical", href: absoluteUrl("/personalize") }],
  }),
});

const WEBHOOK_URL = "https://hook.eu1.make.com/p0c26asklninfrxhp2sw6nkdjjb19a89";
const WHATSAPP_NUMBER = "2348132255842";
const ELITE_WA_URL = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(
  "Hi CoachB2K, I'd like to upgrade to Elite Coaching.",
)}`;

type Step = 0 | 1 | 2 | 3;

interface Answers {
  goal: string;
  activity: string;
  diet: string;
}

interface WebhookProduct {
  handle?: string;
  variant_id?: string;
  variantId?: string;
  title?: string;
  image?: string;
  price?: string;
  reason?: string;
}

interface WebhookResponse {
  title?: string;
  summary?: string;
  reason?: string;
  reasoning?: string;
  product?: WebhookProduct;
  bundle?: WebhookProduct[];
  products?: WebhookProduct[];
  recommendation?: WebhookProduct | WebhookProduct[];
}

const GOALS = [
  { value: "fat_loss", label: "Lose body fat" },
  { value: "muscle", label: "Build lean muscle" },
  { value: "energy", label: "More energy & focus" },
  { value: "reset", label: "Full reset & detox" },
];
const ACTIVITIES = [
  { value: "low", label: "Sedentary (desk work)" },
  { value: "moderate", label: "Active 2–4×/week" },
  { value: "high", label: "Athletic / daily training" },
];
const DIETS = [
  { value: "omnivore", label: "Omnivore" },
  { value: "pescatarian", label: "Pescatarian" },
  { value: "vegetarian", label: "Vegetarian" },
  { value: "vegan", label: "Vegan" },
];

function getAnonId(): string {
  if (typeof window === "undefined") return "anon";
  let id = localStorage.getItem("resofit:anon_id");
  if (!id) {
    id = `anon_${(crypto as any).randomUUID?.() ?? Date.now().toString(36)}`;
    localStorage.setItem("resofit:anon_id", id);
  }
  return id;
}

function normalizeProducts(res: WebhookResponse): WebhookProduct[] {
  const list: WebhookProduct[] = [];
  if (Array.isArray(res.bundle)) list.push(...res.bundle);
  if (Array.isArray(res.products)) list.push(...res.products);
  if (Array.isArray(res.recommendation)) list.push(...res.recommendation);
  if (res.product) list.push(res.product);
  if (res.recommendation && !Array.isArray(res.recommendation)) list.push(res.recommendation);
  const seen = new Set<string>();
  return list.filter((p) => {
    const key = p.handle ?? p.variant_id ?? p.variantId ?? p.title ?? "";
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function PersonalizePage() {
  const [step, setStep] = useState<Step>(0);
  const [answers, setAnswers] = useState<Answers>({ goal: "", activity: "", diet: "" });
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<WebhookResponse | null>(null);
  const [revealed, setRevealed] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const progress = useMemo(() => (step / 3) * 100, [step]);

  const submit = async (final: Answers) => {
    setLoading(true);
    setError(null);
    trackEvent("assessment_click");
    try {
      const res = await fetch(WEBHOOK_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          anon_id: getAnonId(),
          source: "resofit.fit/personalize",
          submittedAt: new Date().toISOString(),
          ...final,
        }),
      });
      const text = await res.text();
      let parsed: WebhookResponse = {};
      try {
        parsed = text ? (JSON.parse(text) as WebhookResponse) : {};
      } catch {
        parsed = { summary: text };
      }
      setResult(parsed);
      setStep(3);
    } catch (e: any) {
      setError(e?.message ?? "Network error");
      toast.error("Couldn't reach the assessment service. Try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <main className="mx-auto max-w-3xl px-6 py-12">
        <header className="mb-8 text-center">
          <p className="text-xs uppercase tracking-[0.3em] text-gold">ChatB2K Assessment</p>
          <h1 className="mt-3 font-display text-4xl leading-tight md:text-5xl">
            Your personalized <span className="text-gold">ResoFit</span> protocol
          </h1>
          <p className="mt-3 text-sm text-muted-foreground">
            3 questions · 60 seconds · AI-matched bundle from CoachB2K
          </p>
        </header>

        {step < 3 && (
          <div className="mb-6 h-1 w-full overflow-hidden rounded-full bg-border/40">
            <div
              className="h-full bg-gold transition-all duration-500"
              style={{ width: `${progress}%` }}
            />
          </div>
        )}

        {step === 0 && (
          <StepCard
            title="What's your primary goal?"
            options={GOALS}
            value={answers.goal}
            onSelect={(v) => {
              setAnswers((a) => ({ ...a, goal: v }));
              setStep(1);
            }}
          />
        )}
        {step === 1 && (
          <StepCard
            title="How active are you right now?"
            options={ACTIVITIES}
            value={answers.activity}
            onSelect={(v) => {
              setAnswers((a) => ({ ...a, activity: v }));
              setStep(2);
            }}
            onBack={() => setStep(0)}
          />
        )}
        {step === 2 && (
          <StepCard
            title="Which best describes your diet?"
            options={DIETS}
            value={answers.diet}
            onSelect={(v) => {
              const next = { ...answers, diet: v };
              setAnswers(next);
              submit(next);
            }}
            onBack={() => setStep(1)}
            loading={loading}
          />
        )}

        {step === 3 && (
          <ResultView
            result={result}
            error={error}
            revealed={revealed}
            onReveal={() => setRevealed(true)}
            onRestart={() => {
              setStep(0);
              setResult(null);
              setRevealed(false);
              setAnswers({ goal: "", activity: "", diet: "" });
            }}
            answers={answers}
          />
        )}
      </main>
      <SiteFooter />
    </div>
  );
}

function StepCard({
  title,
  options,
  value,
  onSelect,
  onBack,
  loading,
}: {
  title: string;
  options: Array<{ value: string; label: string }>;
  value: string;
  onSelect: (v: string) => void;
  onBack?: () => void;
  loading?: boolean;
}) {
  return (
    <section className="rounded-lg border border-border/60 bg-card/40 p-6 md:p-8">
      <h2 className="font-display text-2xl md:text-3xl">{title}</h2>
      <div className="mt-6 grid gap-3">
        {options.map((o) => (
          <button
            key={o.value}
            type="button"
            disabled={loading}
            onClick={() => onSelect(o.value)}
            className={`group flex items-center justify-between rounded-md border px-5 py-4 text-left transition-colors ${
              value === o.value
                ? "border-gold bg-gold/10 text-foreground"
                : "border-border hover:border-gold/60 hover:bg-card"
            } disabled:opacity-50`}
          >
            <span className="text-sm md:text-base">{o.label}</span>
            <ArrowRight className="h-4 w-4 text-muted-foreground transition-transform group-hover:translate-x-1 group-hover:text-gold" />
          </button>
        ))}
      </div>
      <div className="mt-6 flex items-center justify-between">
        {onBack ? (
          <button
            type="button"
            onClick={onBack}
            className="text-xs uppercase tracking-widest text-muted-foreground hover:text-foreground"
            disabled={loading}
          >
            ← Back
          </button>
        ) : (
          <span />
        )}
        {loading && (
          <span className="flex items-center gap-2 text-xs uppercase tracking-widest text-gold">
            <Loader2 className="h-3 w-3 animate-spin" /> Matching your protocol…
          </span>
        )}
      </div>
    </section>
  );
}

function ResultView({
  result,
  error,
  revealed,
  onReveal,
  onRestart,
  answers,
}: {
  result: WebhookResponse | null;
  error: string | null;
  revealed: boolean;
  onReveal: () => void;
  onRestart: () => void;
  answers: Answers;
}) {
  const products = result ? normalizeProducts(result) : [];
  const summary =
    result?.summary ??
    result?.reason ??
    result?.reasoning ??
    "Your personalized bundle is matched to your goal, activity, and diet.";
  const title = result?.title ?? "Your ResoFit Protocol";

  const copy = async () => {
    const lines = [
      `ResoFit Protocol — ${title}`,
      `Goal: ${answers.goal} · Activity: ${answers.activity} · Diet: ${answers.diet}`,
      "",
      summary,
      "",
      ...products.map((p) => `• ${p.title ?? p.handle ?? "Recommended item"}`),
    ];
    try {
      await navigator.clipboard.writeText(lines.join("\n"));
      toast.success("Copied to clipboard");
    } catch {
      toast.error("Couldn't copy");
    }
  };

  if (error && !result) {
    return (
      <section className="rounded-lg border border-destructive/50 bg-destructive/5 p-8 text-center">
        <p className="text-sm text-destructive">{error}</p>
        <button
          onClick={onRestart}
          className="mt-4 text-xs uppercase tracking-widest text-foreground underline"
        >
          Try again
        </button>
      </section>
    );
  }

  return (
    <article className="relative overflow-hidden rounded-xl border border-gold/40 bg-gradient-to-b from-black via-black to-black/80 p-6 text-foreground shadow-2xl shadow-gold/10 md:p-10">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-[10px] uppercase tracking-[0.3em] text-gold">CoachB2K Result</p>
          <h2 className="mt-2 font-display text-3xl text-gold md:text-4xl">{title}</h2>
        </div>
        <button
          type="button"
          onClick={copy}
          aria-label="Copy result"
          className="rounded-md border border-gold/40 p-2 text-gold transition-colors hover:bg-gold/10"
        >
          <Copy className="h-4 w-4" />
        </button>
      </div>

      <div className="relative mt-6">
        <div
          className={`space-y-6 transition-all duration-500 ${
            revealed ? "blur-0" : "pointer-events-none select-none blur-md"
          }`}
          aria-hidden={!revealed}
        >
          <p className="text-sm leading-relaxed text-muted-foreground md:text-base">{summary}</p>

          {products.length > 0 ? (
            <div className="grid gap-4 sm:grid-cols-2">
              {products.map((p, i) => (
                <BundleCard
                  key={(p.handle ?? p.variant_id ?? p.title ?? i).toString()}
                  product={p}
                  index={i}
                />
              ))}
            </div>
          ) : (
            <div className="rounded-md border border-border/60 bg-card/40 p-5 text-sm text-muted-foreground">
              Your CoachB2K bundle is being curated. Browse the{" "}
              <Link to="/shop" className="text-gold underline">
                shop
              </Link>{" "}
              while we finalize your protocol.
            </div>
          )}
        </div>

        {!revealed && (
          <button
            type="button"
            onClick={onReveal}
            className="absolute inset-0 flex flex-col items-center justify-center gap-3 rounded-md bg-black/30 backdrop-blur-sm"
          >
            <span className="flex items-center gap-2 rounded-full border border-gold bg-gold px-6 py-3 text-xs font-semibold uppercase tracking-widest text-gold-foreground shadow-lg shadow-gold/30">
              <Lock className="h-3.5 w-3.5" /> Reveal my protocol
            </span>
            <span className="flex items-center gap-1 text-[11px] uppercase tracking-widest text-white/80">
              <Sparkles className="h-3 w-3 text-gold" /> Curated for you
            </span>
          </button>
        )}
      </div>

      <div className="mt-8 flex flex-wrap items-center gap-3 border-t border-border/40 pt-6">
        <a
          href={`https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(
            `Hi CoachB2K, I just completed the assessment (${answers.goal}/${answers.activity}/${answers.diet}). Can you help me choose?`,
          )}`}
          target="_blank"
          rel="noopener noreferrer"
          onClick={() => trackEvent("whatsapp_click")}
          className="inline-flex items-center gap-2 rounded-sm bg-[#25D366] px-5 py-3 text-xs font-semibold uppercase tracking-widest text-white hover:opacity-90"
        >
          <MessageCircle className="h-4 w-4" /> Ask an Expert
        </a>
        <button
          type="button"
          onClick={onRestart}
          className="text-xs uppercase tracking-widest text-muted-foreground hover:text-foreground"
        >
          Retake assessment
        </button>
      </div>

      <a
        href={ELITE_WA_URL}
        target="_blank"
        rel="noopener noreferrer"
        onClick={() => trackEvent("whatsapp_click")}
        className="mt-8 flex items-center justify-between gap-4 rounded-lg border border-gold/40 bg-gradient-to-r from-gold/10 via-transparent to-gold/10 p-5 transition-colors hover:from-gold/20 hover:to-gold/20"
      >
        <div className="flex items-center gap-3">
          <Crown className="h-5 w-5 text-gold" />
          <div>
            <p className="text-sm font-semibold text-foreground">Upgrade to Elite Coaching</p>
            <p className="text-xs text-muted-foreground">
              1:1 with CoachB2K · custom programming · concierge access
            </p>
          </div>
        </div>
        <ArrowRight className="h-4 w-4 text-gold" />
      </a>
    </article>
  );
}

function BundleCard({ product, index }: { product: WebhookProduct; index: number }) {
  const handle = product.handle;
  const [resolved, setResolved] = useState<ShopifyProductNode | null>(null);
  const [adding, setAdding] = useState(false);
  const addItem = useCartStore((s) => s.addItem);

  useEffect(() => {
    let cancelled = false;
    if (!handle) return;
    storefrontApiRequest<{ product: ShopifyProductNode | null }>(PRODUCT_BY_HANDLE_QUERY, {
      handle,
    })
      .then((res) => {
        if (!cancelled && res?.data?.product) setResolved(res.data.product);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [handle]);

  const variantId =
    product.variant_id ??
    product.variantId ??
    resolved?.variants.edges.find((e) => e.node.availableForSale)?.node.id ??
    resolved?.variants.edges[0]?.node.id;

  const variant = resolved?.variants.edges.find((e) => e.node.id === variantId)?.node;
  const price = variant?.price;
  const imageUrl = resolved?.images.edges[0]?.node.url ?? product.image;
  const title = resolved?.title ?? product.title ?? handle ?? "Recommended item";

  const handleAdd = async () => {
    if (!resolved || !variantId || !variant) {
      toast.error("This item isn't available right now");
      return;
    }
    setAdding(true);
    try {
      await addItem({
        product: {
          id: resolved.id,
          title: resolved.title,
          handle: resolved.handle,
          images: resolved.images,
        },
        variantId,
        variantTitle: variant.title,
        price: variant.price,
        quantity: 1,
        selectedOptions: variant.selectedOptions,
      });
      trackEvent("checkout_start");
      toast.success(`Added ${title} to cart`, { position: "top-center" });
    } finally {
      setAdding(false);
    }
  };

  return (
    <div className="overflow-hidden rounded-lg border border-border/60 bg-card/40">
      <ProductImage
        src={imageUrl}
        alt={title}
        title={title}
        productId={resolved?.id}
        priority={index === 0}
        tier={index === 0 ? "high" : "medium"}
      />
      <div className="space-y-2 p-4">
        <p className="line-clamp-2 text-sm font-medium text-foreground">{title}</p>
        {price ? (
          <p className="text-xs uppercase tracking-widest text-gold">
            {formatMoney(price)} · ≈ {approxUSD(price)}
          </p>
        ) : (
          <p className="text-xs uppercase tracking-widest text-muted-foreground">Curated pick</p>
        )}
        {product.reason && (
          <p className="text-xs leading-relaxed text-muted-foreground">{product.reason}</p>
        )}
        <div className="flex items-center gap-2 pt-2">
          <button
            type="button"
            onClick={handleAdd}
            disabled={adding || !resolved}
            className="inline-flex flex-1 items-center justify-center gap-2 rounded-sm bg-gold px-3 py-2 text-[11px] font-semibold uppercase tracking-widest text-gold-foreground hover:bg-gold/90 disabled:opacity-50"
          >
            {adding ? (
              <Loader2 className="h-3 w-3 animate-spin" />
            ) : (
              <>
                <Check className="h-3 w-3" /> Add to cart
              </>
            )}
          </button>
          {handle && (
            <Link
              to="/product/$handle"
              params={{ handle }}
              className="rounded-sm border border-border px-3 py-2 text-[11px] uppercase tracking-widest text-muted-foreground hover:border-gold/60 hover:text-foreground"
            >
              View
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}
