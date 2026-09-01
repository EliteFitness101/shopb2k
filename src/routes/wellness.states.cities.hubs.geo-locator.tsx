import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { MapPin, Navigation, Search, ExternalLink, Mail } from "lucide-react";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { parseWellnessSearchIntent } from "@/lib/wellness/findWellnessHubs";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string | undefined;

type State = { id: string; state_code: string; name: string; slug: string };
type Hub = {
  id: string;
  hub_code: string;
  name: string;
  address: string | null;
  latitude: number;
  longitude: number;
  phone: string | null;
  whatsapp: string | null;
  website?: string | null;
  email?: string | null;
  distance_km: number | null;
  services: Array<{ id: string; service_name: string; price: number | null; currency: string; booking_method: string }>;
};

async function locator<T>(params: Record<string, string | number | undefined>) {
  if (!SUPABASE_URL) throw new Error("Wellness locator is not configured");
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) if (value !== undefined && value !== "") query.set(key, String(value));
  const response = await fetch(`${SUPABASE_URL}/functions/v1/wellness-locator?${query.toString()}`, {
    headers: SUPABASE_KEY ? { apikey: SUPABASE_KEY } : undefined,
  });
  if (!response.ok) throw new Error("Unable to load wellness locations");
  return response.json() as Promise<T>;
}

export const Route = createFileRoute("/wellness/states/cities/hubs/geo-locator")({
  head: () => ({
    meta: [
      { title: "Wellness Geo-Locator — ResoFit" },
      { name: "description", content: "Find verified ResoFit Wellness hubs, services and local support near you." },
    ],
    links: [{ rel: "canonical", href: "https://resofit.fit/wellness/states/cities/hubs/geo-locator" }],
  }),
  component: WellnessGeoLocator,
});

function WellnessGeoLocator() {
  const initialQuery = typeof window !== "undefined" ? new URLSearchParams(window.location.search).get("q") ?? "" : "";
  const [states, setStates] = useState<State[]>([]);
  const [state, setState] = useState("");
  const [city, setCity] = useState("");
  const [query, setQuery] = useState(initialQuery);
  const [cities, setCities] = useState<Array<{ id: string; name: string; slug: string }>>([]);
  const [results, setResults] = useState<Hub[]>([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState(initialQuery ? `Understanding: “${initialQuery}”` : "Choose your state, ask a wellness question, or use your current location.");

  useEffect(() => {
    locator<{ states: State[] }>({ action: "states" }).then((data) => setStates(data.states)).catch(() => setMessage("Wellness location service is temporarily unavailable."));
  }, []);

  useEffect(() => {
    if (!state) { setCities([]); setCity(""); return; }
    locator<{ cities: Array<{ id: string; name: string; slug: string }> }>({ action: "cities", state })
      .then((data) => setCities(data.cities))
      .catch(() => setCities([]));
  }, [state]);

  const search = async (params: Record<string, string | number | undefined>) => {
    setLoading(true);
    try {
      const data = await locator<{ results: Hub[]; count: number }>(params);
      setResults(data.results);
      setMessage(data.count ? `${data.count} verified wellness hub${data.count === 1 ? "" : "s"} found.` : "No verified wellness hubs matched that request yet.");
    } catch {
      setMessage("Unable to search wellness locations right now.");
    } finally { setLoading(false); }
  };

  useEffect(() => {
    if (!initialQuery) return;
    const intent = parseWellnessSearchIntent(initialQuery);
    if (intent.state) setState(intent.state);
    void search({ action: "nearby", q: initialQuery, state: intent.state, service: intent.service });
  }, []);

  const submitQuestion = (event: React.FormEvent) => {
    event.preventDefault();
    const value = query.trim();
    if (!value) return;
    const intent = parseWellnessSearchIntent(value);
    if (intent.state) setState(intent.state);
    const params = new URLSearchParams({ q: value });
    if (intent.state) params.set("state", intent.state);
    if (intent.service) params.set("service", intent.service);
    window.history.replaceState({}, "", `${window.location.pathname}?${params.toString()}`);
    void search({ action: "nearby", q: value, state: intent.state, city, service: intent.service });
  };

  const useLocation = () => {
    if (!navigator.geolocation) { setMessage("Location services are not available on this device."); return; }
    setLoading(true);
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => void search({ action: "nearby", lat: coords.latitude, lng: coords.longitude, radius_km: 25, q: query }),
      () => { setLoading(false); setMessage("Location permission was not granted. Choose your state and city instead."); },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 300000 },
    );
  };

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <main className="mx-auto max-w-6xl px-6 py-16 md:py-24">
        <div className="max-w-3xl">
          <p className="mb-4 text-xs uppercase tracking-[0.3em] text-gold">ResoFit Wellness Network</p>
          <h1 className="font-display text-5xl leading-tight md:text-7xl">Ask. Find. Connect.</h1>
          <p className="mt-6 text-lg text-muted-foreground">Ask a real wellness question and ChatB2K will translate it into a location and service search against the verified ResoFit registry.</p>
        </div>

        <section className="mt-10 border border-border/60 p-6 md:p-8">
          <form onSubmit={submitQuestion} className="flex flex-col gap-3 md:flex-row">
            <label className="sr-only" htmlFor="wellness-question">Ask a wellness question</label>
            <input id="wellness-question" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="e.g. Where can I get a massage in Port Harcourt?" className="min-w-0 flex-1 border border-border bg-background px-4 py-3 outline-none focus:border-gold" />
            <button type="submit" disabled={loading || !query.trim()} className="inline-flex items-center justify-center gap-2 border border-gold px-5 py-3 font-medium disabled:opacity-50"><Search className="h-4 w-4" /> Ask & Find</button>
          </form>
          <div className="mt-4 flex flex-col gap-4 md:flex-row md:items-end">
            <label className="flex-1 text-sm">State
              <select value={state} onChange={(e) => setState(e.target.value)} className="mt-2 w-full border border-border bg-background px-4 py-3">
                <option value="">All available locations</option>
                {states.map((item) => <option key={item.id} value={item.slug}>{item.name}</option>)}
              </select>
            </label>
            <label className="flex-1 text-sm">City
              <select value={city} onChange={(e) => setCity(e.target.value)} disabled={!state} className="mt-2 w-full border border-border bg-background px-4 py-3 disabled:opacity-50">
                <option value="">All cities</option>
                {cities.map((item) => <option key={item.id} value={item.slug}>{item.name}</option>)}
              </select>
            </label>
            <button onClick={() => void search({ action: "nearby", state, city, q: query })} disabled={loading || !state} className="inline-flex items-center justify-center gap-2 border border-border px-5 py-3 font-medium disabled:opacity-50"><MapPin className="h-4 w-4" /> Search location</button>
            <button onClick={useLocation} disabled={loading} className="inline-flex items-center justify-center gap-2 bg-foreground px-5 py-3 text-background disabled:opacity-50"><Navigation className="h-4 w-4" /> Use my location</button>
          </div>
          <p className="mt-5 text-sm text-muted-foreground">{message}</p>
        </section>

        <section className="mt-10 grid gap-5 md:grid-cols-2">
          {results.map((hub) => (
            <article key={hub.id} className="border border-border/60 p-6">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs uppercase tracking-[0.2em] text-gold">Verified wellness hub</p>
                  <h2 className="mt-2 font-display text-2xl">{hub.name}</h2>
                </div>
                {hub.distance_km !== null && <span className="text-sm text-muted-foreground">{hub.distance_km.toFixed(1)} km</span>}
              </div>
              {hub.address && <p className="mt-3 text-sm text-muted-foreground">{hub.address}</p>}
              <div className="mt-5 flex flex-wrap gap-2">
                {hub.services.map((service) => <span key={service.id} className="border border-border px-3 py-1 text-xs">{service.service_name}</span>)}
              </div>
              <div className="mt-6 flex flex-wrap gap-3 text-sm">
                {hub.whatsapp && <a href={hub.whatsapp.startsWith("http") ? hub.whatsapp : `https://wa.me/${hub.whatsapp.replace(/\D/g, "")}`} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 border border-border px-4 py-2">WhatsApp</a>}
                {hub.phone && <a href={`tel:${hub.phone}`} className="inline-flex items-center gap-2 border border-border px-4 py-2">Call</a>}
                {hub.website && <a href={hub.website} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 border border-border px-4 py-2"><ExternalLink className="h-4 w-4" /> Website</a>}
                {hub.email && <a href={`mailto:${hub.email}?subject=ResoFit%20Brand%20Partnership`} className="inline-flex items-center gap-2 border border-border px-4 py-2"><Mail className="h-4 w-4" /> Brand partnership</a>}
                <span className="ml-auto inline-flex items-center gap-1 text-xs text-muted-foreground"><MapPin className="h-3 w-3" /> {hub.hub_code}</span>
              </div>
            </article>
          ))}
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
