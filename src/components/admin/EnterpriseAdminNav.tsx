// Enterprise admin navigation — grouped by business domain, driven by the registry.
import { Link } from "@tanstack/react-router";
import { DOMAIN_LIST, domainProgress } from "@/domains/kernel/registry";
import type { DomainDescriptor } from "@/domains/kernel/types";

const GROUPS: Array<{ label: string; ids: DomainDescriptor["id"][] }> = [
  { label: "Growth", ids: ["marketing", "experience", "customerIntelligence"] },
  { label: "Revenue", ids: ["commerce", "orders", "finance", "subscriptions"] },
  { label: "Coaching", ids: ["chatb2k", "health", "knowledge"] },
  { label: "Platform", ids: ["identity", "integrations", "operations", "media"] },
  { label: "Governance", ids: ["compliance", "notifications"] },
];

const STATUS_STYLES: Record<string, string> = {
  live: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
  partial: "bg-gold/15 text-gold border-gold/30",
  planned: "bg-white/5 text-muted-foreground border-white/10",
};

export function EnterpriseAdminNav({ activeId }: { activeId?: string }) {
  const byId = new Map(DOMAIN_LIST.map((d) => [d.id, d]));

  return (
    <nav aria-label="Enterprise domains" className="space-y-6">
      {GROUPS.map((group) => (
        <div key={group.label}>
          <p className="px-2 text-[10px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">
            {group.label}
          </p>
          <ul className="mt-2 space-y-1">
            {group.ids.map((id) => {
              const domain = byId.get(id);
              if (!domain) return null;
              const progress = domainProgress(id);
              const done = progress.live + progress.partial;
              const active = activeId === id;
              return (
                <li key={id}>
                  <Link
                    to="/admin/enterprise"
                    search={{ domain: id }}
                    className={`flex min-h-[44px] items-center justify-between gap-3 rounded-lg border px-3 py-2 text-sm transition-colors ${
                      active
                        ? "border-gold/40 bg-gold/10 text-foreground"
                        : "border-white/5 bg-white/[0.02] text-muted-foreground hover:border-white/15 hover:text-foreground"
                    }`}
                  >
                    <span className="truncate">{domain.name}</span>
                    <span
                      className={`shrink-0 rounded-full border px-2 py-0.5 text-[10px] uppercase tracking-wider ${
                        STATUS_STYLES[domain.status]
                      }`}
                    >
                      {done}/{progress.total}
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </nav>
  );
}
