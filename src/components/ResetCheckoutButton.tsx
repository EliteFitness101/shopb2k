import { useState, type ReactNode } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { trackEvent } from "@/lib/revenueOS";
import { startResetCheckout } from "@/lib/resetCheckout";

export function ResetCheckoutButton({
  className = "",
  children = "Start ₦1,000 Reset",
}: {
  className?: string;
  children?: ReactNode;
}) {
  const [loading, setLoading] = useState(false);

  const start = async () => {
    if (loading) return;

    const email = window.prompt("Enter your email to continue to payment:")?.trim();
    if (!email) return;

    setLoading(true);
    trackEvent("cta_click");
    trackEvent("checkout_start");

    try {
      const authorizationUrl = await startResetCheckout({ email });
      window.location.assign(authorizationUrl);
    } catch {
      toast.error("We couldn't start your payment. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <button type="button" onClick={start} disabled={loading} className={className}>
      {loading ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : children}
    </button>
  );
}
