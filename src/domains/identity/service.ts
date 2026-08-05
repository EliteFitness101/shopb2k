// Identity OS — services. Business rules + domain events. Never touches auth flows.
import { publish } from "../kernel/events";
import { fail, ok, type ServiceResult } from "../kernel/types";
import { identityRepository } from "./repository";
import type { FeatureAssignment, FeatureFlag, Organization, OrgRole } from "./types";

function slugify(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
}

/** Stable 0-99 bucket for percentage rollouts. */
function bucket(key: string, userId: string): number {
  let h = 0;
  const s = `${key}:${userId}`;
  for (let i = 0; i < s.length; i += 1) h = (h * 31 + s.charCodeAt(i)) % 100000;
  return h % 100;
}

export const identityService = {
  /** Create an organization and make the creator its owner. */
  async createOrganization(input: {
    name: string;
    userId: string;
    plan?: string;
  }): Promise<ServiceResult<Organization>> {
    const name = input.name.trim();
    if (name.length < 2) return fail("Organization name is too short", "invalid_name");

    try {
      const org = await identityRepository.createOrganization({
        name,
        slug: `${slugify(name)}-${Math.random().toString(36).slice(2, 6)}`,
        createdBy: input.userId,
        ...(input.plan ? { plan: input.plan } : {}),
      });
      await identityRepository.addMember({
        organizationId: org.id,
        userId: input.userId,
        role: "owner",
        invitedBy: input.userId,
      });
      return ok(org);
    } catch (error) {
      return fail(error instanceof Error ? error.message : "Could not create organization");
    }
  },

  async inviteMember(input: {
    organizationId: string;
    userId: string;
    role?: OrgRole;
    invitedBy: string;
  }): Promise<ServiceResult<true>> {
    try {
      await identityRepository.addMember(input);
      return ok(true);
    } catch (error) {
      return fail(error instanceof Error ? error.message : "Could not add member");
    }
  },

  /** Records a successful sign-in and publishes `user.registered` for new users. */
  async recordSignIn(input: {
    userId: string;
    method: string;
    isNewUser?: boolean;
  }): Promise<ServiceResult<true>> {
    const userAgent = typeof navigator === "undefined" ? undefined : navigator.userAgent;
    try {
      await identityRepository.recordLogin({
        userId: input.userId,
        method: input.method,
        ...(userAgent ? { userAgent } : {}),
      });
      if (userAgent) {
        await identityRepository.upsertDevice({
          userId: input.userId,
          name: userAgent.slice(0, 60),
          platform: typeof navigator === "undefined" ? "unknown" : navigator.platform || "unknown",
          userAgent,
        });
      }
      if (input.isNewUser) {
        publish("user.registered", { user_id: input.userId, method: input.method });
      }
      return ok(true);
    } catch (error) {
      // Never let telemetry break a sign-in.
      return fail(error instanceof Error ? error.message : "Could not record sign-in");
    }
  },

  async revokeApiKey(id: string): Promise<ServiceResult<true>> {
    try {
      await identityRepository.revokeApiKey(id);
      return ok(true);
    } catch (error) {
      return fail(error instanceof Error ? error.message : "Could not revoke key");
    }
  },

  /** Deterministic flag evaluation: explicit assignment wins, then rollout bucket. */
  isFeatureEnabled(
    key: string,
    context: { userId?: string | null; flags: FeatureFlag[]; assignments?: FeatureAssignment[] },
  ): boolean {
    const flag = context.flags.find((f) => f.key === key);
    if (!flag) return false;

    const assignment = context.assignments?.find(
      (a) => a.flag_key === key && a.user_id && a.user_id === context.userId,
    );
    if (assignment) return assignment.enabled;

    if (!flag.enabled) return false;
    if (flag.rollout_percentage >= 100) return true;
    if (!context.userId) return false;
    return bucket(key, context.userId) < flag.rollout_percentage;
  },
};
