// Single source of truth for ecosystem carousel cards.
export interface EcosystemCard {
  id: string;
  title: string;
  tagline: string;
  cta: string;
  href: string; // internal path or absolute URL
  external?: boolean;
  category: "Program" | "Assessment" | "Shop" | "Blog" | "Knowledge" | "Story" | "Partner";
}

export const ECOSYSTEM_CARDS: EcosystemCard[] = [
  {
    id: "personalize",
    title: "ChatB2K™ Wellness Assessment",
    tagline: "60 seconds to your personalized wellness protocol.",
    cta: "Start Assessment",
    href: "/personalize",
    category: "Assessment",
  },
  {
    id: "programs",
    title: "Signature Wellness Programs",
    tagline: "Longevity, mobility, strength and recovery — coached end-to-end.",
    cta: "Explore Programs",
    href: "/programs",
    category: "Program",
  },
  {
    id: "shop",
    title: "Premium Equipment",
    tagline: "Studio-grade hardware, delivered nationwide.",
    cta: "Shop Now",
    href: "/shop",
    category: "Shop",
  },
  {
    id: "knowledge",
    title: "Knowledge Hub",
    tagline: "Nutrition, recovery, healthy ageing — written by practitioners.",
    cta: "Read Guides",
    href: "/knowledge",
    category: "Knowledge",
  },
  {
    id: "blog",
    title: "The ResoFit Journal",
    tagline: "Field notes on strength, movement and modern wellness.",
    cta: "Open Journal",
    href: "/blog",
    category: "Blog",
  },
  {
    id: "success",
    title: "Success Stories",
    tagline: "Real Africans, real transformations, verified outcomes.",
    cta: "See Stories",
    href: "/success-stories",
    category: "Story",
  },
  {
    id: "elite",
    title: "Elite 1:1 Coaching",
    tagline: "Concierge programming with CoachB2K™.",
    cta: "Chat on WhatsApp",
    href: "https://wa.me/2348132255842?text=I%27d%20like%20to%20upgrade%20to%20Elite%20Coaching.",
    external: true,
    category: "Partner",
  },
  {
    id: "candera",
    title: "Candera Longevity",
    tagline: "Sister experience for healthy ageing and biomarker tracking.",
    cta: "Learn More",
    href: "/programs/longevity",
    category: "Partner",
  },
  {
    id: "resoluxe",
    title: "ResoLuxe Privé",
    tagline: "Members-only mobility, recovery and body-confidence rituals.",
    cta: "View Membership",
    href: "/programs/resoluxe",
    category: "Partner",
  },
];
