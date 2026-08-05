// Financial Control Plane — types
import type { Database } from "@/integrations/supabase/types";

type T = Database["public"]["Tables"];

export type Wallet = T["wallets"]["Row"];
export type WalletTransaction = T["wallet_transactions"]["Row"];
export type RevenueLedgerEntry = T["revenue_ledger"]["Row"];
export type SettlementLedgerEntry = T["settlement_ledger"]["Row"];
export type Payout = T["payouts"]["Row"];
export type ProviderAccount = T["provider_accounts"]["Row"];

export type PaymentProvider = "paystack" | "stripe" | "flutterwave";

export interface RevenueSummary {
  gross: number;
  fees: number;
  net: number;
  currency: string;
  entries: number;
}

export interface ReconciliationRow {
  settlementId: string;
  provider: string;
  expectedNet: number;
  reportedNet: number;
  variance: number;
  reconciled: boolean;
}
