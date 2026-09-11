import { createFileRoute } from "@tanstack/react-router";
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL ?? "https://vbqjvmnhdtdhmeeudqnn.supabase.co";
const SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE_KEY;
const PAYSTACK_SECRET = process.env.PAYSTACK_SECRET_KEY ?? process.env.PAYSTACK_SECRET;

export const Route = createFileRoute("/api/makaveli/verify")({
  server: { handlers: {
    GET: async ({ request }) => {
      try {
        const url = new URL(request.url);
        const reference = url.searchParams.get("reference")?.trim();
        if (!reference) return Response.json({ ok:false, error:"reference is required" }, { status:400 });
        if (!PAYSTACK_SECRET || !SERVICE_ROLE) return Response.json({ ok:false, error:"Payment verification is not configured server-side." }, { status:503 });
        const response = await fetch(`https://api.paystack.co/transaction/verify/${encodeURIComponent(reference)}`, { headers:{ Authorization:`Bearer ${PAYSTACK_SECRET}` } });
        const payload = await response.json().catch(() => ({}));
        if (!response.ok || !payload?.status) return Response.json({ ok:false, error:payload?.message ?? "Paystack verification failed" }, { status:502 });
        const data = payload.data;
        const client = createClient(SUPABASE_URL, SERVICE_ROLE, { auth:{ persistSession:false } });
        const { data: booking, error: lookupError } = await client.from("makaveli_bookings").select("*").eq("payment_reference",reference).maybeSingle();
        if (lookupError) throw lookupError;
        if (!booking) return Response.json({ ok:false, error:"Booking not found for payment reference." }, { status:404 });
        const expectedAmount = Math.round(Number(booking.amount_ngn) * 100);
        const paid = data.status === "success" && data.currency === "NGN" && Number(data.amount) === expectedAmount && String(data.customer?.email ?? "").toLowerCase() === String(booking.customer_email).toLowerCase();
        const nextStatus = paid ? "paid" : "payment_pending";
        await client.from("makaveli_bookings").update({ status:nextStatus, payment_status:String(data.status ?? "unknown"), updated_at:new Date().toISOString() }).eq("id",booking.id);
        return Response.json({ ok:true, paid, status:data.status, reference, bookingReference:booking.booking_reference, serviceName:booking.service_name, amount:booking.amount_ngn, currency:"NGN" });
      } catch (error) {
        console.error("Makaveli verification", error);
        return Response.json({ ok:false, error:error instanceof Error ? error.message : "Unable to verify payment" }, { status:500 });
      }
    },
  } },
});
