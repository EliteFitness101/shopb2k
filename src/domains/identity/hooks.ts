// Identity OS — React Query hooks.
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { identityRepository } from "./repository";
import { identityService } from "./service";

export function useOrganizations() {
  return useQuery({ queryKey: ["identity", "organizations"], queryFn: identityRepository.listOrganizations });
}

export function useOrganizationMembers(organizationId: string | null) {
  return useQuery({
    queryKey: ["identity", "organization-members", organizationId],
    queryFn: () => identityRepository.listMembers(organizationId as string),
    enabled: Boolean(organizationId),
  });
}

export function useApiKeys() {
  return useQuery({ queryKey: ["identity", "api-keys"], queryFn: identityRepository.listApiKeys });
}

export function useDevices() {
  return useQuery({ queryKey: ["identity", "devices"], queryFn: identityRepository.listDevices });
}

export function useSessions() {
  return useQuery({ queryKey: ["identity", "sessions"], queryFn: identityRepository.listSessions });
}

export function useLoginHistory(limit = 25) {
  return useQuery({
    queryKey: ["identity", "login-history", limit],
    queryFn: () => identityRepository.listLoginHistory(limit),
  });
}

export function useFeatureFlags() {
  return useQuery({ queryKey: ["identity", "feature-flags"], queryFn: identityRepository.listFeatureFlags });
}

export function useCreateOrganization() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: { name: string; userId: string; plan?: string }) =>
      identityService.createOrganization(input),
    onSuccess: () => void qc.invalidateQueries({ queryKey: ["identity", "organizations"] }),
  });
}

export function useRevokeApiKey() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => identityService.revokeApiKey(id),
    onSuccess: () => void qc.invalidateQueries({ queryKey: ["identity", "api-keys"] }),
  });
}
