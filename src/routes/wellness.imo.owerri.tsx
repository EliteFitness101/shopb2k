import { createFileRoute } from "@tanstack/react-router";
import { OwerriDiscoveryPage } from "@/components/wellness/OwerriDiscovery";

export const Route = createFileRoute("/wellness/imo/owerri")({
  component: () => <OwerriDiscoveryPage mode="discover" />,
  head: () => ({ meta: [
    { title: "Owerri Wellness Discovery | ResoFit" },
    { name: "description", content: "Discover gyms, spas, massage, fitness, recovery, nutrition, aesthetics, sports and wellness centres across Owerri, Imo." },
  ], links: [{ rel: "canonical", href: "https://resofit.fit/wellness/imo/owerri" }] }),
});
