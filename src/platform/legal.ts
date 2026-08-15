// Compliance content registry. Plain data so pages stay presentational.
export interface LegalSection {
  heading: string;
  body: string[];
}

export interface LegalDocument {
  slug: string;
  path: string;
  title: string;
  metaTitle: string;
  description: string;
  updated: string;
  intro: string;
  sections: LegalSection[];
}

const SUPPORT_EMAIL = "hello@resofit.fit";

export const LEGAL_DOCUMENTS: Record<string, LegalDocument> = {
  privacy: {
    slug: "privacy",
    path: "/privacy",
    title: "Privacy Policy",
    metaTitle: "Privacy Policy — ResoFit",
    description:
      "How ResoFit collects, uses, and protects your personal data across our wellness platform, shop, and ChatB2K™ experiences.",
    updated: "2026-08-01",
    intro:
      "ResoFit is a privacy-first platform. We collect the minimum data required to personalize your wellness journey and fulfil your orders.",
    sections: [
      {
        heading: "Data we collect",
        body: [
          "Account data: name, email address, phone number, and authentication identifiers when you create an account.",
          "Assessment data: goals, activity level, and dietary preferences you submit to the ChatB2K™ Assessment.",
          "Commerce data: order history, delivery address, and payment status. Card details are never stored by ResoFit — they are handled by Paystack and Shopify.",
          "Attribution data: campaign parameters (utm_*), a ResoFit identifier (RSID), device type, and referrer.",
        ],
      },
      {
        heading: "How we use your data",
        body: [
          "To personalize programme and equipment recommendations.",
          "To process, ship, and support your orders.",
          "To send transactional messages and, where you have opted in, wellness updates.",
          "To measure marketing performance in aggregate.",
        ],
      },
      {
        heading: "Processors we rely on",
        body: [
          "Supabase — authentication, database, and storage.",
          "Shopify — product catalogue, cart, and checkout.",
          "Paystack — payment processing for Nigerian customers.",
          "Make.com — workflow automation and notifications.",
          "Analytics providers (GA4, Meta, TikTok) where enabled.",
        ],
      },
      {
        heading: "Your rights",
        body: [
          `You may request access, correction, export, or deletion of your data at any time by emailing ${SUPPORT_EMAIL}.`,
          "You can withdraw marketing consent at any time using the unsubscribe link in any message.",
        ],
      },
      {
        heading: "Retention & security",
        body: [
          "Order and financial records are retained as required by Nigerian tax and consumer law.",
          "Access to personal data is restricted by row-level security policies and role-based permissions.",
        ],
      },
    ],
  },

  terms: {
    slug: "terms",
    path: "/terms",
    title: "Terms of Service",
    metaTitle: "Terms of Service — ResoFit",
    description:
      "The terms that govern your use of the ResoFit platform, wellness programmes, equipment shop, and ChatB2K™ services.",
    updated: "2026-08-01",
    intro:
      "By using ResoFit you agree to these terms. Please read them before purchasing a programme or piece of equipment.",
    sections: [
      {
        heading: "Use of the platform",
        body: [
          "You must be at least 18 years old, or have guardian consent, to create an account.",
          "You are responsible for keeping your login credentials secure.",
          "You agree not to misuse the platform, attempt unauthorized access, or disrupt service availability.",
        ],
      },
      {
        heading: "Wellness disclaimer",
        body: [
          "ResoFit programmes and ChatB2K™ recommendations are educational and are not medical advice.",
          "Consult a qualified healthcare professional before starting any new training or nutrition programme, especially if you have an existing condition.",
        ],
      },
      {
        heading: "Purchases & pricing",
        body: [
          "Prices are displayed in Nigerian Naira and, where shown, an indicative US Dollar equivalent.",
          "Orders are confirmed only after successful payment authorization.",
          "We may cancel and refund an order where stock, pricing, or fulfilment errors occur.",
        ],
      },
      {
        heading: "Intellectual property",
        body: [
          "ResoFit™, ResoFlex™, and ChatB2K™ names, content, and programme structures remain our property.",
          "You may not resell, republish, or reproduce platform content without written permission.",
        ],
      },
      {
        heading: "Liability",
        body: [
          "To the extent permitted by law, ResoFit's liability is limited to the amount you paid for the affected order or programme.",
        ],
      },
    ],
  },

  cookies: {
    slug: "cookies",
    path: "/cookies",
    title: "Cookie Policy",
    metaTitle: "Cookie Policy — ResoFit",
    description:
      "Which cookies and local storage keys ResoFit uses for cart persistence, attribution, and analytics — and how to control them.",
    updated: "2026-08-01",
    intro:
      "We use a small number of cookies and browser storage keys. None are used to build advertising profiles beyond the analytics tools listed below.",
    sections: [
      {
        heading: "Essential",
        body: [
          "Cart contents and session persistence, so your basket survives a refresh.",
          "Authentication session tokens issued when you sign in.",
        ],
      },
      {
        heading: "Attribution",
        body: [
          "Campaign parameters (utm_source, utm_campaign, utm_medium) and your ResoFit identifier (RSID) so we can credit the right partner or campaign.",
        ],
      },
      {
        heading: "Analytics & advertising",
        body: [
          "Where configured, Google Analytics 4, Meta Pixel, and TikTok Pixel set their own cookies to measure page views, product views, and purchases.",
        ],
      },
      {
        heading: "Managing cookies",
        body: [
          "You can clear cookies and site data at any time from your browser settings. Clearing essential storage will empty your cart and sign you out.",
          "Browser-level tracking prevention and ad blockers are respected — the platform remains fully usable without analytics.",
        ],
      },
    ],
  },

  "refund-policy": {
    slug: "refund-policy",
    path: "/refund-policy",
    title: "Refund Policy",
    metaTitle: "Refund Policy — ResoFit",
    description:
      "ResoFit's refund and return windows for equipment, programmes, and memberships, including how to start a return.",
    updated: "2026-08-01",
    intro:
      "We want the equipment and programmes you buy to work for you. If something is wrong, we will make it right.",
    sections: [
      {
        heading: "Equipment returns",
        body: [
          "You may request a return within 7 days of delivery, provided the item is unused and in its original packaging.",
          "Damaged or incorrect items are replaced or refunded in full, including return shipping.",
          "Custom-fabricated equipment is non-returnable once production has started.",
        ],
      },
      {
        heading: "Programmes & memberships",
        body: [
          "Digital programmes may be refunded within 7 days of purchase if you have not downloaded the full programme.",
          "Memberships can be cancelled at any time and remain active until the end of the paid period.",
        ],
      },
      {
        heading: "How refunds are issued",
        body: [
          "Refunds are returned to the original payment method via Paystack or Shopify.",
          "Bank settlement usually completes within 5–10 business days.",
        ],
      },
      {
        heading: "Starting a return",
        body: [
          `Email ${SUPPORT_EMAIL} or message CoachB2K™ on WhatsApp with your order number and a short description.`,
        ],
      },
    ],
  },

  "shipping-policy": {
    slug: "shipping-policy",
    path: "/shipping-policy",
    title: "Shipping Policy",
    metaTitle: "Shipping Policy — ResoFit",
    description:
      "Delivery timelines, shipping costs, and tracking for ResoFit equipment orders across Lagos, Nigeria, and international destinations.",
    updated: "2026-08-01",
    intro: "All equipment ships from our Lagos workshop. Shipping is calculated at checkout.",
    sections: [
      {
        heading: "Processing time",
        body: [
          "In-stock items are dispatched within 1–3 business days.",
          "Custom-fabricated equipment is dispatched within 10–21 business days depending on specification.",
        ],
      },
      {
        heading: "Delivery estimates",
        body: [
          "Lagos: 1–3 business days.",
          "Other Nigerian states: 3–7 business days.",
          "International: 7–21 business days, subject to customs.",
        ],
      },
      {
        heading: "Shipping costs",
        body: [
          "Rates are weight- and destination-based and shown before payment.",
          "Heavy items such as racks and plate sets may require a freight quote, which our team will confirm before dispatch.",
        ],
      },
      {
        heading: "Tracking",
        body: [
          "You receive a tracking reference and delivery status updates as each shipment moves through fulfilment.",
          "Import duties and taxes on international orders are the responsibility of the recipient.",
        ],
      },
    ],
  },

  accessibility: {
    slug: "accessibility",
    path: "/accessibility",
    title: "Accessibility Statement",
    metaTitle: "Accessibility — ResoFit",
    description:
      "ResoFit's commitment to WCAG 2.1 AA accessibility across the wellness platform, shop, and community experiences.",
    updated: "2026-08-01",
    intro:
      "We are working toward WCAG 2.1 Level AA conformance across every ResoFit surface. Accessibility is treated as a product requirement, not an afterthought.",
    sections: [
      {
        heading: "What we have implemented",
        body: [
          "Semantic landmarks, a single H1 per page, and descriptive link text.",
          "Visible keyboard focus states and full keyboard operability for navigation, cart, and checkout.",
          "Descriptive alternative text on product and editorial imagery.",
          "Captions and native controls on video content, with autoplay muted and pausable.",
          "Colour contrast targets of at least 4.5:1 for body text.",
        ],
      },
      {
        heading: "Known limitations",
        body: [
          "Third-party checkout and payment surfaces are governed by Shopify and Paystack accessibility support.",
          "Some interactive game surfaces in the community layer are still being audited for screen-reader parity.",
        ],
      },
      {
        heading: "Feedback",
        body: [
          `If you encounter a barrier, email ${SUPPORT_EMAIL} with the page and the issue. We aim to respond within 5 business days.`,
        ],
      },
    ],
  },
};

export const LEGAL_PATHS = Object.values(LEGAL_DOCUMENTS).map((d) => d.path);

export function legalDoc(slug: string): LegalDocument {
  const doc = LEGAL_DOCUMENTS[slug];
  if (!doc) throw new Error(`Unknown legal document: ${slug}`);
  return doc;
}
