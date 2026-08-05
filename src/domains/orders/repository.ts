// Order Management — repository
import { supabase } from "@/integrations/supabase/client";
import type {
  ExchangeRequest,
  Order,
  OrderItem,
  OrderLineInput,
  OrderReturn,
  OrderTimelineEntry,
  Refund,
  Shipment,
  ShipmentEvent,
} from "./types";

export const orderRepository = {
  async listMyOrders(limit = 50): Promise<Order[]> {
    const { data, error } = await supabase
      .from("orders")
      .select("*")
      .order("placed_at", { ascending: false })
      .limit(limit);
    if (error) throw error;
    return data ?? [];
  },

  async findById(id: string): Promise<Order | null> {
    const { data, error } = await supabase.from("orders").select("*").eq("id", id).maybeSingle();
    if (error) throw error;
    return data;
  },

  async createOrder(input: {
    orderNumber: string;
    userId: string | null;
    source: string;
    currency: string;
    subtotal: number;
    shippingTotal: number;
    discountTotal: number;
    taxTotal: number;
    total: number;
    email?: string;
    phone?: string;
    rsid?: string | null;
    attribution?: Record<string, unknown>;
    shippingAddress?: Record<string, unknown>;
    externalId?: string;
  }): Promise<Order> {
    const { data, error } = await supabase
      .from("orders")
      .insert({
        order_number: input.orderNumber,
        user_id: input.userId,
        source: input.source,
        currency: input.currency,
        subtotal: input.subtotal,
        shipping_total: input.shippingTotal,
        discount_total: input.discountTotal,
        tax_total: input.taxTotal,
        total: input.total,
        email: input.email ?? null,
        phone: input.phone ?? null,
        rsid: input.rsid ?? null,
        attribution: (input.attribution ?? {}) as never,
        shipping_address: (input.shippingAddress ?? {}) as never,
        external_id: input.externalId ?? null,
      })
      .select("*")
      .single();
    if (error) throw error;
    return data;
  },

  async addItems(orderId: string, lines: OrderLineInput[]): Promise<OrderItem[]> {
    if (!lines.length) return [];
    const { data, error } = await supabase
      .from("order_items")
      .insert(
        lines.map((line) => ({
          order_id: orderId,
          product_handle: line.productHandle ?? null,
          product_id: line.productId ?? null,
          variant_id: line.variantId ?? null,
          title: line.title,
          variant_title: line.variantTitle ?? null,
          quantity: line.quantity,
          unit_price: line.unitPrice,
          total: line.unitPrice * line.quantity,
          image_url: line.imageUrl ?? null,
        })),
      )
      .select("*");
    if (error) throw error;
    return data ?? [];
  },

  async listItems(orderId: string): Promise<OrderItem[]> {
    const { data, error } = await supabase.from("order_items").select("*").eq("order_id", orderId);
    if (error) throw error;
    return data ?? [];
  },

  async listShipments(orderId: string): Promise<Shipment[]> {
    const { data, error } = await supabase
      .from("shipments")
      .select("*")
      .eq("order_id", orderId)
      .order("created_at", { ascending: true });
    if (error) throw error;
    return data ?? [];
  },

  async listShipmentEvents(shipmentId: string): Promise<ShipmentEvent[]> {
    const { data, error } = await supabase
      .from("shipment_events")
      .select("*")
      .eq("shipment_id", shipmentId)
      .order("occurred_at", { ascending: false });
    if (error) throw error;
    return data ?? [];
  },

  async listTimeline(orderId: string): Promise<OrderTimelineEntry[]> {
    const { data, error } = await supabase
      .from("order_timeline")
      .select("*")
      .eq("order_id", orderId)
      .order("created_at", { ascending: false });
    if (error) throw error;
    return data ?? [];
  },

  async requestReturn(input: {
    orderId: string;
    userId: string;
    reason: string;
    items: Array<{ order_item_id: string; quantity: number }>;
  }): Promise<OrderReturn> {
    const { data, error } = await supabase
      .from("returns")
      .insert({
        order_id: input.orderId,
        user_id: input.userId,
        reason: input.reason,
        items: input.items as never,
      })
      .select("*")
      .single();
    if (error) throw error;
    return data;
  },

  async requestExchange(input: {
    orderId: string;
    userId: string;
    requestedItems: Array<Record<string, unknown>>;
    notes?: string;
  }): Promise<ExchangeRequest> {
    const { data, error } = await supabase
      .from("exchange_requests")
      .insert({
        order_id: input.orderId,
        user_id: input.userId,
        requested_items: input.requestedItems as never,
        notes: input.notes ?? null,
      })
      .select("*")
      .single();
    if (error) throw error;
    return data;
  },

  async listRefunds(orderId: string): Promise<Refund[]> {
    const { data, error } = await supabase.from("refunds").select("*").eq("order_id", orderId);
    if (error) throw error;
    return data ?? [];
  },

  // --- operator views (admin RLS) ---

  async listAllOrders(limit = 100): Promise<Order[]> {
    const { data, error } = await supabase
      .from("orders")
      .select("*")
      .order("placed_at", { ascending: false })
      .limit(limit);
    if (error) throw error;
    return data ?? [];
  },

  async countByStatus(): Promise<Record<string, number>> {
    const { data, error } = await supabase.from("orders").select("status");
    if (error) throw error;
    return (data ?? []).reduce<Record<string, number>>((acc, row) => {
      acc[row.status] = (acc[row.status] ?? 0) + 1;
      return acc;
    }, {});
  },
};
