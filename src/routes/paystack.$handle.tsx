import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState, type FormEvent } from "react";
import { Loader2, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import {
  PRODUCT_BY_HANDLE_QUERY,
  RESOFIT_SUPABASE_URL,
  formatMoney,
  storefrontApiRequest,
  type ShopifyProductNode,
} from "@/lib/shopify";
import { getAttribution } from "@/lib/attribution";
import { track } from "@/lib/tracking";

export const Route = createFileRoute("/paystack/$handle")({
  head: () => ({
    meta: [
      { title: "Secure Checkout — ResoFit" },
      {
        name: "description",
        content: "Choose your ResoFit wellness offer and continue to secure Paystack checkout.",
      },
      { property: "og:title", content: "Secure Checkout — ResoFit" },
      {
        property: "og:description",
        content: "Personalized Nigerian wellness plans with secure Paystack checkout.",
      },
    ],
  }),
  component: DirectOfferCheckout,
});

async function fetchOffer(handle: string): Promise<ShopifyProductNode | null> {
  // The storefront client reads the canonical Supabase catalog; checkout uses its canonical SKU.
  const response = await storefrontApiRequest<{ product: ShopifyProductNode | null }>(
    PRODUCT_BY_HANDLE_QUERY,
    { handle },
  );
  return response?.data?.product ?? null;
}

function DirectOfferCheckout() {
  const { handle } = Route.useParams();
  const { data: product, isLoading, isError } = useQuery({
    queryKey: ["direct-paystack-offer", handle],
    queryFn: async () => {
      const offer = await fetchOffer(handle);
      if (!offer?.sku) throw new Error("This offer is not available for checkout.");
      return offer;
    },
    retry: 1,
    staleTime: 30_000,
  });
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [busy, setBusy] = useState(false);

  const startCheckout = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!product?.sku || !fullName.trim() || !email.trim() || !phone.trim()) {
      toast.error("Enter your name, email and phone to continue.");
      return;
    }
    setBusy(true);
    try {
      const price = Number(product.priceRange.minVariantPrice.amount);
      track("checkout_start", {
        product_id: product.sku,
        product_title: product.title,
        sku: product.sku,
        quantity: 1,
        value: price,
        currency: product.priceRange.minVariantPrice.currencyCode || "NGN",
        source: "resofit_direct_offer_checkout",
        ...getAttribution(),
      });
      const response = await fetch(`${RESOFIT_SUPABASE_URL}/functions/v1/paystack-init`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: [{ sku: product.sku, quantity: 1 }],
          name: fullName.trim(),
          email: email.trim().toLowerCase(),
          phone: phone.trim(),
          funnel_origin: "resofit_direct_offer",
          ...getAttribution(),
        }),
      });
      const payload = (await response.json().catch(() => null)) as
        | { authorization_url?: string; reference?: string; error?: string }
        | null;
      if (!response.ok || !payload?.authorization_url) {
        throw new Error(
          payload?.error === "product_not_found"
            ? "This offer is temporarily unavailable."
            : payload?.error ?? "Unable to start secure checkout. Please try again.",
        );
      }
      // Keep the buyer's checkout email only for the same-browser return flow.
      window.sessionStorage.setItem("resofit_checkout_email", email.trim().toLowerCase());
      if (payload.reference) window.sessionStorage.setItem("resofit_checkout_reference", payload.reference);
      window.location.assign(payload.authorization_url);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to start secure checkout.");
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <main className="mx-auto grid max-w-6xl gap-8 px-4 py-10 sm:px-6 md:grid-cols-2 md:items-start md:py-16">
        <section className="rounded-2xl border border-gold/20 bg-card p-6 sm:p-8">
          <p className="text-xs uppercase tracking-[0.25em] text-gold">NaijaFit · ResoFit</p>
          <h1 className="mt-3 font-display text-3xl leading-tight sm:text-4xl">
            Secure your wellness reset
          </h1>
          <p className="mt-3 text-sm leading-6 text-muted-foreground">
            A practical starting point for building consistent nutrition and movement habits around
            your real routine.
          </p>
          {isLoading ? (
            <div className="flex items-center gap-2 py-10 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> Loading the live offer…
            </div>
          ) : isError || !product ? (
            <div className="mt-8 rounded-xl border border-border p-4">
              <p className="font-medium">This offer could not be loaded.</p>
              <p className="mt-2 text-sm text-muted-foreground">
                Start with your personalized assessment or contact ResoFit for assistance.
              </p>
              <Link to="/me" className="mt-4 inline-flex text-sm font-semibold text-gold underline">
                Start personalized assessment →
              </Link>
            </div>
          ) : (
            <div className="mt-8 flex gap-4 rounded-xl border border-border/70 bg-background/60 p-4">
              {product.images.edges[0]?.node.url ? (
                <img
                  src={product.images.edges[0].node.url}
                  alt={product.images.edges[0].node.altText ?? product.title}
                  className="h-24 w-24 rounded-lg object-cover"
                  loading="eager"
                />
              ) : null}
              <div className="min-w-0 flex-1">
                <h2 className="font-semibold">{product.title}</h2>
                <p className="mt-2 font-display text-2xl text-gold">
                  {formatMoney(product.priceRange.minVariantPrice)}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">One-time payment · NGN</p>
              </div>
            </div>
          )}
        </section>

        <section className="rounded-2xl border border-border/70 bg-card p-6 sm:p-8">
          <div className="flex items-center gap-2 text-sm font-medium">
            <ShieldCheck className="h-4 w-4 text-gold" /> Secure Paystack checkout
          </div>
          <p className="mt-2 text-sm text-muted-foreground">
            Enter your details to continue to the live payment page. Your payment is confirmed
            server-side before the order is marked paid.
          </p>
          <form onSubmit={startCheckout} className="mt-6 space-y-4">
            <label className="block text-sm">
              Full name
              <input
                required
                autoComplete="name"
                value={fullName}
                onChange={(event) => setFullName(event.target.value)}
                className="mt-1.5 h-12 w-full rounded-lg border border-border bg-background px-3 text-base outline-none focus:border-gold"
                placeholder="Your full name"
              />
            </label>
            <label className="block text-sm">
              Email address
              <input
                required
                type="email"
                autoComplete="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                className="mt-1.5 h-12 w-full rounded-lg border border-border bg-background px-3 text-base outline-none focus:border-gold"
                placeholder="you@example.com"
              />
            </label>
            <label className="block text-sm">
              Phone number
              <input
                required
                type="tel"
                autoComplete="tel"
                value={phone}
                onChange={(event) => setPhone(event.target.value)}
                className="mt-1.5 h-12 w-full rounded-lg border border-border bg-background px-3 text-base outline-none focus:border-gold"
                placeholder="+234…"
              />
            </label>
            <button
              type="submit"
              disabled={busy || isLoading || isError || !product?.sku}
              className="flex h-12 w-full items-center justify-center gap-2 rounded-lg bg-gold px-4 text-sm font-semibold text-black transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              {busy ? "Connecting to Paystack…" : "Continue to secure checkout"}
            </button>
            <p className="text-center text-xs leading-5 text-muted-foreground">
              Your final amount is validated against ResoFit’s live catalogue and checkout rules.
            </p>
          </form>
          <Link to="/me" className="mt-5 block text-center text-xs text-muted-foreground underline">
            Not sure which plan fits? Take the 60-second assessment.
          </Link>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
