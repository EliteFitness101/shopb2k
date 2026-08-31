import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { ShoppingCart, Minus, Plus, Trash2, Loader2, CreditCard } from "lucide-react";
import { toast } from "sonner";
import { useCartStore } from "@/stores/cartStore";
import { approxUSD, formatMoney } from "@/lib/shopify";
import { track } from "@/lib/tracking";

const SUPABASE_URL =
  import.meta.env.VITE_SUPABASE_URL ?? "https://vbqjvmnhdtdhmeeudqnn.supabase.co";
const PAYSTACK_INIT_URL = `${SUPABASE_URL.replace(/\/$/, "")}/functions/v1/paystack-init`;

function extractPaystackAuthorizationUrl(payload: unknown): string | null {
  if (!payload || typeof payload !== "object") return null;
  const data = (payload as Record<string, unknown>).data;
  if (data && typeof data === "object") {
    const nested = (data as Record<string, unknown>).authorization_url;
    if (typeof nested === "string" && /^https:\/\//.test(nested)) return nested;
  }
  const direct = (payload as Record<string, unknown>).authorization_url;
  return typeof direct === "string" && /^https:\/\//.test(direct) ? direct : null;
}

export function CartDrawer() {
  const [open, setOpen] = useState(false);
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [checkoutBusy, setCheckoutBusy] = useState(false);
  const items = useCartStore((s) => s.items);
  const isLoading = useCartStore((s) => s.isLoading);
  const updateQuantity = useCartStore((s) => s.updateQuantity);
  const removeItem = useCartStore((s) => s.removeItem);
  const clearCart = useCartStore((s) => s.clearCart);

  const totalItems = items.reduce((s, i) => s + i.quantity, 0);
  const currency = items[0]?.price.currencyCode ?? "NGN";
  const totalAmount = items.reduce((s, i) => parseFloat(i.price.amount) * i.quantity + s, 0);
  const totalMoney = { amount: totalAmount.toString(), currencyCode: currency };

  useEffect(() => {
    if (!open) return;
    const saved = localStorage.getItem("resofit-checkout-contact");
    if (saved) {
      try {
        const value = JSON.parse(saved);
        setFullName(value.fullName ?? "");
        setEmail(value.email ?? "");
        setPhone(value.phone ?? "");
        setAddress(value.address ?? "");
      } catch {
        /* ignore malformed local state */
      }
    }
  }, [open]);

  const handleCheckout = async () => {
    if (!items.length) return;
    if (items.length !== 1 || items[0].quantity !== 1) {
      toast.error("Paystack checkout currently supports one product per secure transaction. Please checkout one item at a time.");
      return;
    }

    const primary = items[0];
    const sku = primary.product.sku?.trim();
    if (!sku) {
      toast.error("This product is missing its canonical SKU. Please return to the product page and try again.");
      return;
    }
    if (!fullName.trim() || !email.trim() || !phone.trim() || !address.trim()) {
      toast.error("Complete your name, email, phone and delivery address first.");
      return;
    }

    setCheckoutBusy(true);
    try {
      localStorage.setItem(
        "resofit-checkout-contact",
        JSON.stringify({ fullName, email, phone, address }),
      );

      const response = await fetch(PAYSTACK_INIT_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sku,
          email: email.trim(),
          name: fullName.trim(),
          phone: phone.trim(),
          address: address.trim(),
        }),
      });
      const payload = await response.json().catch(() => null);
      const authorizationUrl = extractPaystackAuthorizationUrl(payload);
      if (!response.ok || !authorizationUrl) {
        throw new Error(
          payload &&
            typeof payload === "object" &&
            "error" in payload &&
            typeof payload.error === "string"
            ? payload.error
            : "Unable to start secure payment",
        );
      }

      track("checkout_start", {
        sku,
        item_count: totalItems,
        total: totalAmount,
        currency,
        source: "resofit_paystack",
      });
      window.location.assign(authorizationUrl);
    } catch (error) {
      console.error("Paystack checkout:", error);
      toast.error(error instanceof Error ? error.message : "Unable to start secure payment");
    } finally {
      setCheckoutBusy(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button
          variant="outline"
          size="icon"
          className="relative border-border bg-transparent text-foreground hover:border-gold hover:text-gold"
          aria-label="Open cart"
        >
          <ShoppingCart className="h-5 w-5" />
          {totalItems > 0 && (
            <Badge className="absolute -right-2 -top-2 flex h-5 w-5 items-center justify-center rounded-full p-0 text-[10px] bg-gold text-gold-foreground">
              {totalItems}
            </Badge>
          )}
        </Button>
      </SheetTrigger>
      <SheetContent className="flex h-full w-full flex-col bg-background sm:max-w-lg">
        <SheetHeader className="flex-shrink-0">
          <SheetTitle className="font-display text-2xl">Your Cart</SheetTitle>
          <SheetDescription>
            {totalItems === 0
              ? "No hardware in your cart yet."
              : `${totalItems} item${totalItems !== 1 ? "s" : ""} ready for secure payment`}
          </SheetDescription>
        </SheetHeader>

        <div className="flex min-h-0 flex-1 flex-col pt-6">
          {items.length === 0 ? (
            <div className="flex flex-1 items-center justify-center">
              <div className="text-center">
                <ShoppingCart className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
                <p className="text-muted-foreground">Your cart is empty</p>
              </div>
            </div>
          ) : (
            <>
              <div className="min-h-0 flex-1 overflow-y-auto pr-2">
                <div className="space-y-4">
                  {items.map((item) => {
                    const img = item.product.images?.edges?.[0]?.node;
                    return (
                      <div key={item.variantId} className="flex gap-4 border border-border/60 p-3">
                        <div className="h-20 w-20 flex-shrink-0 overflow-hidden bg-card">
                          {img && (
                            <img
                              src={img.url}
                              alt={img.altText ?? item.product.title}
                              className="h-full w-full object-cover"
                            />
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <h4 className="truncate font-medium">{item.product.title}</h4>
                          {item.variantTitle && item.variantTitle !== "Default Title" && (
                            <p className="text-xs text-muted-foreground">{item.variantTitle}</p>
                          )}
                          <p className="mt-1 font-display text-gold">
                            {formatMoney(item.price)} <span className="text-xs text-muted-foreground">· {approxUSD(item.price)}</span>
                          </p>
                        </div>
                        <div className="flex flex-shrink-0 flex-col items-end gap-2">
                          <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => removeItem(item.variantId)} aria-label="Remove">
                            <Trash2 className="h-3 w-3" />
                          </Button>
                          <div className="flex items-center gap-1">
                            <Button variant="outline" size="icon" className="h-7 w-7" onClick={() => updateQuantity(item.variantId, item.quantity - 1)}>
                              <Minus className="h-3 w-3" />
                            </Button>
                            <span className="w-8 text-center text-sm">{item.quantity}</span>
                            <Button variant="outline" size="icon" className="h-7 w-7" onClick={() => updateQuantity(item.variantId, item.quantity + 1)}>
                              <Plus className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="flex-shrink-0 space-y-4 border-t border-border/60 bg-background pt-4">
                <div className="flex items-end justify-between">
                  <div>
                    <p className="text-xs uppercase tracking-widest text-muted-foreground">Total</p>
                    <p className="font-display text-3xl text-gold">{formatMoney(totalMoney)}</p>
                    <p className="text-xs text-muted-foreground">≈ {approxUSD(totalMoney)}</p>
                  </div>
                  <p className="text-right text-[11px] uppercase tracking-widest text-muted-foreground">Secure Paystack<br />Card · Bank · USSD</p>
                </div>

                <div className="grid gap-2">
                  <Input value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Full name" autoComplete="name" />
                  <Input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email" type="email" autoComplete="email" />
                  <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="Phone" type="tel" autoComplete="tel" />
                  <Input value={address} onChange={(e) => setAddress(e.target.value)} placeholder="Delivery address" autoComplete="street-address" />
                </div>

                <Button onClick={handleCheckout} className="h-12 w-full rounded-sm bg-gold text-xs font-semibold uppercase tracking-widest text-gold-foreground hover:bg-gold/90" disabled={items.length === 0 || isLoading || checkoutBusy}>
                  {checkoutBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : <><CreditCard className="mr-2 h-4 w-4" />Pay securely with Paystack</>}
                </Button>
                <Button variant="ghost" className="w-full text-xs" onClick={clearCart}>Clear cart</Button>
              </div>
            </>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
