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
  | { state: "error"; message: string };

export const Route = createFileRoute("/payment/callback")({
  validateSearch: (search: Record<string, unknown>) => ({
    reference: typeof search.reference === "string" ? search.reference.trim() : "",
  }),
  loaderDeps: ({ search }) => ({ reference: search.reference }),
  loader: async ({ deps }): Promise<CallbackData> => {
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
      return { state: "failed", result };
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
  const title = success ? "Payment confirmed" : pending ? "Payment is processing" : failed ? "Payment not confirmed" : "Payment verification pending";
  const message = success
    ? "Your payment has been verified. Your purchase is now entering the fulfillment and access workflow."
    : pending
      ? result.result.message ?? "Paystack has not returned a final status yet. Please check again shortly."
      : failed
        ? result.result.message ?? "We could not confirm a successful payment. If your bank account was debited, contact support with your payment reference."
        : result.message;

  return (
    <main className="grid min-h-[70vh] place-items-center bg-background px-4 py-12 text-foreground">
      <section className="w-full max-w-lg rounded-3xl border border-border bg-card p-6 shadow-xl sm:p-8" aria-live="polite">
        {success ? <CheckCircle2 className="mx-auto mb-4 h-12 w-12 text-emerald-500" /> : pending ? <Clock3 className="mx-auto mb-4 h-12 w-12 text-primary" /> : <AlertCircle className="mx-auto mb-4 h-12 w-12 text-amber-500" />}
        <p className="text-center text-xs font-semibold uppercase tracking-[0.22em] text-muted-foreground">ResoFit secure checkout</p>
        <h1 className="mt-3 text-center text-2xl font-semibold sm:text-3xl">{title}</h1>
        <p className="mt-3 text-center text-sm leading-6 text-muted-foreground">{message}</p>

        {success && result.state === "success" && (result.result.experience?.title || result.result.experience?.name) && (
          <p className="mt-4 text-center font-medium">{result.result.experience.title ?? result.result.experience.name}</p>
        )}

        {referenceSuffix && (
          <p className="mt-5 text-center text-xs text-muted-foreground">Reference ending in <span className="font-mono">{referenceSuffix}</span></p>
        )}

        {success ? (
          <a href="https://dashboard.resofit.fit/login" className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90">
            Continue to your account <ArrowRight className="h-4 w-4" />
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
