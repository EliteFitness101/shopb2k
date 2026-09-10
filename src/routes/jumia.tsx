import { createFileRoute } from "@tanstack/react-router";
import { ArrowUpRight, ExternalLink, ShoppingCart } from "lucide-react";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { getJumiaOffers } from "@/lib/jumia.server";

export const Route = createFileRoute("/jumia")({
  loader: () => getJumiaOffers(),
  head: () => ({
    meta: [
      { title: "Jumia Fitness Marketplace | ResoFit" },
      {
        name: "description",
        content:
          "Discover fitness products from Jumia Nigeria through the ResoFit commerce marketplace.",
      },
    ],
    links: [{ rel: "canonical", href: "https://shop.resofit.fit/jumia" }],
  }),
  component: JumiaMarketplace,
});

function JumiaMarketplace() {
  const { source, offers } = Route.useLoaderData();

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <main className="mx-auto max-w-7xl px-5 py-14 md:px-8 md:py-20">
        <section className="border border-border/60 bg-background/70 p-7 md:p-10">
          <p className="text-xs uppercase tracking-[0.3em] text-gold">ResoFit × Jumia Nigeria</p>
          <div className="mt-4 flex flex-col justify-between gap-6 md:flex-row md:items-end">
            <div>
              <h1 className="font-display text-5xl leading-none md:text-7xl">Jumia Fitness Marketplace</h1>
              <p className="mt-5 max-w-2xl text-base text-muted-foreground md:text-lg">
                Browse fitness products and continue to Jumia for external checkout and fulfillment.
              </p>
            </div>
            <div className="text-sm text-muted-foreground">
              <span className="text-foreground">{offers.length}</span> products connected
            </div>
          </div>
        </section>

        {!source ? (
          <section className="mt-8 border border-border p-8 text-sm text-muted-foreground">
            Jumia marketplace is currently unavailable.
          </section>
        ) : (
          <section className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {offers.map((offer) => {
              const price = Number(offer.price);
              const priceLabel = Number.isFinite(price)
                ? new Intl.NumberFormat("en-NG", {
                    style: "currency",
                    currency: offer.currency ?? "NGN",
                    maximumFractionDigits: 0,
                  }).format(price)
                : "Price on Jumia";
              const checkoutUrl = offer.external_url;

              return (
                <article key={offer.id} className="flex min-h-[290px] flex-col border border-border/60 p-6">
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-[10px] uppercase tracking-[0.22em] text-gold">Jumia Nigeria</span>
                    <span className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
                      {offer.fulfillment_mode ?? "physical"}
                    </span>
                  </div>

                  <h2 className="mt-5 font-display text-2xl leading-tight">{offer.title}</h2>
                  <p className="mt-4 text-2xl font-semibold">{priceLabel}</p>
                  <p className="mt-2 text-xs uppercase tracking-wider text-muted-foreground">
                    Availability checked on Jumia at checkout
                  </p>

                  <div className="mt-auto pt-7">
                    {checkoutUrl ? (
                      <a
                        href={checkoutUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex w-full items-center justify-center gap-2 bg-gold px-5 py-4 text-xs font-semibold uppercase tracking-[0.18em] text-gold-foreground transition-opacity hover:opacity-90"
                      >
                        <ShoppingCart className="h-4 w-4" />
                        Continue to Jumia
                        <ArrowUpRight className="h-4 w-4" />
                      </a>
                    ) : (
                      <span className="inline-flex w-full items-center justify-center gap-2 border border-border px-5 py-4 text-xs uppercase tracking-[0.18em] text-muted-foreground">
                        <ExternalLink className="h-4 w-4" />
                        Jumia link unavailable
                      </span>
                    )}
                  </div>
                </article>
              );
            })}
          </section>
        )}
      </main>
      <SiteFooter />
    </div>
  );
}
