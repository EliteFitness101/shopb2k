import { createFileRoute } from "@tanstack/react-router";
import { createClient } from "@supabase/supabase-js";
import { getMakaveliService } from "@/lib/makaveliCatalog";

const SUPABASE_URL = process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL ?? "https://vbqjvmnhdtdhmeeudqnn.supabase.co";
const SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE_KEY;
const PAYSTACK_SECRET = process.env.PAYSTACK_SECRET_KEY ?? process.env.PAYSTACK_SECRET;
const SITE_URL = process.env.PUBLIC_SITE_URL ?? "https://resofit.fit";

function db() {
  if (!SERVICE_ROLE) throw new Error("SUPABASE_SERVICE_ROLE_KEY is not configured");
  return createClient(SUPABASE_URL, SERVICE_ROLE, { auth: { persistSession: false } });
}
function clean(value: unknown, max = 500) { return typeof value === "string" ? value.trim().slice(0, max) : ""; }
function reference() { return `MKV-${Date.now().toString(36).toUpperCase()}-${crypto.randomUUID().slice(0,8).toUpperCase()}`; }

export const Route = createFileRoute("/api/makaveli/checkout")({
  server: { handlers: {
    POST: async ({ request }) => {
      try {
        const body = await request.json().catch(() => ({}));
        const service = getMakaveliService(clean(body.serviceSlug, 120));
        const name = clean(body.name, 120);
        const email = clean(body.email, 180).toLowerCase();
        const phone = clean(body.phone, 40);
        const preferredDate = clean(body.preferredDate, 20) || null;
        const preferredTime = clean(body.preferredTime, 40) || null;
        const notes = clean(body.notes, 1000) || null;
        if (!service) return Response.json({ ok:false, error:"Service not found" }, { status:404 });
        if (service.booking !== "pay" || service.status !== "available" || !service.price) return Response.json({ ok:false, error:"This service requires a booking request rather than online payment." }, { status:400 });
        if (!name || !email || !phone) return Response.json({ ok:false, error:"Name, email and phone are required." }, { status:400 });
        if (!/^\S+@\S+\.\S+$/.test(email)) return Response.json({ ok:false, error:"Enter a valid email address." }, { status:400 });
        if (!PAYSTACK_SECRET) return Response.json({ ok:false, error:"Payment gateway is not configured server-side." }, { status:503 });

        const bookingReference = reference();
        const client = db();
        const { error: insertError } = await client.from("makaveli_bookings").insert({
          booking_reference: bookingReference,
          service_slug: service.slug,
          service_name: service.name,
          amount_ngn: service.price,
          customer_name: name,
          customer_email: email,
          customer_phone: phone,
          preferred_date: preferredDate,
          preferred_time: preferredTime,
          notes,
          status: "payment_pending",
        });
        if (insertError) throw insertError;

        const paystack = await fetch("https://api.paystack.co/transaction/initialize", {
          method:"POST",
          headers:{ Authorization:`Bearer ${PAYSTACK_SECRET}`, "Content-Type":"application/json" },
          body:JSON.stringify({
            email,
            amount: Math.round(service.price * 100),
            currency:"NGN",
            callback_url:`${SITE_URL}/wellness/makaveli/checkout`,
            reference:bookingReference,
            metadata:{ booking_reference:bookingReference, service_slug:service.slug, service_name:service.name, customer_name:name, customer_phone:phone },
          }),
        });
        const payload = await paystack.json().catch(() => ({}));
        if (!paystack.ok || !payload?.status || !payload?.data?.authorization_url) {
          await client.from("makaveli_bookings").update({ status:"pending", payment_status:"initialization_failed", updated_at:new Date().toISOString() }).eq("booking_reference",bookingReference);
          return Response.json({ ok:false, error:payload?.message ?? "Paystack initialization failed", bookingReference }, { status:502 });
        }
        await client.from("makaveli_bookings").update({ payment_reference:payload.data.reference, paystack_access_code:payload.data.access_code, updated_at:new Date().toISOString() }).eq("booking_reference",bookingReference);
        return Response.json({ ok:true, bookingReference, reference:payload.data.reference, authorizationUrl:payload.data.authorization_url });
      } catch (error) {
        console.error("Makaveli checkout", error);
        return Response.json({ ok:false, error:error instanceof Error ? error.message : "Unable to start checkout" }, { status:500 });
      }
    },
  } },
});
