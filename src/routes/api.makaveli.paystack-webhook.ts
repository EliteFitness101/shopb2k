import { createFileRoute } from "@tanstack/react-router";
import { createClient } from "@supabase/supabase-js";
import { createHmac, timingSafeEqual } from "node:crypto";

const SUPABASE_URL =
  process.env.SUPABASE_URL ??
  process.env.VITE_SUPABASE_URL ??
  "https://vbqjvmnhdtdhmeeudqnn.supabase.co";
const SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE_KEY;
const PAYSTACK_SECRET = process.env.PAYSTACK_SECRET_KEY ?? process.env.PAYSTACK_SECRET;
const MAX_WEBHOOK_BYTES = 1 * 1024 * 1024;

function validSignature(rawBody: Uint8Array, signature: string): boolean {
  if (!PAYSTACK_SECRET || !/^[a-f0-9]{128}$/i.test(signature)) return false;

  const expected = createHmac("sha512", PAYSTACK_SECRET).update(rawBody).digest();
  const supplied = Buffer.from(signature, "hex");
  return supplied.length === expected.length && timingSafeEqual(expected, supplied);
}

export const Route = createFileRoute("/api/makaveli/paystack-webhook")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const declaredLength = Number(request.headers.get("content-length") ?? "0");
          if (declaredLength > MAX_WEBHOOK_BYTES) {
            return new Response("Payload too large", { status: 413 });
          }

          // Paystack signs the exact raw request body. Verify its bytes before parsing
          // JSON or performing any database writes.
          const rawBody = new Uint8Array(await request.arrayBuffer());
          if (rawBody.byteLength === 0 || rawBody.byteLength > MAX_WEBHOOK_BYTES) {
            return new Response("Invalid payload size", { status: 413 });
          }

          const signature = request.headers.get("x-paystack-signature") ?? "";
          if (!validSignature(rawBody, signature)) {
            return new Response("Unauthorized", { status: 401 });
          }
          if (!SERVICE_ROLE) {
            return new Response("Server not configured", { status: 503 });
          }

          const raw = new TextDecoder("utf-8", { fatal: true }).decode(rawBody);
          const event = JSON.parse(raw);
          if (event?.event !== "charge.success") {
            return Response.json({ ok: true, ignored: true });
          }

          const reference = String(event.data?.reference ?? "").trim();
          if (!reference) return Response.json({ ok: true, ignored: true });

          const client = createClient(SUPABASE_URL, SERVICE_ROLE, {
            auth: { persistSession: false },
          });
          const { data: booking, error: bookingError } = await client
            .from("makaveli_bookings")
            .select("*")
            .eq("payment_reference", reference)
            .maybeSingle();

          if (bookingError) throw bookingError;
          if (!booking) return Response.json({ ok: true, ignored: true });

          const amountNgn = Number(booking.amount_ngn);
          const expectedKobo = Math.round(amountNgn * 100);
          const paid =
            Number.isFinite(amountNgn) &&
            amountNgn > 0 &&
            event.data?.status === "success" &&
            event.data?.currency === "NGN" &&
            Number(event.data?.amount) === expectedKobo &&
            String(event.data?.customer?.email ?? "").toLowerCase() ===
              String(booking.customer_email ?? "").toLowerCase();

          if (!paid) return Response.json({ ok: true, paid: false });

          const now = new Date().toISOString();
          const serviceSku = `MAKAVELI:${booking.service_slug}`;
          const { data: payment, error: paymentError } = await client
            .from("payments")
            .upsert(
              {
                user_id: null,
                amount: amountNgn,
                currency: "NGN",
                status: "success",
                plan_type: booking.service_name,
                paystack_ref: reference,
                customer_email: booking.customer_email,
                product_sku: serviceSku,
                funnel_origin: "makaveli_wellness",
                gross_amount: expectedKobo,
                paid_at: event.data?.paid_at ?? now,
                gateway_response: event.data?.gateway_response ?? "Approved",
                reconciled: true,
                reconciled_at: now,
                settlement_status: "pending",
                metadata: {
                  booking_reference: booking.booking_reference,
                  service_slug: booking.service_slug,
                  service_name: booking.service_name,
                  preferred_date: booking.preferred_date,
                  preferred_time: booking.preferred_time,
                  practitioner_preference: booking.practitioner_preference,
                },
              },
              { onConflict: "paystack_ref" },
            )
            .select("id")
            .maybeSingle();

          if (paymentError) throw paymentError;
          if (!payment) throw new Error("Canonical payment record could not be persisted");

          const { error: revenueError } = await client
            .from("revenue_events")
            .upsert(
              {
                payment_reference: reference,
                payment_id: payment.id,
                amount: amountNgn,
                currency: "NGN",
                email: booking.customer_email,
                product_slug: serviceSku,
                status: "success",
              },
              { onConflict: "payment_reference" },
            );
          if (revenueError) throw revenueError;

          const { data: existingFulfillment, error: fulfillmentLookupError } = await client
            .from("resofit_fulfillment_orders")
            .select("id")
            .eq("payment_reference", reference)
            .maybeSingle();
          if (fulfillmentLookupError) throw fulfillmentLookupError;
          let fulfillment = existingFulfillment;

          if (!fulfillment) {
            const created = await client
              .from("resofit_fulfillment_orders")
              .insert({
                payment_id: payment.id,
                payment_reference: reference,
                customer_id: null,
                customer_email: booking.customer_email,
                status: "confirmed",
                hub_code: "SERVICE",
                currency: "NGN",
                total_amount: amountNgn,
                metadata: {
                  mode: "service",
                  source: "makaveli",
                  booking_reference: booking.booking_reference,
                  service_slug: booking.service_slug,
                  service_name: booking.service_name,
                },
              })
              .select("id")
              .single();

            if (created.error) throw created.error;
            fulfillment = created.data;

            const { error: itemError } = await client
              .from("resofit_fulfillment_items")
              .insert({
                fulfillment_order_id: fulfillment.id,
                product_id: null,
                sku: serviceSku,
                quantity: 1,
                metadata: {
                  mode: "service",
                  booking_reference: booking.booking_reference,
                  service_name: booking.service_name,
                },
              });
            if (itemError) throw itemError;

            const { error: fulfillmentEventError } = await client
              .from("resofit_fulfillment_events")
              .insert({
                fulfillment_order_id: fulfillment.id,
                from_status: "payment_pending",
                to_status: "confirmed",
                detail: {
                  payment_reference: reference,
                  booking_reference: booking.booking_reference,
                  service_slug: booking.service_slug,
                },
              });
            if (fulfillmentEventError) throw fulfillmentEventError;
          }

          // Set the booking's success state only after signature, amount/currency/
          // customer checks and canonical payment/fulfillment persistence succeed.
          const { error: bookingUpdateError } = await client
            .from("makaveli_bookings")
            .update({
              status: "confirmed",
              payment_status: "success",
              updated_at: now,
            })
            .eq("id", booking.id);
          if (bookingUpdateError) throw bookingUpdateError;

          return Response.json({
            ok: true,
            paid: true,
            bookingReference: booking.booking_reference,
            reference,
            fulfillmentStatus: "confirmed",
          });
        } catch (error) {
          console.error("Makaveli Paystack webhook", error);
          return new Response("Bad request", { status: 400 });
        }
      },
    },
  },
});
