// Financial Control Plane — React Query hooks.
import { useQuery } from "@tanstack/react-query";
import { financeRepository } from "./repository";
import { reconcile, summarizeRevenue } from "./service";

export function useMyWallet() {
  return useQuery({ queryKey: ["finance", "wallet"], queryFn: financeRepository.getMyWallet });
}

export function useMyWalletTransactions(limit = 50) {
  return useQuery({
    queryKey: ["finance", "wallet-transactions", limit],
    queryFn: () => financeRepository.listMyWalletTransactions(limit),
  });
}

export function useRevenueSummary(since?: string, currency = "NGN") {
  return useQuery({
    queryKey: ["finance", "revenue-summary", since ?? "all", currency],
    queryFn: async () => summarizeRevenue(await financeRepository.listRevenue(since), currency),
  });
}

export function useSettlements(limit = 100) {
  return useQuery({ queryKey: ["finance", "settlements", limit], queryFn: () => financeRepository.listSettlements(limit) });
}

export function usePayouts(limit = 100) {
  return useQuery({ queryKey: ["finance", "payouts", limit], queryFn: () => financeRepository.listPayouts(limit) });
}

export function useProviderAccounts() {
  return useQuery({ queryKey: ["finance", "provider-accounts"], queryFn: financeRepository.listProviderAccounts });
}

export function useReconciliation() {
  return useQuery({
    queryKey: ["finance", "reconciliation"],
    queryFn: async () => {
      const [settlements, revenue] = await Promise.all([
        financeRepository.listSettlements(),
        financeRepository.listRevenue(),
      ]);
      return reconcile(settlements, revenue);
    },
  });
}
