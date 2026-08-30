import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ArrowRight, MapPin } from "lucide-react";
import { SiteFooter } from "@/components/SiteFooter";
import { SiteHeader } from "@/components/SiteHeader";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string | undefined;

type State = { id: string; state_code: string; name: string; slug: string; status: string };
type City = { id: string; name: string; slug: string; latitude: number | null; longitude: number | null; status: string };

async function locator<T>(params: Record<string, string | number | undefined>) {
  if (!SUPABASE_URL) throw new Error("Wellness locator is not configured");
  const query = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => { if (value !== undefined && value !== "") query.set(key, String(value)); });
  const response = await fetch(`${SUPABASE_URL}/functions/v1/wellness-locator?${query.toString()}`, { headers: SUPABASE_KEY ? { apikey: SUPABASE_KEY } : undefined });
  if (!response.ok) throw new Error(`Wellness locator failed: ${response.status}`);
  return response.json() as Promise<T>;
}

export const Route = createFileRoute("/wellness/$state")({
  loader: async ({ params }) => {
    const data = await locator<{ states: State[] }>({ action: "states" });
    const state = data.states.find((item) => item.slug === params.state && item.status === "active");
    if (!state) throw notFound();
    return state;
  },
  head: ({ loaderData }) => ({
    meta: [
      { title: `${loaderData.name} Wellness Network — ResoFit` },
      { name: "description", content: `Discover ResoFit Wellness locations and services in ${loaderData.name}.` },
    ],
    links: [{ rel: "canonical", href: `https://resofit.fit/wellness/${loaderData.slug}` }],
  }),
  component: StateWellness,
  notFoundComponent: () => <div className="min-h-screen bg-background"><SiteHeader /><main className="mx-auto max-w-3xl px-6 py-24 text-center"><h1 className="font-display text-5xl">Wellness location not found</h1><Link to="/wellness" className="mt-6 inline-block text-gold underline">Back to Wellness →</Link></main><SiteFooter /></div>,
});

function StateWellness() {
  const state = Route.useLoaderData();
  const [cities, setCities] = useState<City[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    locator<{ cities: City[] }>({ action: "cities", state: state.slug })
      .then((data) => setCities(data.cities.filter((city) => city.status === "active")))
      .finally(() => setLoading(false));
  }, [state.slug]);

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <main>
        <section className="border-b border-border/60">
          <div className="mx-auto max-w-7xl px-6 py-20 md:py-28">
            <Link to="/wellness" className="text-xs uppercase tracking-widest text-muted-foreground hover:text-gold">← ResoFit Wellness</Link>
            <p className="mt-8 text-xs uppercase tracking-[0.35em] text-gold">{state.state_code} · Wellness Network</p>
            <h1 className="mt-3 font-display text-6xl md:text-8xl">Wellness in {state.name}.</h1>
            <p className="mt-6 max-w-2xl text-lg text-muted-foreground">Explore cities and verified partner wellness hubs as the ResoFit network expands across {state.name}.</p>
            <Link to="/wellness/states/cities/hubs/geo-locator" className="mt-8 inline-flex items-center gap-2 bg-gold px-6 py-3 text-xs font-semibold uppercase tracking-widest text-gold-foreground">Open Wellness Locator <ArrowRight className="h-4 w-4" /></Link>
          </div>
        </section>

        <section className="py-20">
          <div className="mx-auto max-w-7xl px-6">
            <div className="mb-8"><p className="mb-3 text-xs uppercase tracking-[0.3em] text-gold">Cities & Towns</p><h2 className="font-display text-4xl md:text-5xl">Explore {state.name}.</h2></div>
            {loading ? <p className="text-sm text-muted-foreground">Loading the canonical location registry…</p> : cities.length === 0 ? <div className="border border-border/60 p-8"><MapPin className="h-5 w-5 text-gold" /><h3 className="mt-4 font-display text-2xl">Network coming to {state.name}.</h3><p className="mt-2 max-w-xl text-sm text-muted-foreground">This geographic destination is registered in ResoFit, but no city or verified partner records are currently published. We will never fabricate availability.</p></div> : <div className="grid gap-px bg-border/60 sm:grid-cols-2 lg:grid-cols-3">{cities.map((city) => <Link key={city.id} to="/wellness/states/cities/hubs/geo-locator" className="bg-background p-6 transition-colors hover:bg-card hover:text-gold"><span className="block text-[10px] uppercase tracking-[0.2em] text-muted-foreground">{city.latitude !== null ? "Geo registered" : "Location registered"}</span><span className="mt-3 block font-display text-2xl">{city.name}</span><span className="mt-2 block text-xs uppercase tracking-widest text-muted-foreground">Explore hubs →</span></Link>)}</div>}
          </div>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
