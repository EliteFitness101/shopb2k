import { createFileRoute } from "@tanstack/react-router";
import { LegalPage } from "@/components/LegalPage";
import { legalDoc } from "@/platform/legal";

const doc = legalDoc("privacy");
const canonicalUrl = (path: string) => new URL(path, "https://www.resofit.fit").toString();

export const Route = createFileRoute("/privacy")({
  head: () => ({
    meta: [
      { title: doc.metaTitle },
      { name: "description", content: doc.description },
      { property: "og:title", content: doc.metaTitle },
      { property: "og:description", content: doc.description },
      { property: "og:type", content: "website" },
      { property: "og:url", content: canonicalUrl(doc.path) },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [{ rel: "canonical", href: canonicalUrl(doc.path) }],
  }),
  component: () => <LegalPage doc={doc} />,
});
