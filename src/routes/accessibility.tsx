import { createFileRoute } from "@tanstack/react-router";
import { LegalPage } from "@/components/LegalPage";
import { legalDoc } from "@/platform/legal";
import { absoluteUrl } from "@/platform/routes";

const doc = legalDoc("accessibility");

export const Route = createFileRoute("/accessibility")({
  head: () => ({
    meta: [
      { title: doc.metaTitle },
      { name: "description", content: doc.description },
      { property: "og:title", content: doc.metaTitle },
      { property: "og:description", content: doc.description },
      { property: "og:type", content: "website" },
      { property: "og:url", content: absoluteUrl(doc.path) },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [{ rel: "canonical", href: absoluteUrl(doc.path) }],
  }),
  component: () => <LegalPage doc={doc} />,
});
