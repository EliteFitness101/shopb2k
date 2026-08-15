// Canonical CTA copy and destinations — reused across every page.
// The primary Reset CTA must enter personalization first; checkout is initiated
// only after the personalized recommendation is produced.
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
