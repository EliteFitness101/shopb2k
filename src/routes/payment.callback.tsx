import { createFileRoute, useRouter } from "@tanstack/react-router";
import { CheckCircle2, AlertCircle, Clock3, ArrowRight, RefreshCw } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

type VerificationResult = {
  ok?: boolean;
  status?: string;
  message?: string;
  product_sku?: string;
  experience?: { title?: string; name?: string; description?: string } | null;
};

type CallbackData =
  | { state: "success"; result: VerificationResult }
  | { state: "pending"; result: VerificationResult }
  | { state: "failed"; result: VerificationResult }
  | { state: "cancelled"; message: string }
  | { state: "expired"; message: string }
  | { state: "reversed"; message: string }
  | { state: "refunded"; message: string }
  | { state: "error"; message: string };

export const Route = createFileRoute("/payment/callback")({
  validateSearch: (search: Record<string, unknown>) => ({
    reference: typeof search.reference === "string" && search.reference.trim()
      ? search.reference.trim()
      : typeof search.trxref === "string" ? search.trxref.trim() : "",
    status: typeof search.status === "string" ? search.status.trim().toLowerCase() : "",
  }),
  loaderDeps: ({ search }) => ({ reference: search.reference, status: search.status }),
  loader: async ({ deps }): Promise<CallbackData> => {
    if (!deps.reference && ["cancelled", "canceled", "abandoned"].includes(deps.status)) {
      return { state: "cancelled", message: "Checkout was not completed. No successful payment was confirmed, and you can safely choose another payment method." };
    }
    if (!deps.reference && ["expired", "timeout"].includes(deps.status)) {
      return { state: "expired", message: "This checkout expired without confirmation. If your bank account was debited, contact support before trying again." };
    }
    if (!deps.reference) {
      return { state: "error", message: "The payment reference is missing from this return link." };
    }

    try {
      const { data, error } = await supabase.functions.invoke("verify-order", {
        body: { reference: deps.reference },
      });
      if (error) {
        console.error("[payment-callback] verification request failed", error.message);
        return { state: "error", message: "We could not confirm the payment yet. It may still be processing." };
      }

      const result = data as VerificationResult | null;
      if (!result?.ok) {
        return { state: "error", message: result?.message ?? "We could not confirm this payment yet." };
      }
      if (result.status === "success") return { state: "success", result };
      if (result.status === "pending") return { state: "pending", result };
      if (["abandoned", "cancelled", "canceled"].includes(String(result.status))) {
        return { state: "cancelled", message: result.message ?? "Checkout was not completed. No successful payment was confirmed." };
      }
      if (result.status === "expired") return { state: "expired", message: result.message ?? "Checkout expired without payment confirmation." };
      if (result.status === "reversed") return { state: "reversed", message: result.message ?? "Paystack reports a payment reversal." };
      if (result.status === "refunded") return { state: "refunded", message: result.message ?? "This payment was refunded." };
      if (result.status === "failed") return { state: "failed", result };
      return { state: "pending", result };
    } catch (error) {
      console.error("[payment-callback] unexpected verification error", error);
      return { state: "error", message: "We could not confirm the payment right now. Please check again shortly." };
    }
  },
  pendingComponent: PaymentVerifying,
  component: PaymentCallback,
});

function PaymentVerifying() {
  return (
    <main className="grid min-h-[70vh] place-items-center bg-background px-4 py-12 text-foreground">
      <section className="w-full max-w-lg rounded-3xl border border-border bg-card p-8 text-center shadow-xl">
        <RefreshCw className="mx-auto mb-4 h-10 w-10 animate-spin text-primary" />
        <h1 className="text-2xl font-semibold">Verifying your payment</h1>
        <p className="mt-3 text-sm text-muted-foreground">Please keep this page open while we confirm the transaction with Paystack. Do not pay again.</p>
      </section>
    </main>
  );
}

function PaymentCallback() {
  const result = Route.useLoaderData();
  const search = Route.useSearch();
  const router = useRouter();
  const referenceSuffix = search.reference ? search.reference.slice(-8) : "";

  const success = result.state === "success";
  const pending = result.state === "pending";
  const failed = result.state === "failed";
  const cancelled = result.state === "cancelled";
  const terminal = failed || cancelled || result.state === "expired" || result.state === "reversed" || result.state === "refunded";
  const title = result.state === "success"
    ? "Payment confirmed"
    : result.state === "pending"
      ? "Payment is processing"
      : cancelled
        ? "Checkout cancelled"
        : result.state === "expired"
          ? "Checkout expired"
          : result.state === "reversed"
            ? "Payment reversed"
            : result.state === "refunded"
              ? "Payment refunded"
              : failed ? "Payment not confirmed" : "Payment verification pending";
  const message = result.state === "success"
    ? "Your payment has been verified. Your purchase is now entering the fulfillment and access workflow."
    : result.state === "pending"
      ? result.result.message ?? "Paystack has not returned a final status yet. Please check again shortly."
      : result.state === "failed"
        ? result.result.message ?? "Paystack confirmed that this payment failed."
        : result.message;
  const experienceTitle = result.state === "success"
    ? result.result.experience?.title ?? result.result.experience?.name
    : undefined;

  return (
    <main className="grid min-h-[70vh] place-items-center bg-background px-4 py-12 text-foreground">
      <section className="w-full max-w-lg rounded-3xl border border-border bg-card p-6 shadow-xl sm:p-8" aria-live="polite">
        {success ? <CheckCircle2 className="mx-auto mb-4 h-12 w-12 text-emerald-500" /> : terminal ? <AlertCircle className="mx-auto mb-4 h-12 w-12 text-destructive" /> : pending ? <Clock3 className="mx-auto mb-4 h-12 w-12 text-primary" /> : <AlertCircle className="mx-auto mb-4 h-12 w-12 text-amber-500" />}
        <p className="text-center text-xs font-semibold uppercase tracking-[0.22em] text-muted-foreground">ResoFit secure checkout</p>
        <h1 className="mt-3 text-center text-2xl font-semibold sm:text-3xl">{title}</h1>
        <p className="mt-3 text-center text-sm leading-6 text-muted-foreground">{message}</p>

        {experienceTitle && <p className="mt-4 text-center font-medium">{experienceTitle}</p>}

        {referenceSuffix && (
          <p className="mt-5 text-center text-xs text-muted-foreground">Reference ending in <span className="font-mono">{referenceSuffix}</span></p>
        )}

        {success ? (
          <a href="https://dashboard.resofit.fit/login" className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90">
            Continue to your account <ArrowRight className="h-4 w-4" />
          </a>
        ) : cancelled ? (
          <a href="https://www.resofit.fit/shop" className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90">
            Return to shop <ArrowRight className="h-4 w-4" />
          </a>
        ) : terminal ? (
          <a href="https://www.resofit.fit/shop" className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl border border-border px-4 py-3 text-sm font-semibold transition-opacity hover:opacity-90">
            Return to shop
          </a>
        ) : (
          <button onClick={() => void router.invalidate()} className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90">
            <RefreshCw className="h-4 w-4" /> Check payment again
          </button>
        )}

        <p className="mt-4 text-center text-xs leading-5 text-muted-foreground">
          If you paid as a guest, sign in or create your account using the same email address used at checkout to claim access.
        </p>
        <a href="https://www.resofit.fit" className="mt-4 block text-center text-sm underline underline-offset-4">Return to ResoFit</a>
      </section>
    </main>
  );
}
