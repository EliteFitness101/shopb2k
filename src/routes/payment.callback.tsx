import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useState, type FormEvent } from "react";
import { CheckCircle2, Download, Loader2, ShieldCheck } from "lucide-react";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { RESOFIT_SUPABASE_URL } from "@/lib/shopify";

export const Route = createFileRoute("/payment/callback")({
  validateSearch: (search: Record<string, unknown>) => ({
    reference: typeof search.reference === "string" ? search.reference : "",
  }),
  head: () => ({
    meta: [
      { title: "Payment confirmation — ResoFit" },
      { name: "description", content: "Confirm your ResoFit payment and access your digital delivery." },
    ],
  }),
  component: PaymentCallback,
});

function PaymentCallback() {
  const { reference } = Route.useSearch();
  const [email, setEmail] = useState("");
  const [emailInput, setEmailInput] = useState("");
  const [emailReady, setEmailReady] = useState(false);

  useEffect(() => {
    const savedEmail = window.sessionStorage.getItem("resofit_checkout_email") ?? "";
    const savedReference = window.sessionStorage.getItem("resofit_checkout_reference") ?? "";
    if (savedEmail) {
      setEmail(savedEmail);
      setEmailInput(savedEmail);
      setEmailReady(true);
    } else if (savedReference && savedReference === reference) {
      setEmailReady(false);
    }
  }, [reference]);

  const payment = useQuery({
    queryKey: ["paystack-payment-verification", reference],
    enabled: Boolean(reference),
    retry: false,
    staleTime: Infinity,
    queryFn: async () => {
      const response = await fetch(RESOFIT_SUPABASE_URL + "/functions/v1/verify-order?reference=" + encodeURIComponent(reference));
      const payload = await response.json().catch(() => ({}));
      if (!response.ok || payload.status !== "paid") {
        throw new Error(String(payload.message ?? payload.error ?? "Payment verification is still processing."));
      }
      return payload as Record<string, any>;
    },
  });

  const delivery = useQuery({
    queryKey: ["resofit-digital-delivery", reference, email],
    enabled: Boolean(reference && emailReady && email && payment.data?.status === "paid"),
    retry: false,
    refetchInterval: (query) => query.state.data?.success === true && query.state.data?.download_url ? false : 3000,
    queryFn: async () => {
      const response = await fetch(RESOFIT_SUPABASE_URL + "/functions/v1/storefront-delivery", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reference, email: email.trim().toLowerCase() }),
      });
      return await response.json().catch(() => ({ status: "processing" })) as Record<string, any>;
    },
  });

  useEffect(() => {
    if (delivery.data?.success && delivery.data?.download_url) {
      window.sessionStorage.removeItem("resofit_checkout_email");
      window.sessionStorage.removeItem("resofit_checkout_reference");
    }
  }, [delivery.data]);

  const submitEmail = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const normalized = emailInput.trim().toLowerCase();
    if (!normalized) return;
    setEmail(normalized);
    setEmailReady(true);
  };

  const downloadUrl = typeof delivery.data?.download_url === "string" ? delivery.data.download_url : "";

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <main className="mx-auto max-w-3xl px-4 py-12 sm:px-6 md:py-20">
        <section className="rounded-2xl border border-gold/20 bg-card p-6 sm:p-10">
          <div className="flex items-center gap-3 text-sm font-medium text-gold">
            <ShieldCheck className="h-5 w-5" /> Secure payment confirmation
          </div>
          <h1 className="mt-4 font-display text-3xl sm:text-4xl">Your ResoFit order</h1>
          {reference ? <p className="mt-3 break-all text-xs text-muted-foreground">Reference: {reference}</p> : null}
          {!reference ? (
            <p className="mt-6 text-sm text-muted-foreground">No payment reference was returned. Open your Paystack receipt and retry the confirmation link.</p>
          ) : payment.isLoading ? (
            <p className="mt-6 flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Verifying your payment with Paystack…</p>
          ) : payment.isError ? (
            <div className="mt-6 rounded-xl border border-border p-4">
              <p className="font-medium">Payment verification has not completed yet.</p>
              <p className="mt-2 text-sm text-muted-foreground">{payment.error instanceof Error ? payment.error.message : "Retry the verification when your Paystack receipt shows success."}</p>
              <button type="button" onClick={() => void payment.refetch()} className="mt-4 rounded-lg bg-gold px-4 py-2 text-sm font-semibold text-black">Check payment again</button>
            </div>
          ) : payment.data?.status === "paid" ? (
            <>
              <p className="mt-5 flex items-center gap-2 text-sm text-emerald-600"><CheckCircle2 className="h-4 w-4" /> Payment verified.</p>
              {payment.data?.experience?.product_name ? <p className="mt-2 text-sm text-muted-foreground">{payment.data.experience.product_name}</p> : null}
              {!emailReady ? (
                <form onSubmit={submitEmail} className="mt-6 space-y-3">
                  <label className="block text-sm">Enter the email used at checkout to securely retrieve your download.
                    <input type="email" required autoComplete="email" value={emailInput} onChange={(event) => setEmailInput(event.target.value)} className="mt-2 h-12 w-full rounded-lg border border-border bg-background px-3 text-base outline-none focus:border-gold" placeholder="you@example.com" />
                  </label>
                  <button type="submit" className="rounded-lg bg-gold px-4 py-2 text-sm font-semibold text-black">Retrieve my order</button>
                </form>
              ) : downloadUrl ? (
                <div className="mt-6 rounded-xl border border-emerald-500/30 bg-background p-5">
                  <p className="flex items-center gap-2 font-semibold"><CheckCircle2 className="h-5 w-5 text-emerald-600" /> Your digital guide is ready.</p>
                  <a href={downloadUrl} target="_blank" rel="noreferrer" className="mt-4 inline-flex items-center gap-2 rounded-lg bg-gold px-4 py-3 text-sm font-semibold text-black"><Download className="h-4 w-4" /> Open your private download</a>
                  <p className="mt-3 text-xs text-muted-foreground">The private link expires after 7 days. Return to this confirmation page to request a fresh link if needed.</p>
                </div>
              ) : (
                <div className="mt-6 rounded-xl border border-border p-4">
                  <p className="flex items-center gap-2 font-medium"><Loader2 className="h-4 w-4 animate-spin" /> Preparing your digital delivery…</p>
                  <p className="mt-2 text-sm text-muted-foreground">{delivery.data?.message ?? "Your payment is verified. The delivery service is preparing your private download link and this page will check again automatically."}</p>
                  {delivery.isError ? <button type="button" onClick={() => void delivery.refetch()} className="mt-3 text-sm font-semibold text-gold underline">Check delivery again</button> : null}
                </div>
              )}
            </>
          ) : null}
          <div className="mt-8 border-t border-border pt-5">
            <Link to="/" className="text-sm text-muted-foreground underline">Return to ResoFit</Link>
          </div>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}