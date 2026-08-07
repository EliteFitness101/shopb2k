import { createFileRoute } from "@tanstack/react-router";
import { useMemo } from "react";
import { EnterpriseAdminNav } from "@/components/admin/EnterpriseAdminNav";
import { EnterpriseHealth } from "@/components/admin/EnterpriseHealth";
import { DOMAIN_LIST, domainProgress, getDomain } from "@/domains/kernel/registry";
import type { DomainId } from "@/domains/kernel/types";
import { useAllOrders, useOrderStatusCounts } from "@/domains/orders";
import { useRevenueSummary, useSettlements } from "@/domains/finance";
import { useOrganizations, useFeatureFlags } from "@/domains/identity";

type Search = { domain?: DomainId };

export const Route = createFileRoute("/admin/enterprise")({
  validateSearch: (search: Record<string, unknown>): Search => ({
    domain: typeof search.domain === "string" ? (search.domain as DomainId) : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Enterprise OS Console | ResoFit" },
      {
        name: "description",
        content:
          "ResoFlex Enterprise OS console — revenue, orders, identity and platform domain health for the ResoFit wellness platform.",
      },
      { property: "og:title", content: "Enterprise OS Console | ResoFit" },
      {
        property: "og:description",
        content: "Operator console for revenue, orders, identity and platform domain health.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: EnterpriseConsole,
});

const money = (value: number, currency = "NGN") =>
  new Intl.NumberFormat("en-NG", { style: "currency", currency, maximumFractionDigits: 0 }).format(value);

function Stat({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="rounded-xl border border-white/8 bg-white/[0.02] p-4">
      <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">{label}</p>
      <p className="mt-2 font-display text-2xl text-foreground">{value}</p>
      {hint ? <p className="mt-1 text-xs text-muted-foreground">{hint}</p> : null}
    </div>
  );
}

function EnterpriseConsole() {
  const { domain } = Route.useSearch();
  const activeId = domain ?? "orders";
  const active = useMemo(() => {
    try {
      return getDomain(activeId);
    } catch {
      return getDomain("orders");
    }
  }, [activeId]);

  const revenue = useRevenueSummary();
  const orders = useAllOrders(25);
  const statusCounts = useOrderStatusCounts();
  const settlements = useSettlements(10);
  const organizations = useOrganizations();
  const flags = useFeatureFlags();

  const platformProgress = DOMAIN_LIST.reduce(
    (acc, d) => {
      const p = domainProgress(d.id);
      acc.live += p.live;
      acc.partial += p.partial;
      acc.total += p.total;
      return acc;
    },
    { live: 0, partial: 0, total: 0 },
  );

  const unreconciled = (settlements.data ?? []).filter((s) => !s.reconciled).length;

  return (
    <main className="mx-auto w-full max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      <header className="mb-8">
        <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-gold">ResoFlex Enterprise OS</p>
        <h1 className="mt-2 font-display text-3xl uppercase tracking-tight text-foreground sm:text-4xl">
          Operator Console
        </h1>
        <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
          Executive view across all 16 business domains — revenue, fulfilment, identity and platform readiness.
        </p>
      </header>

      <section aria-label="Executive summary" className="mb-10 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat
          label="Net revenue"
          value={revenue.isLoading ? "…" : money(revenue.data?.net ?? 0, revenue.data?.currency ?? "NGN")}
          hint={revenue.data ? `${revenue.data.entries} ledger entries` : undefined}
        />
        <Stat
          label="Orders"
          value={orders.isLoading ? "…" : String(orders.data?.length ?? 0)}
          hint={
            statusCounts.data
              ? Object.entries(statusCounts.data)
                  .map(([k, v]) => `${k} ${v}`)
                  .join(" · ")
              : undefined
          }
        />
        <Stat
          label="Unreconciled settlements"
          value={settlements.isLoading ? "…" : String(unreconciled)}
          hint="Provider vs ledger variance"
        />
        <Stat
          label="Domain readiness"
          value={`${Math.round(((platformProgress.live + platformProgress.partial * 0.5) / Math.max(platformProgress.total, 1)) * 100)}%`}
          hint={`${platformProgress.live} live modules of ${platformProgress.total}`}
        />
      </section>

      <div className="grid gap-8 lg:grid-cols-[260px_1fr]">
        <aside>
          <EnterpriseAdminNav activeId={active.id} />
        </aside>

        <section aria-label={`${active.name} detail`} className="min-w-0">
          <div className="rounded-2xl border border-white/8 bg-white/[0.02] p-5">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <h2 className="font-display text-2xl uppercase tracking-tight text-foreground">{active.name}</h2>
              <span className="rounded-full border border-gold/30 bg-gold/10 px-3 py-1 text-[10px] uppercase tracking-wider text-gold">
                {active.status}
              </span>
            </div>
            <p className="mt-2 text-sm text-muted-foreground">{active.summary}</p>

            <ul className="mt-5 grid gap-2 sm:grid-cols-2">
              {active.modules.map((m) => (
                <li
                  key={m.key}
                  className="flex items-center justify-between gap-3 rounded-lg border border-white/5 bg-background/40 px-3 py-2 text-sm"
                >
                  <span className="truncate text-foreground/90">{m.label}</span>
                  <span
                    className={`shrink-0 text-[10px] uppercase tracking-wider ${
                      m.status === "live"
                        ? "text-emerald-400"
                        : m.status === "partial"
                          ? "text-gold"
                          : "text-muted-foreground"
                    }`}
                  >
                    {m.status}
                  </span>
                </li>
              ))}
            </ul>
          </div>

          {active.id === "orders" ? (
            <div className="mt-6 overflow-x-auto rounded-2xl border border-white/8">
              <table className="w-full min-w-[560px] text-sm">
                <caption className="sr-only">Most recent orders</caption>
                <thead className="bg-white/[0.03] text-left text-[10px] uppercase tracking-wider text-muted-foreground">
                  <tr>
                    <th scope="col" className="px-4 py-3">Order</th>
                    <th scope="col" className="px-4 py-3">Status</th>
                    <th scope="col" className="px-4 py-3">Fulfilment</th>
                    <th scope="col" className="px-4 py-3 text-right">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {(orders.data ?? []).map((o) => (
                    <tr key={o.id} className="border-t border-white/5">
                      <td className="px-4 py-3 font-mono text-xs text-foreground/90">{o.order_number}</td>
                      <td className="px-4 py-3 text-muted-foreground">{o.status}</td>
                      <td className="px-4 py-3 text-muted-foreground">{o.fulfillment_status}</td>
                      <td className="px-4 py-3 text-right text-foreground/90">{money(Number(o.total), o.currency)}</td>
                    </tr>
                  ))}
                  {!orders.isLoading && !(orders.data ?? []).length ? (
                    <tr>
                      <td colSpan={4} className="px-4 py-8 text-center text-muted-foreground">
                        No orders recorded yet.
                      </td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
            </div>
          ) : null}

          {active.id === "identity" ? (
            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              <div className="rounded-2xl border border-white/8 p-5">
                <h3 className="font-display text-lg uppercase text-foreground">Organizations</h3>
                <p className="mt-2 text-3xl text-gold">{organizations.data?.length ?? 0}</p>
              </div>
              <div className="rounded-2xl border border-white/8 p-5">
                <h3 className="font-display text-lg uppercase text-foreground">Feature flags</h3>
                <ul className="mt-3 space-y-1 text-sm text-muted-foreground">
                  {(flags.data ?? []).slice(0, 6).map((f) => (
                    <li key={f.id} className="flex justify-between gap-3">
                      <span className="truncate">{f.key}</span>
                      <span className={f.enabled ? "text-emerald-400" : "text-muted-foreground"}>
                        {f.enabled ? "on" : "off"}
                      </span>
                    </li>
                  ))}
                  {!(flags.data ?? []).length ? <li>No flags configured.</li> : null}
                </ul>
              </div>
            </div>
          ) : null}

          {active.id === "finance" ? (
            <div className="mt-6 overflow-x-auto rounded-2xl border border-white/8">
              <table className="w-full min-w-[520px] text-sm">
                <caption className="sr-only">Recent settlements</caption>
                <thead className="bg-white/[0.03] text-left text-[10px] uppercase tracking-wider text-muted-foreground">
                  <tr>
                    <th scope="col" className="px-4 py-3">Provider</th>
                    <th scope="col" className="px-4 py-3">Status</th>
                    <th scope="col" className="px-4 py-3 text-right">Net</th>
                  </tr>
                </thead>
                <tbody>
                  {(settlements.data ?? []).map((s) => (
                    <tr key={s.id} className="border-t border-white/5">
                      <td className="px-4 py-3 text-foreground/90">{s.provider}</td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {s.reconciled ? "reconciled" : "pending"}
                      </td>
                      <td className="px-4 py-3 text-right text-foreground/90">
                        {money(Number(s.net_amount), s.currency)}
                      </td>
                    </tr>
                  ))}
                  {!(settlements.data ?? []).length ? (
                    <tr>
                      <td colSpan={3} className="px-4 py-8 text-center text-muted-foreground">
                        No settlements recorded yet.
                      </td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
            </div>
          ) : null}
        </section>
      </div>

      <section aria-label="Platform health" className="mt-10">
        <h2 className="mb-4 font-display text-2xl uppercase tracking-tight text-foreground">
          Production Health
        </h2>
        <EnterpriseHealth />
      </section>
    </main>
  );
}
