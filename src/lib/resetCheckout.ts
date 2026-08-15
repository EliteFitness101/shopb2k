const PRODUCTION_PAYSTACK_INITIALIZE_URL =
  "https://vbqjvmnhdtdhmeeudqnn.supabase.co/functions/v1/paystack-initialize";

export const RESET_OFFER = "₦1,000 Reset";
export const RESET_PRODUCT_ID = "reset";
export const RESET_AMOUNT_KOBO = 100000;
export const RESET_CURRENCY = "NGN";

export interface ResetCheckoutInput {
  email: string;
  fullName?: string;
  phone?: string;
}

interface Attribution {
  rsid?: string;
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
  funnel_origin?: string;
}

function getAttribution(): Attribution {
  if (typeof window === "undefined") return {};

  const params = new URLSearchParams(window.location.search);
  const read = (key: keyof Attribution): string | undefined => {
    const value = params.get(key) ?? localStorage.getItem(`resofit:${key}`) ?? undefined;
    return value || undefined;
  };

  const attribution: Attribution = {
    rsid: read("rsid"),
    utm_source: read("utm_source"),
    utm_medium: read("utm_medium"),
    utm_campaign: read("utm_campaign"),
    funnel_origin: read("funnel_origin"),
  };

  Object.entries(attribution).forEach(([key, value]) => {
    if (value) localStorage.setItem(`resofit:${key}`, value);
  });

  return attribution;
}

function getInitializerUrl(): string {
  const configured = import.meta.env.VITE_RESET_PAYSTACK_INITIALIZE_URL?.trim();
  if (configured) return configured;
  return PRODUCTION_PAYSTACK_INITIALIZE_URL;
}

export async function startResetCheckout(input: ResetCheckoutInput): Promise<string> {
  const email = input.email.trim();
  if (!email) throw new Error("Email is required to start checkout.");

  const attribution = getAttribution();
  const response = await fetch(getInitializerUrl(), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      email,
      fullName: input.fullName?.trim() || undefined,
      phone: input.phone?.trim() || undefined,
      amount: RESET_AMOUNT_KOBO,
      amountKobo: RESET_AMOUNT_KOBO,
      currency: RESET_CURRENCY,
      product: RESET_OFFER,
      productId: RESET_PRODUCT_ID,
      source: "shopb2k",
      funnel_origin: attribution.funnel_origin,
      rsid: attribution.rsid,
      utm_source: attribution.utm_source,
      utm_medium: attribution.utm_medium,
      utm_campaign: attribution.utm_campaign,
      attribution,
      currentUrl: typeof window !== "undefined" ? window.location.href : undefined,
    }),
  });

  if (!response.ok) throw new Error("Payment initialization failed.");

  const data = (await response.json()) as {
    authorizationUrl?: string;
    authorization_url?: string;
    checkout_url?: string;
    url?: string;
  };

  const authorizationUrl =
    data.authorizationUrl ?? data.authorization_url ?? data.checkout_url ?? data.url;

  if (!authorizationUrl || !/^https:\/\/checkout\.paystack\.com\//i.test(authorizationUrl)) {
    throw new Error("Payment initialization returned no valid Paystack authorization URL.");
  }

  return authorizationUrl;
}
