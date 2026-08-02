// Membership registry — current tiers plus prepared future tiers.
import { PlatformRoutes } from "./routes";

export type MembershipId =
  | "starter"
  | "coachingCall"
  | "mealPack"
  | "accountability"
  | "premium"
  | "elite"
  | "corporate"
  | "coach"
  | "affiliate";

export interface Membership {
  id: MembershipId;
  name: string;
  sku?: string;
  /** Where a prospect signs up. */
  href: string;
  external?: boolean;
  status: "active" | "planned";
  benefits: string[];
}

export const MEMBERSHIP_REGISTRY: Record<MembershipId, Membership> = {
  starter: {
    id: "starter",
    name: "Starter Program",
    sku: "RF-PROG-STARTER",
    href: PlatformRoutes.programs,
    status: "active",
    benefits: ["Structured wellness track", "ChatB2K™ plan", "Progress check-ins"],
  },
  coachingCall: {
    id: "coachingCall",
    name: "Coaching Call",
    sku: "RF-SVC-COACHING-CALL",
    href: PlatformRoutes.contact,
    status: "active",
    benefits: ["1:1 session", "Personalized adjustments"],
  },
  mealPack: {
    id: "mealPack",
    name: "Meal Pack",
    sku: "RF-SVC-MEAL-PACK",
    href: PlatformRoutes.programs,
    status: "active",
    benefits: ["Local-food meal plan", "Swap guide"],
  },
  accountability: {
    id: "accountability",
    name: "Accountability",
    sku: "RF-SVC-ACCOUNTABILITY",
    href: PlatformRoutes.dashboard,
    external: true,
    status: "active",
    benefits: ["Weekly tracking", "Coach follow-up", "ResoFlex OS access"],
  },
  premium: {
    id: "premium",
    name: "Premium",
    href: PlatformRoutes.joyFunnel,
    external: true,
    status: "planned",
    benefits: ["Full program library", "Priority support"],
  },
  elite: {
    id: "elite",
    name: "Elite",
    href: PlatformRoutes.joinElite,
    external: true,
    status: "planned",
    benefits: ["Elite coaching", "Global network"],
  },
  corporate: {
    id: "corporate",
    name: "Corporate",
    href: PlatformRoutes.contact,
    status: "planned",
    benefits: ["Team wellness", "Reporting"],
  },
  coach: {
    id: "coach",
    name: "Coach",
    href: PlatformRoutes.commander,
    external: true,
    status: "planned",
    benefits: ["Coach tooling", "Client roster"],
  },
  affiliate: {
    id: "affiliate",
    name: "Affiliate",
    href: PlatformRoutes.candera,
    external: true,
    status: "planned",
    benefits: ["Creator payouts", "RSID attribution"],
  },
};

export function getMembership(id: MembershipId): Membership {
  return MEMBERSHIP_REGISTRY[id];
}

export function activeMemberships(): Membership[] {
  return Object.values(MEMBERSHIP_REGISTRY).filter((m) => m.status === "active");
}
