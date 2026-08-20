import { createFileRoute } from "@tanstack/react-router";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { MessageCircle, Mail, MapPin } from "lucide-react";
import { whatsappUrl } from "@/lib/ctas";
import { track } from "@/lib/tracking";

export const Route = createFileRoute("/contact")({
  head: () => ({
    meta: [
      { title: "Contact — ResoFit" },
      {
        name: "description",
        content:
          "Talk to the ResoFit team — WhatsApp CoachB2K™, email support or visit our Lagos workshop.",
      },
      { property: "og:title", content: "Contact ResoFit" },
      {
        property: "og:description",
        content: "Talk to CoachB2K™ on WhatsApp or reach the ResoFit team.",
      },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "https://shopb2k.lovable.app/contact" },
      { name: "twitter:card", content: "summary" },
    ],
    links: [{ rel: "canonical", href: "https://resofit.fit/contact" }],
  }),
  component: Contact,
});

function Contact() {
  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <main className="mx-auto max-w-4xl px-6 py-20">
        <p className="mb-4 text-xs uppercase tracking-[0.3em] text-gold">Contact</p>
        <h1 className="font-display text-5xl leading-tight md:text-7xl">Let's talk.</h1>
        <p className="mt-6 max-w-xl text-muted-foreground">
          The fastest way to reach us is WhatsApp. CoachB2K™ replies personally.
        </p>

        <div className="mt-10 grid gap-6 md:grid-cols-3">
          <a
            href={whatsappUrl()}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => track("product_click", { surface: "contact", cardId: "whatsapp" })}
            className="border border-border/60 p-6 hover:border-gold/60"
          >
            <MessageCircle className="h-5 w-5 text-gold" />
            <p className="mt-3 font-display text-xl">WhatsApp</p>
            <p className="mt-2 text-sm text-muted-foreground">
              Chat with CoachB2K™ · +234 813 225 5842
            </p>
          </a>
          <a
            href="mailto:hello@resofit.fit"
            className="border border-border/60 p-6 hover:border-gold/60"
          >
            <Mail className="h-5 w-5 text-gold" />
            <p className="mt-3 font-display text-xl">Email</p>
            <p className="mt-2 text-sm text-muted-foreground">hello@resofit.fit</p>
          </a>
          <div className="border border-border/60 p-6">
            <MapPin className="h-5 w-5 text-gold" />
            <p className="mt-3 font-display text-xl">Workshop</p>
            <p className="mt-2 text-sm text-muted-foreground">Lagos, Nigeria · By appointment</p>
          </div>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
