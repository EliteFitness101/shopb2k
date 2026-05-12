import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { ShoppingCart, Minus, Plus, Trash2, ExternalLink, Loader2 } from "lucide-react";
import { useCartStore } from "@/stores/cartStore";
import { approxUSD, formatMoney } from "@/lib/shopify";

export function CartDrawer() {
  const [open, setOpen] = useState(false);
  const items = useCartStore((s) => s.items);
  const isLoading = useCartStore((s) => s.isLoading);
  const isSyncing = useCartStore((s) => s.isSyncing);
  const updateQuantity = useCartStore((s) => s.updateQuantity);
  const removeItem = useCartStore((s) => s.removeItem);
  const getCheckoutUrl = useCartStore((s) => s.getCheckoutUrl);
  const syncCart = useCartStore((s) => s.syncCart);

  const totalItems = items.reduce((s, i) => s + i.quantity, 0);
  const currency = items[0]?.price.currencyCode ?? "NGN";
  const totalAmount = items.reduce((s, i) => s + parseFloat(i.price.amount) * i.quantity, 0);
  const totalMoney = { amount: totalAmount.toString(), currencyCode: currency };

  useEffect(() => {
    if (open) syncCart();
  }, [open, syncCart]);

  const handleCheckout = () => {
    const url = getCheckoutUrl();
    if (url) {
      window.open(url, "_blank");
      setOpen(false);
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
              : `${totalItems} item${totalItems !== 1 ? "s" : ""} ready for checkout`}
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
                      <div
                        key={item.variantId}
                        className="flex gap-4 border border-border/60 p-3"
                      >
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
                            {formatMoney(item.price)}{" "}
                            <span className="text-xs text-muted-foreground">
                              · {approxUSD(item.price)}
                            </span>
                          </p>
                        </div>
                        <div className="flex flex-shrink-0 flex-col items-end gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6"
                            onClick={() => removeItem(item.variantId)}
                            aria-label="Remove"
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                          <div className="flex items-center gap-1">
                            <Button
                              variant="outline"
                              size="icon"
                              className="h-7 w-7"
                              onClick={() =>
                                updateQuantity(item.variantId, item.quantity - 1)
                              }
                            >
                              <Minus className="h-3 w-3" />
                            </Button>
                            <span className="w-8 text-center text-sm">{item.quantity}</span>
                            <Button
                              variant="outline"
                              size="icon"
                              className="h-7 w-7"
                              onClick={() =>
                                updateQuantity(item.variantId, item.quantity + 1)
                              }
                            >
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
                    <p className="text-xs uppercase tracking-widest text-muted-foreground">
                      Subtotal
                    </p>
                    <p className="font-display text-3xl text-gold">{formatMoney(totalMoney)}</p>
                    <p className="text-xs text-muted-foreground">≈ {approxUSD(totalMoney)}</p>
                  </div>
                  <p className="text-right text-[11px] uppercase tracking-widest text-muted-foreground">
                    Shipping & tax
                    <br />
                    calculated at checkout
                  </p>
                </div>
                <Button
                  onClick={handleCheckout}
                  className="h-12 w-full rounded-sm bg-gold text-xs font-semibold uppercase tracking-widest text-gold-foreground hover:bg-gold/90"
                  disabled={items.length === 0 || isLoading || isSyncing}
                >
                  {isLoading || isSyncing ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <>
                      <ExternalLink className="mr-2 h-4 w-4" />
                      Secure Checkout
                    </>
                  )}
                </Button>
                <p className="text-center text-[10px] uppercase tracking-widest text-muted-foreground">
                  Paystack · Card · Pay on delivery (Lagos)
                </p>
              </div>
            </>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
