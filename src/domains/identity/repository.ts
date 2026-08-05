// Identity OS — repository. All reads/writes go through RLS as the signed-in user.
import { supabase } from "@/integrations/supabase/client";
import type {
  ApiKey,
  Device,
  FeatureAssignment,
  FeatureFlag,
  LoginHistoryEntry,
  OAuthIdentity,
  Organization,
  OrganizationMember,
  OrganizationSetting,
  OrgRole,
  UserSession,
} from "./types";

export const identityRepository = {
  async listOrganizations(): Promise<Organization[]> {
    const { data, error } = await supabase
      .from("organizations")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) throw error;
    return data ?? [];
  },

  async createOrganization(input: { name: string; slug: string; createdBy: string; plan?: string }): Promise<Organization> {
    const { data, error } = await supabase
      .from("organizations")
      .insert({ name: input.name, slug: input.slug, created_by: input.createdBy, plan: input.plan ?? "starter" })
      .select("*")
      .single();
    if (error) throw error;
    return data;
  },

  async addMember(input: {
    organizationId: string;
    userId: string;
    role?: OrgRole;
    invitedBy?: string;
  }): Promise<OrganizationMember> {
    const { data, error } = await supabase
      .from("organization_members")
      .insert({
        organization_id: input.organizationId,
        user_id: input.userId,
        role: input.role ?? "member",
        invited_by: input.invitedBy ?? null,
      })
      .select("*")
      .single();
    if (error) throw error;
    return data;
  },

  async listMembers(organizationId: string): Promise<OrganizationMember[]> {
    const { data, error } = await supabase
      .from("organization_members")
      .select("*")
      .eq("organization_id", organizationId)
      .order("created_at", { ascending: true });
    if (error) throw error;
    return data ?? [];
  },

  async listSettings(organizationId: string): Promise<OrganizationSetting[]> {
    const { data, error } = await supabase
      .from("organization_settings")
      .select("*")
      .eq("organization_id", organizationId);
    if (error) throw error;
    return data ?? [];
  },

  async listApiKeys(): Promise<ApiKey[]> {
    const { data, error } = await supabase
      .from("api_keys")
      .select("*")
      .is("revoked_at", null)
      .order("created_at", { ascending: false });
    if (error) throw error;
    return data ?? [];
  },

  async revokeApiKey(id: string): Promise<void> {
    const { error } = await supabase
      .from("api_keys")
      .update({ revoked_at: new Date().toISOString() })
      .eq("id", id);
    if (error) throw error;
  },

  async listDevices(): Promise<Device[]> {
    const { data, error } = await supabase
      .from("devices")
      .select("*")
      .order("last_seen_at", { ascending: false });
    if (error) throw error;
    return data ?? [];
  },

  async upsertDevice(input: {
    userId: string;
    name: string;
    platform: string;
    userAgent: string;
  }): Promise<Device> {
    const { data: existing } = await supabase
      .from("devices")
      .select("id")
      .eq("user_id", input.userId)
      .eq("user_agent", input.userAgent)
      .maybeSingle();

    if (existing) {
      const { data, error } = await supabase
        .from("devices")
        .update({ last_seen_at: new Date().toISOString() })
        .eq("id", existing.id)
        .select("*")
        .single();
      if (error) throw error;
      return data;
    }

    const { data, error } = await supabase
      .from("devices")
      .insert({
        user_id: input.userId,
        name: input.name,
        platform: input.platform,
        user_agent: input.userAgent,
      })
      .select("*")
      .single();
    if (error) throw error;
    return data;
  },

  async listSessions(): Promise<UserSession[]> {
    const { data, error } = await supabase
      .from("user_sessions")
      .select("*")
      .is("revoked_at", null)
      .order("last_active_at", { ascending: false });
    if (error) throw error;
    return data ?? [];
  },

  async recordLogin(input: {
    userId: string;
    method: string;
    success?: boolean;
    reason?: string;
    userAgent?: string;
  }): Promise<void> {
    const { error } = await supabase.from("login_history").insert({
      user_id: input.userId,
      method: input.method,
      success: input.success ?? true,
      reason: input.reason ?? null,
      user_agent: input.userAgent ?? null,
    });
    if (error) throw error;
  },

  async listLoginHistory(limit = 25): Promise<LoginHistoryEntry[]> {
    const { data, error } = await supabase
      .from("login_history")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(limit);
    if (error) throw error;
    return data ?? [];
  },

  async listOAuthIdentities(): Promise<OAuthIdentity[]> {
    const { data, error } = await supabase.from("oauth_identities").select("*");
    if (error) throw error;
    return data ?? [];
  },

  async linkOAuthIdentity(input: { userId: string; provider: string; providerUserId?: string }): Promise<void> {
    const { error } = await supabase.from("oauth_identities").upsert(
      {
        user_id: input.userId,
        provider: input.provider,
        provider_user_id: input.providerUserId ?? null,
      },
      { onConflict: "user_id,provider" },
    );
    if (error) throw error;
  },

  async listFeatureFlags(): Promise<FeatureFlag[]> {
    const { data, error } = await supabase.from("feature_flags").select("*").order("key");
    if (error) throw error;
    return data ?? [];
  },

  async listFeatureAssignments(): Promise<FeatureAssignment[]> {
    const { data, error } = await supabase.from("feature_assignments").select("*");
    if (error) throw error;
    return data ?? [];
  },
};
