import { MAKAVELI_SERVICES as BASE, type MakaveliService } from "./makaveliCatalog";

const PRICE_OVERRIDES: Record<string, number> = {
  "express-relaxation-massage": 7000,
  "back-shoulder-recovery": 8000,
  "neck-upper-body-relief": 7000,
  "foot-leg-recovery": 7000,
  "gentle-mobility-stretch": 7000,
  "muscle-recovery": 10000,
  "private-relaxation": 12000,
  "aromatherapy-relaxation": 12000,
  "express-beauty-grooming": 7000,
  "basic-manicure": 5000,
  "basic-pedicure": 6000,
  "facial-skin-refresh": 10000,
  "scalp-head-relaxation": 7000,
  "couples-wellness-session": 20000,
  "private-couples-relaxation": 25000,
  "romantic-wellness-experience": 30000,
  "private-wellness-package": 20000,
  "hotel-guest-wellness": 15000,
  "in-room-wellness-service": 18000,
  "weekend-wellness-package": 30000,
  "business-traveller-recovery": 20000,
  "executive-guest-wellness": 30000,
  "womens-relaxation": 15000,
  "market-woman-recovery": 7000,
  "post-work-relaxation": 7000,
  "ladies-wellness-day": 30000,
  "mother-daughter-wellness": 20000,
  "mens-recovery": 10000,
  "executive-mens-wellness": 18000,
  "sports-muscle-recovery": 12000,
  "after-work-recovery": 8000,
  "mens-grooming-relaxation": 15000,
  "mobility-assessment": 7000,
  "gentle-stretch-mobility": 7000,
  "back-care-wellness": 10000,
  "joint-mobility-support": 10000,
  "post-activity-recovery": 12000,
  "corporate-wellness-session": 12000,
  "executive-wellness-package": 20000,
  "workplace-recovery-sessions": 60000,
  "corporate-wellness-day": 120000,
  "team-wellness-experience": 90000,
  "weekly-recovery-package": 25000,
  "monthly-wellness-package": 40000,
  "couples-wellness-package": 35000,
  "executive-package": 60000,
  "wellness-day-pass": 30000,
  "wellness-membership": 60000,
  "vip-private-wellness-membership": 120000,
  "fitness-functional-training": 5000,
  "personal-training": 8000,
  "yoga-mobility-classes": 5000,
};

export const formatNGN = (amount: number) => `₦${new Intl.NumberFormat("en-NG", { maximumFractionDigits: 0 }).format(amount)}`;

export const MAKAVELI_RESET_TICKET: MakaveliService = {
  slug: "reset-wellness-smoothie-ticket",
  name: "Reset Wellness Smoothie + Ticket",
  category: "Start Here",
  price: 1000,
  priceLabel: "₦1,000",
  priceMode: "fixed",
  description: "A low-cost welcome ticket paired with a Reset Wellness Smoothie. This is not a massage, therapy or full treatment.",
  features: ["One Reset Wellness Smoothie", "Wellness welcome ticket", "Basic preference check", "Next-step recommendation"],
  suitableFor: "New guests who want an accessible first touchpoint with Makaveli Wellness",
  duration: 20,
  booking: "pay",
  status: "available",
};

export const MAKAVELI_PRODUCTION_SERVICES: MakaveliService[] = [
  ...BASE.filter((service) => service.slug !== "wellness-reset").map((service) => {
    const price = PRICE_OVERRIDES[service.slug];
    if (price === undefined) return service;
    return { ...service, price, priceLabel: undefined, priceMode: "fixed" as const, booking: service.status === "available" ? "pay" as const : service.booking };
  }),
  MAKAVELI_RESET_TICKET,
];

export const MAKAVELI_PRODUCTION_CATEGORIES = Array.from(new Set(MAKAVELI_PRODUCTION_SERVICES.map((service) => service.category)));
export const getMakaveliProductionService = (slug?: string) => MAKAVELI_PRODUCTION_SERVICES.find((service) => service.slug === slug);

/** No staff names are invented. Live practitioner options are populated only when approved staff records exist. */
export type MakaveliPractitioner = { id: string; displayName: string; role: string; active: boolean };
export const MAKAVELI_PRACTITIONERS: MakaveliPractitioner[] = [];
