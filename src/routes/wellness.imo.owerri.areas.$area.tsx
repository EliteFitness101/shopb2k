import { createFileRoute } from "@tanstack/react-router";
import { OwerriDiscoveryPage, OWERRI_AREAS } from "@/components/wellness/OwerriDiscovery";

export const Route = createFileRoute("/wellness/imo/owerri/areas/$area")({
  component: () => { const { area } = Route.useParams(); const item = OWERRI_AREAS.find(([slug]) => slug === area); return <OwerriDiscoveryPage mode="discover" area={item?.[1] ?? area.replaceAll("-", " ")} />; },
  head: ({ params }) => {
    const item = OWERRI_AREAS.find(([slug]) => slug === params.area);
    const label = item?.[1] ?? params.area.replaceAll("-", " ");
    return { meta: [
      { title: `${label} Wellness Hubs | ResoFit` },
      { name: "description", content: `Discover wellness, fitness, spa, massage, recovery and related hubs around ${label}, Owerri.` },
    ], links: [{ rel: "canonical", href: `https://resofit.fit/wellness/imo/owerri/areas/${params.area}` }] };
  },
});
