// Order Management — types
import type { Database } from "@/integrations/supabase/types";

type T = Database["public"]["Tables"];

export type Order = T["orders"]["Row"];
export type OrderInsert = T["orders"]["Insert"];
export type OrderItem = T["order_items"]["Row"];
export type Shipment = T["shipments"]["Row"];
export type ShipmentEvent = T["shipment_events"]["Row"];
export type OrderReturn = T["returns"]["Row"];
export type Refund = T["refunds"]["Row"];
export type ExchangeRequest = T["exchange_requests"]["Row"];
export type GiftCard = T["gift_cards"]["Row"];
export type OrderTimelineEntry = T["order_timeline"]["Row"];

export type OrderStatus = Database["public"]["Enums"]["order_status"];
export type PaymentStatus = Database["public"]["Enums"]["payment_status"];
export type FulfillmentStatus = Database["public"]["Enums"]["fulfillment_status"];

export interface OrderLineInput {
  productHandle?: string;
  productId?: string;
  variantId?: string;
  title: string;
  variantTitle?: string;
  quantity: number;
  unitPrice: number;
  imageUrl?: string;
}

export interface OrderWithDetail extends Order {
  items: OrderItem[];
  shipments: Shipment[];
  timeline: OrderTimelineEntry[];
}
