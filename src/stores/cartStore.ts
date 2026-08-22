import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type { MoneyV2, ShopifyProductNode } from "@/lib/shopify";

export interface CartItem {
  lineId: string | null;
  product: Pick<ShopifyProductNode, "id" | "title" | "handle" | "sku" | "images">;
  variantId: string;
  variantTitle: string;
  price: MoneyV2;
  quantity: number;
  selectedOptions: Array<{ name: string; value: string }>;
}

interface CartStore {
  items: CartItem[];
  cartId: string | null;
  checkoutUrl: string | null;
  isLoading: boolean;
  isSyncing: boolean;
  addItem: (item: Omit<CartItem, "lineId">) => Promise<void>;
  updateQuantity: (variantId: string, quantity: number) => Promise<void>;
  removeItem: (variantId: string) => Promise<void>;
  clearCart: () => void;
  syncCart: () => Promise<void>;
  getCheckoutUrl: () => string | null;
}

export const useCartStore = create<CartStore>()(
  persist(
    (set, get) => ({
      items: [],
      cartId: null,
      checkoutUrl: null,
      isLoading: false,
      isSyncing: false,

      addItem: async (item) => {
        set({ isLoading: true });
        try {
          const current = get().items;
          const existing = current.find((i) => i.variantId === item.variantId);
          const next = existing
            ? current.map((i) =>
                i.variantId === item.variantId ? { ...i, quantity: i.quantity + item.quantity } : i,
              )
            : [...current, { ...item, lineId: crypto.randomUUID() }];
          set({ items: next, cartId: get().cartId ?? crypto.randomUUID(), checkoutUrl: null });
        } finally {
          set({ isLoading: false });
        }
      },

      updateQuantity: async (variantId, quantity) => {
        if (quantity <= 0) {
          await get().removeItem(variantId);
          return;
        }
        set({ isLoading: true });
        try {
          set({
            items: get().items.map((i) => (i.variantId === variantId ? { ...i, quantity } : i)),
            checkoutUrl: null,
          });
        } finally {
          set({ isLoading: false });
        }
      },

      removeItem: async (variantId) => {
        set({ isLoading: true });
        try {
          const next = get().items.filter((i) => i.variantId !== variantId);
          set({ items: next, cartId: next.length ? get().cartId : null, checkoutUrl: null });
        } finally {
          set({ isLoading: false });
        }
      },

      clearCart: () => set({ items: [], cartId: null, checkoutUrl: null }),
      getCheckoutUrl: () => null,
      syncCart: async () => undefined,
    }),
    {
      name: "resofit-cart",
      storage: createJSONStorage(() => localStorage),
      partialize: (s) => ({ items: s.items, cartId: s.cartId, checkoutUrl: null }),
    },
  ),
);
