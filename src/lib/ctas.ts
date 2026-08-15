import { startResetCheckout } from "@/lib/resetCheckout";
import { trackEvent } from "@/lib/revenueOS";

// Canonical CTA copy — reused across every page. Do not duplicate elsewhere.
export const CTA = {
  primary: "Start My Personalized Plan",
  assessment: "Take My Wellness Assessment",
  commerce: "Shop Premium Equipment",
  knowledge: "Read Wellness Guides",
  community: "Success Stories",
  support: "Chat with CoachB2K™",
} as const;

export const ROUTES = {
  personalize: "/personalize",
  assessment: "/personalize",
  shop: "/shop",
  blog: "/blog",
  knowledge: "/knowledge",
  programs: "/programs",
  successStories: "/success-stories",
  about: "/about",
  contact: "/contact",
} as const;

export const WHATSAPP_NUMBER = "2348132255842";
export const whatsappUrl = (msg = "Hi CoachB2K™, I'd like to learn more about ResoFit.") =>
  `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(msg)}`;

// The existing homepage primary Reset CTA still points at /personalize.
// Intercept only that primary CTA so the payment handoff starts the canonical
// production Paystack initializer. Assessment links remain unchanged.
if (typeof window !== "undefined") {
  document.addEventListener("click", async (event) => {
    const target = event.target as HTMLElement | null;
    const anchor = target?.closest("a");
    if (!anchor || anchor.getAttribute("href") !== ROUTES.personalize) return;
    if (!anchor.textContent?.includes(CTA.primary)) return;

    event.preventDefault();

    const email = window.prompt("Enter your email to continue to payment:")?.trim();
    if (!email) return;

    trackEvent("cta_click");
    trackEvent("checkout_start");

    try {
      const authorizationUrl = await startResetCheckout({ email });
      window.location.assign(authorizationUrl);
    } catch {
      window.alert("We couldn't start your payment. Please try again.");
    }
  });
}
