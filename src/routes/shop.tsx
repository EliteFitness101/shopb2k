import { createFileRoute } from "@tanstack/react-router";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { products, formatNGN, formatUSD } from "@/lib/products";

export const Route = createFileRoute("/shop")({
  head: () => ({
    meta: [
      { title: "Shop — ResoFit Hardware" },
      { name: "description", content: "Shop competition-grade barbells, bumper plates, dumbbells, and power racks. Pricing in ₦ and $." },
      { property: "og:title", content: "Shop — ResoFit Hardware" },
      { property: "og:description", content: "Shop competition-grade barbells, bumper plates, dumbbells, and power racks." },
    ],
  }),
  component: Shop,
});

function Shop() {
  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />

      <section className="border-b border-border/60">
        <div className="mx-auto max-w-7xl px-6 py-20">
          <p className="mb-4 text-xs uppercase tracking-[0.3em] text-gold">The Shop</p>
          <h1 className="font-display text-6xl leading-[0.95] md:text-8xl">
            Hardware,
            <br />
            <span className="text-gradient-gold">no compromise.</span>
          </h1>
          <p className="mt-6 max-w-xl text-muted-foreground">
            Every piece spec'd, tested, and shipped from our Lagos workshop. Prices shown in ₦ and $.
          </p>
        </div>
      </section>

      <section className="py-16">
        <div className="mx-auto max-w-7xl px-6">
          <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
            {products.map((p) => (
              <article key={p.id} className="group flex flex-col border border-border/60 bg-card transition-colors hover:border-gold/60">
                <div className="relative aspect-square overflow-hidden">
                  <img
                    src={p.image}
                    alt={p.name}
                    width={1024}
                    height={1024}
                    loading="lazy"
                    className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
                  />
                  <span className="absolute left-4 top-4 rounded-sm bg-background/80 px-3 py-1 text-[10px] uppercase tracking-widest text-gold backdrop-blur">
                    {p.category}
                  </span>
                </div>
                <div className="flex flex-1 flex-col p-6">
                  <h2 className="font-display text-2xl leading-tight">{p.name}</h2>
                  <p className="mt-3 flex-1 text-sm text-muted-foreground">{p.spec}</p>
                  <div className="mt-6 flex items-end justify-between gap-4 border-t border-border/60 pt-5">
                    <div>
                      <p className="font-display text-2xl text-gold">{formatNGN(p.priceNGN)}</p>
                      <p className="text-xs uppercase tracking-widest text-muted-foreground">≈ {formatUSD(p.priceUSD)}</p>
                    </div>
                    <button
                      type="button"
                      className="inline-flex h-11 items-center justify-center rounded-sm bg-foreground px-5 text-xs font-semibold uppercase tracking-widest text-background transition-colors hover:bg-gold hover:text-gold-foreground"
                    >
                      Add to cart
                    </button>
                  </div>
                </div>
              </article>
            ))}
          </div>

          <p className="mt-16 text-center text-xs uppercase tracking-widest text-muted-foreground">
            Checkout coming soon — Paystack (₦) & card (USD)
          </p>
        </div>
      </section>

      <SiteFooter />
    </div>
  );
}
