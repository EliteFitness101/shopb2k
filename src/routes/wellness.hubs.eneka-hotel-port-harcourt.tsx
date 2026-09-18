import { createFileRoute } from "@tanstack/react-router";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";

export const Route = createFileRoute("/wellness/hubs/eneka-hotel-port-harcourt")({
  head: () => ({
    meta: [
      { title: "Eneka Hotel | Comfort, Class & Unforgettable Experience" },
      { name: "description", content: "Eneka Hotel — 67 Eneka-Igwuruta Road, Port Harcourt. Comfort, class, hospitality, events and the ResoFlex™ partnership presentation." },
      { property: "og:title", content: "Eneka Hotel | Comfort, Class & Unforgettable Experience" },
      { property: "og:description", content: "Eneka Hotel — Port Harcourt. Premium hospitality presentation and ResoFlex™ partnership experience." },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "https://resofit.fit/wellness/hubs/eneka-hotel-port-harcourt" }
    ],
    links: [{ rel: "canonical", href: "https://resofit.fit/wellness/hubs/eneka-hotel-port-harcourt" }]
  }),
  component: EnekaHotelPresentation,
});

function EnekaHotelPresentation() {
  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <main>
        <div className="mx-auto max-w-[1600px] px-0">
          <iframe
            title="Eneka Hotel premium presentation"
            src="/eneka-hotel.html"
            className="h-[calc(100vh-80px)] min-h-[900px] w-full border-0"
          />
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
