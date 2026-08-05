// Financial Control Plane — services: summaries, reconciliation, CSV bank export.
import { fail, ok, type ServiceResult } from "../kernel/types";
import { financeRepository } from "./repository";
import type { ReconciliationRow, RevenueLedgerEntry, RevenueSummary, SettlementLedgerEntry } from "./types";

export function summarizeRevenue(entries: RevenueLedgerEntry[], currency = "NGN"): RevenueSummary {
  const scoped = entries.filter((e) => e.currency === currency);
  return {
    currency,
    entries: scoped.length,
    gross: scoped.reduce((s, e) => s + Number(e.amount), 0),
    fees: scoped.reduce((s, e) => s + Number(e.fees), 0),
    net: scoped.reduce((s, e) => s + Number(e.net_amount), 0),
  };
}

/** Variance between provider-reported settlement net and our ledger net. */
export function reconcile(
  settlements: SettlementLedgerEntry[],
  revenue: RevenueLedgerEntry[],
): ReconciliationRow[] {
  return settlements.map((s) => {
    const expectedNet = revenue
      .filter((r) => r.provider === s.provider)
      .reduce((sum, r) => sum + Number(r.net_amount), 0);
    const reportedNet = Number(s.net_amount);
    return {
      settlementId: s.id,
      provider: s.provider,
      expectedNet,
      reportedNet,
      variance: Number((reportedNet - expectedNet).toFixed(2)),
      reconciled: s.reconciled,
    };
  });
}

function csvCell(value: unknown): string {
  const s = String(value ?? "");
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

/** Bank-ready CSV export of the revenue ledger. */
export function toBankExportCsv(entries: RevenueLedgerEntry[]): string {
  const header = ["recognized_at", "entry_type", "provider", "provider_reference", "amount", "fees", "net_amount", "currency"];
  const rows = entries.map((e) =>
    [e.recognized_at, e.entry_type, e.provider, e.provider_reference, e.amount, e.fees, e.net_amount, e.currency]
      .map(csvCell)
      .join(","),
  );
  return [header.join(","), ...rows].join("\n");
}

export const financeService = {
  async revenueSummary(since?: string, currency = "NGN"): Promise<ServiceResult<RevenueSummary>> {
    try {
      const entries = await financeRepository.listRevenue(since);
      return ok(summarizeRevenue(entries, currency));
    } catch (error) {
      return fail(error instanceof Error ? error.message : "Could not load revenue");
    }
  },

  async reconciliationReport(): Promise<ServiceResult<ReconciliationRow[]>> {
    try {
      const [settlements, revenue] = await Promise.all([
        financeRepository.listSettlements(),
        financeRepository.listRevenue(),
      ]);
      return ok(reconcile(settlements, revenue));
    } catch (error) {
      return fail(error instanceof Error ? error.message : "Could not reconcile");
    }
  },

  async bankExport(since?: string): Promise<ServiceResult<string>> {
    try {
      return ok(toBankExportCsv(await financeRepository.listRevenue(since)));
    } catch (error) {
      return fail(error instanceof Error ? error.message : "Could not build export");
    }
  },
};
