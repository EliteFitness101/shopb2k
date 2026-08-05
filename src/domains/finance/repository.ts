// Financial Control Plane — repository
import { supabase } from "@/integrations/supabase/client";
import type {
  Payout,
  ProviderAccount,
  RevenueLedgerEntry,
  SettlementLedgerEntry,
  Wallet,
  WalletTransaction,
} from "./types";

export const financeRepository = {
  async getMyWallet(): Promise<Wallet | null> {
    const { data, error } = await supabase.from("wallets").select("*").maybeSingle();
    if (error) throw error;
    return data;
  },

  async listMyWalletTransactions(limit = 50): Promise<WalletTransaction[]> {
    const { data, error } = await supabase
      .from("wallet_transactions")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(limit);
    if (error) throw error;
    return data ?? [];
  },

  async listRevenue(since?: string, limit = 500): Promise<RevenueLedgerEntry[]> {
    let query = supabase
      .from("revenue_ledger")
      .select("*")
      .order("recognized_at", { ascending: false })
      .limit(limit);
    if (since) query = query.gte("recognized_at", since);
    const { data, error } = await query;
    if (error) throw error;
    return data ?? [];
  },

  async listSettlements(limit = 100): Promise<SettlementLedgerEntry[]> {
    const { data, error } = await supabase
      .from("settlement_ledger")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(limit);
    if (error) throw error;
    return data ?? [];
  },

  async listPayouts(limit = 100): Promise<Payout[]> {
    const { data, error } = await supabase
      .from("payouts")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(limit);
    if (error) throw error;
    return data ?? [];
  },

  async listProviderAccounts(): Promise<ProviderAccount[]> {
    const { data, error } = await supabase.from("provider_accounts").select("*").order("provider");
    if (error) throw error;
    return data ?? [];
  },
};
