// Identity OS — types
import type { Database } from "@/integrations/supabase/types";

type T = Database["public"]["Tables"];

export type Organization = T["organizations"]["Row"];
export type OrganizationInsert = T["organizations"]["Insert"];
export type OrganizationMember = T["organization_members"]["Row"];
export type OrganizationSetting = T["organization_settings"]["Row"];
export type ApiKey = T["api_keys"]["Row"];
export type Device = T["devices"]["Row"];
export type UserSession = T["user_sessions"]["Row"];
export type LoginHistoryEntry = T["login_history"]["Row"];
export type OAuthIdentity = T["oauth_identities"]["Row"];
export type FeatureFlag = T["feature_flags"]["Row"];
export type FeatureAssignment = T["feature_assignments"]["Row"];

export type OrgRole = Database["public"]["Enums"]["org_role"];
export type OrgMemberStatus = Database["public"]["Enums"]["org_member_status"];

export interface OrganizationWithRole extends Organization {
  role?: OrgRole;
}
