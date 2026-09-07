import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Loader2, ExternalLink } from "lucide-react";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { ProductImage } from "@/components/ProductImage";
import { recordEngagement } from "@/lib/imagePriority";
import { JUMIA_VERIFIED_INVENTORY_SURFACES } from "@/lib/commerce/jumia-surfaces";
import { PRODUCTS_QUERY, approxUSD, formatMoney, storefrontApiRequest, type ShopifyProduct } from "@/lib/shopify";
import { useCartStore } from "@/stores/cartStore";

type SortKey = "featured" | "newest" | "price_asc" | "price_desc";

export const Route = createFileRoute("/shop")({
  head: () => ({
    meta: [
      { title: "Shop — ResoFit Hardware & Marketplace" },
      { name: "description", content: "Shop ResoFit products and discover connected Jumia Nigeria marketplace sources across fitness, health, beauty and lifestyle." },
      { property: "og:title", content: "Shop — ResoFit Hardware & Marketplace" },
      { property: "og:description", content: "ResoFit products plus connected Jumia Nigeria marketplace discovery sources." },
    ],
  }),
  validateSearch: (s: { type?: string; vendor?: string; sort?: string }) => ({
    type: typeof s.type === "string" ? s.type : undefined,
    vendor: typeof s.vendor === "string" ? s.vendor : undefined,
    sort: (typeof s.sort === "string" ? s.sort : "featured") as SortKey,
  }),
  component: Shop,
});

async function fetchProducts(): Promise<ShopifyProduct[]> {
  const res = await storefrontApiRequest<{ products: { edges: ShopifyProduct[] } }>(PRODUCTS_QUERY, { first: 60 });
  return res?.data?.products?.edges ?? [];
}

function Shop() {
  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <section className="border-b border-border/60">
        <div className="mx-auto max-w-7xl px-6 py-20">
          <p className="mb-4 text-xs uppercase tracking-[0.3em] text-gold">The Shop</p>
          <h1 className="font-display text-6xl leading-[0.95] md:text-8xl">Hardware,<br /><span className="text-gradient-gold">no compromise.</span></h1>
          <p className="mt-6 max-w-xl text-muted-foreground">ResoFit products, with connected marketplace discovery for fitness, health, beauty and lifestyle categories.</p>
        </div>
      </section>
      <JumiaSources />
      <ShopGrid />
      <SiteFooter />
    </div>
  );
}

function JumiaSources() {
  const total = JUMIA_VERIFIED_INVENTORY_SURFACES.reduce((sum, source) => sum + source.verifiedProductCount, 0);
  return (
    <section className="border-b border-border/60 bg-card/40 py-14">
      <div className="mx-auto max-w-7xl px-6">
        <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-gold">Connected marketplace</p>
            <h2 className="mt-2 font-display text-4xl md:text-5xl">Jumia Nigeria</h2>
          </div>
          <div className="text-right text-xs uppercase tracking-widest text-muted-foreground">
            <span className="text-gold">{JUMIA_VERIFIED_INVENTORY_SURFACES.length}</span> sources · <span className="text-gold">{total.toLocaleString()}</span> listed products
          </div>
        </div>
        <div className="overflow-x-auto border border-border/60">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead className="border-b border-border/60 bg-background/70 text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
              <tr><th className="px-5 py-4">Source</th><th className="px-5 py-4">Products</th><th className="px-5 py-4">Role</th><th className="px-5 py-4 text-right">Open</th></tr>
            </thead>
            <tbody>
              {JUMIA_VERIFIED_INVENTORY_SURFACES.map((source) => (
                <tr key={source.code} className="border-b border-border/40 last:border-0 hover:bg-background/50">
                  <td className="px-5 py-4 font-medium">{source.name}</td>
                  <td className="px-5 py-4 tabular-nums text-gold">{source.verifiedProductCount.toLocaleString()}</td>
                  <td className="px-5 py-4 text-muted-foreground">{source.purpose}</td>
                  <td className="px-5 py-4 text-right"><a href={source.url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 text-xs uppercase tracking-widest text-gold hover:underline">Jumia <ExternalLink className="h-3 w-3" /></a></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}

function ShopGrid() {
  const search = Route.useSearch();
  const navigate = Route.useNavigate();
  const { data, isLoading, isError } = useQuery({ queryKey: ["products", "all"], queryFn: fetchProducts, staleTime: 60_000 });
  const productTypes = useMemo(() => Array.from(new Set((data ?? []).map((p) => p.node.productType).filter(Boolean))).sort(), [data]);
  const vendors = useMemo(() => Array.from(new Set((data ?? []).map((p) => p.node.vendor).filter(Boolean))).sort(), [data]);
  const filtered = useMemo(() => {
    let list = data ?? [];
    if (search.type) list = list.filter((p) => p.node.productType === search.type);
    if (search.vendor) list = list.filter((p) => p.node.vendor === search.vendor);
    const sorted = [...list];
    if (search.sort === "price_asc") sorted.sort((a, b) => parseFloat(a.node.priceRange.minVariantPrice.amount) - parseFloat(b.node.priceRange.minVariantPrice.amount));
    if (search.sort === "price_desc") sorted.sort((a, b) => parseFloat(b.node.priceRange.minVariantPrice.amount) - parseFloat(a.node.priceRange.minVariantPrice.amount));
    if (search.sort === "newest") sorted.sort((a, b) => (a.node.id < b.node.id ? 1 : -1));
    return sorted;
  }, [data, search.type, search.vendor, search.sort]);
  const updateSearch = (patch: Partial<typeof search>) => navigate({ search: (prev: typeof search) => ({ ...prev, ...patch }), replace: true });

  return (
    <section className="py-16">
      <div className="mx-auto max-w-7xl px-6">
        {data && data.length > 0 && (
          <div className="mb-10 flex flex-wrap items-end gap-4 border-b border-border/60 pb-6">
            {productTypes.length > 0 && <label className="flex flex-col gap-1 text-[11px] uppercase tracking-widest text-muted-foreground">Category<select value={search.type ?? ""} onChange={(e) => updateSearch({ type: e.target.value || undefined })} aria-label="Filter by category" className="min-w-40 rounded-sm border border-border bg-background px-3 py-2 text-sm text-foreground"><option value="">All categories</option>{productTypes.map((t) => <option key={t} value={t}>{t}</option>)}</select></label>}
            {vendors.length > 0 && <label className="flex flex-col gap-1 text-[11px] uppercase tracking-widest text-muted-foreground">Collection<select value={search.vendor ?? ""} onChange={(e) => updateSearch({ vendor: e.target.value || undefined })} aria-label="Filter by collection" className="min-w-40 rounded-sm border border-border bg-background px-3 py-2 text-sm text-foreground"><option value="">All collections</option>{vendors.map((v) => <option key={v} value={v}>{v}</option>)}</select></label>}
            <label className="flex flex-col gap-1 text-[11px] uppercase tracking-widest text-muted-foreground">Sort<select value={search.sort} onChange={(e) => updateSearch({ sort: e.target.value as SortKey })} aria-label="Sort products" className="min-w-40 rounded-sm border border-border bg-background px-3 py-2 text-sm text-foreground"><option value="featured">Featured</option><option value="newest">Newest</option><option value="price_asc">Price: Low → High</option><option value="price_desc">Price: High → Low</option></select></label>
            {(search.type || search.vendor) && <button type="button" onClick={() => updateSearch({ type: undefined, vendor: undefined })} className="ml-auto text-[11px] uppercase tracking-widest text-muted-foreground hover:text-gold">Reset filters</button>}
            <p className="ml-auto text-[11px] uppercase tracking-widest text-muted-foreground">{filtered.length} {filtered.length === 1 ? "product" : "products"}</p>
          </div>
        )}
        {isLoading && <div className="flex justify-center py-32 text-muted-foreground"><Loader2 className="h-6 w-6 animate-spin" /></div>}
        {isError && <p className="py-16 text-center text-sm text-muted-foreground">Couldn't load products. Try refreshing.</p>}
        {data && filtered.length === 0 && <div className="py-24 text-center"><p className="font-display text-2xl">No products found</p><p className="mt-2 text-sm text-muted-foreground">Try clearing filters, or use ChatB2K™ to find the right ResoFlex equipment.</p></div>}
        {filtered.length > 0 && <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">{filtered.map((p, i) => <ProductCard key={p.node.id} product={p} placement={i} />)}</div>}
        <p className="mt-16 text-center text-xs uppercase tracking-widest text-muted-foreground">Secure checkout by Paystack · Card · Bank · USSD</p>
      </div>
    </section>
  );
}

function ProductCard({ product, placement = 99 }: { product: ShopifyProduct; placement?: number }) {
  const node = product.node;
  const variants = node.variants.edges.map((e) => e.node);
  const firstAvail = variants.find((v) => v.availableForSale) ?? variants[0];
  const image = node.images.edges[0]?.node;
  const price = node.priceRange.minVariantPrice;
  const addItem = useCartStore((s) => s.addItem);
  const isLoading = useCartStore((s) => s.isLoading);
  const [busy, setBusy] = useState(false);
  const handleAdd = async () => {
    if (!firstAvail) return;
    setBusy(true);
    try {
      await addItem({ product: { id: node.id, title: node.title, handle: node.handle, images: node.images }, variantId: firstAvail.id, variantTitle: firstAvail.title, price: firstAvail.price, quantity: 1, selectedOptions: firstAvail.selectedOptions });
      recordEngagement(node.id, "add_to_cart");
      toast.success(`Added ${node.title} to cart`, { position: "top-center" });
    } finally { setBusy(false); }
  };
  return (
    <article className="group flex flex-col border border-border/60 bg-card transition-colors hover:border-gold/60">
      <Link to="/product/$handle" params={{ handle: node.handle }} className="relative block">
        <ProductImage src={image?.url} alt={image?.altText} title={node.title} category={node.productType} productId={node.id} placement={placement} className="group-hover:[&>img]:scale-105" />
        {node.productType && <span className="absolute left-4 top-4 z-10 rounded-sm bg-background/80 px-3 py-1 text-[10px] uppercase tracking-widest text-gold backdrop-blur">{node.productType}</span>}
      </Link>
      <div className="flex flex-1 flex-col p-6">
        <Link to="/product/$handle" params={{ handle: node.handle }}><h2 className="font-display text-2xl leading-tight hover:text-gold">{node.title}</h2></Link>
        {node.description && <p className="mt-3 flex-1 line-clamp-3 text-sm text-muted-foreground">{node.description}</p>}
        <div className="mt-6 flex items-end justify-between gap-4 border-t border-border/60 pt-5"><div><p className="font-display text-2xl text-gold">{formatMoney(price)}</p><p className="text-xs uppercase tracking-widest text-muted-foreground">≈ {approxUSD(price)}</p></div><button type="button" onClick={handleAdd} disabled={busy || isLoading || !firstAvail?.availableForSale} className="inline-flex h-11 items-center justify-center rounded-sm bg-foreground px-5 text-xs font-semibold uppercase tracking-widest text-background transition-colors hover:bg-gold hover:text-gold-foreground disabled:opacity-50">{busy ? <Loader2 className="h-4 w-4 animate-spin" /> : firstAvail?.availableForSale ? "Add to cart" : "Sold out"}</button></div>
      </div>
    </article>
  );
}
