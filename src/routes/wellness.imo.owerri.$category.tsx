import { createFileRoute } from "@tanstack/react-router";
import { OwerriDiscoveryPage, OWERRI_CATEGORIES } from "@/components/wellness/OwerriDiscovery";

export const Route = createFileRoute("/wellness/imo/owerri/$category")({
  component: () => { const { category } = Route.useParams(); return <OwerriDiscoveryPage mode={category} />; },
  head: ({ params }) => {
    const item = OWERRI_CATEGORIES.find(([slug]) => slug === params.category);
    const label = item?.[1] ?? params.category;
    return { meta: [
      { title: `${label} in Owerri | ResoFit Wellness Discovery` },
      { name: "description", content: `Discover ${label.toLowerCase()} providers and wellness hubs in Owerri, Imo through ResoFit.` },
    ], links: [{ rel: "canonical", href: `https://resofit.fit/wellness/imo/owerri/${params.category}` }] };
  },
});
