// Order Management — services: status engine, timeline, domain events.
import { publish } from "../kernel/events";
import { fail, ok, type ServiceResult } from "../kernel/types";
import { supabase } from "@/integrations/supabase/client";
import { orderRepository } from "./repository";
import type { FulfillmentStatus, Order, OrderLineInput, OrderStatus, PaymentStatus } from "./types";

/** Allowed order status transitions — the order status engine. */
const TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  draft: ["pending", "cancelled"],
  pending: ["confirmed", "cancelled"],
  confirmed: ["processing", "cancelled"],
  processing: ["fulfilled", "cancelled"],
  fulfilled: ["completed", "refunded"],
  completed: ["refunded"],
  cancelled: [],
  refunded: [],
};

export function canTransition(from: OrderStatus, to: OrderStatus): boolean {
  return TRANSITIONS[from].includes(to);
}

export function nextStatuses(from: OrderStatus): OrderStatus[] {
  return TRANSITIONS[from];
}

/** Human delivery message shown on order + product pages. */
export function deliveryMessage(order: Pick<Order, "fulfillment_status" | "status">): string {
  if (order.status === "cancelled") return "This order was cancelled.";
  if (order.status === "refunded") return "This order has been refunded.";
  switch (order.fulfillment_status as FulfillmentStatus) {
    case "fulfilled":
      return "Delivered — thank you for training with ResoFit.";
    case "partially_fulfilled":
      return "Part of your order has shipped. The rest follows shortly.";
    case "returned":
      return "Return received and processed.";
    default:
      return "Preparing your order. Lagos delivery in 1–3 days, nationwide 3–7 days.";
  }
}

function orderNumber(): string {
  return `RF-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).slice(2, 5).toUpperCase()}`;
}

export const orderService = {
  /** Creates an order + items, seeds the timeline, publishes `order.created`. */
  async createOrder(input: {
    userId: string | null;
    lines: OrderLineInput[];
    currency?: string;
    shippingTotal?: number;
    discountTotal?: number;
    taxTotal?: number;
    email?: string;
    phone?: string;
    rsid?: string | null;
    attribution?: Record<string, unknown>;
    shippingAddress?: Record<string, unknown>;
    source?: string;
    externalId?: string;
  }): Promise<ServiceResult<Order>> {
    if (!input.lines.length) return fail("Cannot create an empty order", "empty_order");
    if (input.lines.some((l) => l.quantity < 1 || l.unitPrice < 0)) {
      return fail("Invalid line item", "invalid_line");
    }

    const subtotal = input.lines.reduce((sum, l) => sum + l.unitPrice * l.quantity, 0);
    const shippingTotal = input.shippingTotal ?? 0;
    const discountTotal = input.discountTotal ?? 0;
    const taxTotal = input.taxTotal ?? 0;

    try {
      const order = await orderRepository.createOrder({
        orderNumber: orderNumber(),
        userId: input.userId,
        source: input.source ?? "shopify",
        currency: input.currency ?? "NGN",
        subtotal,
        shippingTotal,
        discountTotal,
        taxTotal,
        total: Math.max(subtotal + shippingTotal + taxTotal - discountTotal, 0),
        ...(input.email ? { email: input.email } : {}),
        ...(input.phone ? { phone: input.phone } : {}),
        ...(input.rsid ? { rsid: input.rsid } : {}),
        ...(input.attribution ? { attribution: input.attribution } : {}),
        ...(input.shippingAddress ? { shippingAddress: input.shippingAddress } : {}),
        ...(input.externalId ? { externalId: input.externalId } : {}),
      });

      await orderRepository.addItems(order.id, input.lines);

      publish(
        "order.created",
        {
          order_id: order.id,
          order_number: order.order_number,
          total: order.total,
          currency: order.currency,
          items: input.lines.length,
          rsid: order.rsid,
        },
        { trackAs: "purchase_success" },
      );

      return ok(order);
    } catch (error) {
      return fail(error instanceof Error ? error.message : "Could not create order");
    }
  },

  /** Operator status change, guarded by the status engine. Admin RLS applies. */
  async updateStatus(input: {
    orderId: string;
    from: OrderStatus;
    to: OrderStatus;
    paymentStatus?: PaymentStatus;
    fulfillmentStatus?: FulfillmentStatus;
    actorId?: string;
  }): Promise<ServiceResult<Order>> {
    if (!canTransition(input.from, input.to)) {
      return fail(`Cannot move an order from ${input.from} to ${input.to}`, "invalid_transition");
    }
    try {
      const { data, error } = await supabase
        .from("orders")
        .update({
          status: input.to,
          ...(input.paymentStatus ? { payment_status: input.paymentStatus } : {}),
          ...(input.fulfillmentStatus ? { fulfillment_status: input.fulfillmentStatus } : {}),
        })
        .eq("id", input.orderId)
        .select("*")
        .single();
      if (error) throw error;

      await supabase.from("order_timeline").insert({
        order_id: input.orderId,
        kind: "status_change",
        message: `${input.from} → ${input.to}`,
        actor_id: input.actorId ?? null,
      });

      if (input.paymentStatus === "paid") {
        publish("payment.verified", { order_id: input.orderId, total: data.total, currency: data.currency });
      }

      return ok(data);
    } catch (error) {
      return fail(error instanceof Error ? error.message : "Could not update order");
    }
  },

  async requestReturn(input: {
    orderId: string;
    userId: string;
    reason: string;
    items: Array<{ order_item_id: string; quantity: number }>;
  }): Promise<ServiceResult<true>> {
    if (input.reason.trim().length < 4) return fail("Please describe the reason", "invalid_reason");
    try {
      await orderRepository.requestReturn(input);
      return ok(true);
    } catch (error) {
      return fail(error instanceof Error ? error.message : "Could not request a return");
    }
  },
};
