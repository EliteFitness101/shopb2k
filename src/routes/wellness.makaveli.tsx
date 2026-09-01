import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ArrowRight, MapPin, MessageCircle, Phone } from "lucide-react";
import { SiteFooter } from "@/components/SiteFooter";
import { SiteHeader } from "@/components/SiteHeader";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string | undefined;
const WELLNESS_VIDEO = "https://ab2ttlkn9no0tuoa.public.blob.vercel-storage.com/buffer/assets/wellness/bg-wellness.mp4";
const WELLNESS_POSTER = "https://ab2ttlkn9no0tuoa.public.blob.vercel-storage.com/buffer/assets/cover/resofit-cover-3.jpeg";

const plannedServices = [
  "Express Relaxation Massage",
  "Back & Shoulder Recovery",
  "Neck & Upper-Body Relief",
  "Foot & Leg Recovery",
  "Gentle Mobility & Stretch",
  "Private Relaxation",
  "Couples Wellness",
  "Aromatherapy Relaxation",
  "Express Beauty & Grooming",
  "Professional Physiotherapy Referral",
];

type Hub = {
  id: string;
  hub_code: string;
  name: string;
  description: string | null;
  phone: string | null;
  whatsapp: string | null;
  services: Array<{ id: string; service_name: string; price: number | null; currency: string; booking_method: string }>;
};

async function locator<T>(params: Record<string, string | number | undefined>) {
  if (!SUPABASE_URL) throw new Error("Wellness locator is not configured");
  const q = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => { if (v !== undefined && v !== "") q.set(k, String(v)); });
  const r = await fetch(`${SUPABASE_URL}/functions/v1/wellness-locator?${q}`, { headers: SUPABASE_KEY ? { apikey: SUPABASE_KEY } : undefined });
  if (!r.ok) throw new Error(`Wellness locator failed: ${r.status}`);
  return r.json() as Promise<T>;
}

export const Route = createFileRoute("/wellness/makaveli")({
  head: () => ({
    meta: [
      { title: "Makaveli Wellness Spa — ResoFit" },
      { name: "description", content: "Makaveli Wellness Spa — wellness and recovery hub in Aba, Abia." },
      { property: "og:title", content: "Makaveli Wellness Spa — ResoFit" },
      { property: "og:description", content: "Wellness and recovery services through the ResoFit Wellness Network." },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "https://resofit.fit/wellness/makaveli" },
      { property: "og:image", content: WELLNESS_POSTER },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:image", content: WELLNESS_POSTER },
    ],
    links: [{ rel: "canonical", href: "https://resofit.fit/wellness/makaveli" }],
  }),
  component: MakaveliWellness,
});

function MakaveliWellness() {
  const [hub, setHub] = useState<Hub | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    locator<{ results: Hub[] }>({ action: "nearby", q: "Makaveli Wellness Hub", state: "abia", city: "aba" })
      .then((d) => setHub(d.results.find((x) => x.hub_code === "MKV-ABA-001") ?? d.results[0] ?? null))
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, []);

  const whatsapp = hub?.whatsapp ? (hub.whatsapp.startsWith("http") ? hub.whatsapp : `https://wa.me/${hub.whatsapp.replace(/\D/g, "")}`) : "https://wa.me/2349032712393";
  const phone = hub?.phone ?? "09032712393";
  const services = hub?.services?.length ? hub.services : plannedServices.map((service_name, i) => ({ id: `planned-${i}`, service_name, price: null, currency: "NGN", booking_method: "human_escalation" }));

  return <div className="min-h-screen bg-background">
    <SiteHeader />
    <main>
      <section className="relative min-h-[72svh] overflow-hidden border-b border-border/60">
        <div className="absolute inset-0 bg-background">
          <img src={WELLNESS_POSTER} alt="" aria-hidden="true" className="absolute inset-0 h-full w-full object-cover opacity-50" />
          <video className="absolute inset-0 h-full w-full object-cover opacity-70" src={WELLNESS_VIDEO} autoPlay muted loop playsInline preload="metadata" poster={WELLNESS_POSTER} aria-hidden="true" onError={(e) => { e.currentTarget.style.display = "none"; }} />
          <div className="absolute inset-0 bg-gradient-to-r from-background via-background/75 to-background/10" />
          <div className="absolute inset-0 bg-gradient-to-t from-background via-transparent to-background/30" />
        </div>
        <div className="relative z-10 mx-auto max-w-7xl px-6 py-24 md:py-32">
          <p className="text-xs uppercase tracking-[0.35em] text-gold">ResoFit™ Wellness Network · Aba</p>
          <h1 className="mt-5 max-w-4xl font-display text-6xl leading-[0.92] md:text-8xl">Makaveli<br /><span className="text-gradient-gold">Wellness Spa.</span></h1>
          <p className="mt-7 max-w-2xl text-lg leading-relaxed text-muted-foreground">Wellness, relaxation and recovery services at Plot 6, Independent Street, Aba, Abia.</p>
          <div className="mt-10 flex flex-wrap gap-3">
            <a href={whatsapp} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 bg-gold px-6 py-3 text-xs font-semibold uppercase tracking-widest text-gold-foreground"><MessageCircle className="h-4 w-4" />WhatsApp</a>
            <a href={`tel:${phone}`} className="inline-flex items-center gap-2 border border-border px-6 py-3 text-xs font-semibold uppercase tracking-widest"><Phone className="h-4 w-4" />Call</a>
            <Link to="/wellness/states/cities/hubs/geo-locator" className="inline-flex items-center gap-2 border border-border px-6 py-3 text-xs font-semibold uppercase tracking-widest">Open Wellness Locator <ArrowRight className="h-4 w-4" /></Link>
          </div>
        </div>
      </section>
      <section className="py-20"><div className="mx-auto max-w-7xl px-6">
        <div className="grid gap-10 md:grid-cols-[1.2fr_.8fr]">
          <div><p className="text-xs uppercase tracking-[0.3em] text-gold">Location</p><h2 className="mt-3 font-display text-4xl md:text-5xl">Makaveli Wellness Hub</h2><p className="mt-5 text-muted-foreground">Plot 6, Independent Street, Aba, Abia, Nigeria.</p><div className="mt-5 flex items-start gap-3 text-sm text-muted-foreground"><MapPin className="mt-0.5 h-4 w-4 shrink-0 text-gold" /><span>Aba · Abia · Nigeria</span></div><p className="mt-6 text-sm text-muted-foreground">The hub is registered as MKV-ABA-001. Exact map coordinates and operating availability are only shown when confirmed by the hub.</p></div>
          <div className="border border-border/60 p-6"><p className="text-xs uppercase tracking-[0.25em] text-gold">Phase-1 services</p><div className="mt-5 space-y-3">{services.map((s) => <div key={s.id} className="border-b border-border/50 pb-3 text-sm">{s.service_name}{s.price !== null && <span className="float-right text-muted-foreground">{s.currency} {s.price.toLocaleString()}</span>}</div>)}</div><p className="mt-5 text-xs text-muted-foreground">Physiotherapy pathway is referral-based; the platform does not provide diagnosis.</p></div>
        </div>
        {loading && <p className="mt-8 text-sm text-muted-foreground">Checking the canonical wellness registry…</p>}
        {error && <p className="mt-8 text-sm text-muted-foreground">Registry connection is temporarily unavailable; the canonical location and planned service set remain displayed.</p>}
      </div></section>
    </main>
    <SiteFooter />
  </div>;
}
