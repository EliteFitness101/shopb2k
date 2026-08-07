// Enterprise health panels: integrations, configuration, launch scorecard,
// critical issues. Presence-only — no secret values are ever rendered.
import {
  configurationHealth,
  criticalIssues,
  integrationHealth,
  overallLaunchScore,
  readinessScores,
  type HealthStatus,
} from "@/platform/health";

const dot: Record<HealthStatus, string> = {
  healthy: "bg-emerald-400",
  warning: "bg-gold",
  error: "bg-red-400",
};

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border border-white/8 bg-white/[0.02] p-5">
      <h3 className="font-display text-lg uppercase tracking-tight text-foreground">{title}</h3>
      <div className="mt-4">{children}</div>
    </section>
  );
}

export function EnterpriseHealth() {
  const integrations = integrationHealth();
  const config = configurationHealth();
  const scores = readinessScores();
  const issues = criticalIssues();
  const launch = overallLaunchScore();

  return (
    <div className="grid gap-4">
      <Panel title={`Launch scorecard — ${launch}%`}>
        <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
          {scores.map((s) => (
            <li key={s.label} className="rounded-lg border border-white/5 bg-background/40 px-3 py-2">
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground">{s.label}</p>
              <p className="mt-1 font-display text-xl text-gold">{s.percent}%</p>
            </li>
          ))}
        </ul>
      </Panel>

      <Panel title="Critical issues">
        {issues.length ? (
          <ul className="space-y-2 text-sm">
            {issues.map((i) => (
              <li key={i.title} className="rounded-lg border border-red-400/30 bg-red-400/5 px-3 py-2">
                <p className="text-foreground">{i.title}</p>
                <p className="text-xs text-muted-foreground">{i.action}</p>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-emerald-400">No production blockers detected.</p>
        )}
      </Panel>

      <Panel title="Integration health">
        <ul className="grid gap-2 sm:grid-cols-2">
          {integrations.map((i) => (
            <li
              key={i.id}
              className="flex items-start gap-3 rounded-lg border border-white/5 bg-background/40 px-3 py-2 text-sm"
            >
              <span className={`mt-1.5 size-2 shrink-0 rounded-full ${dot[i.status]}`} aria-hidden="true" />
              <span className="min-w-0">
                <span className="block truncate text-foreground/90">{i.name}</span>
                <span className="block text-xs text-muted-foreground">{i.detail}</span>
                <span className="mt-1 block text-[10px] uppercase tracking-wider text-muted-foreground">
                  {i.status} · {i.enabled ? "enabled" : "disabled"} · {i.optional ? "optional" : "required"}
                </span>
              </span>
            </li>
          ))}
        </ul>
      </Panel>

      <Panel title="Configuration health">
        <ul className="grid gap-2 sm:grid-cols-2">
          {config.map((c) => (
            <li
              key={c.key}
              className="flex items-center justify-between gap-3 rounded-lg border border-white/5 bg-background/40 px-3 py-2 text-sm"
            >
              <span className="min-w-0">
                <span className="block truncate font-mono text-xs text-foreground/90">{c.key}</span>
                <span className="text-[10px] uppercase tracking-wider text-muted-foreground">{c.service}</span>
              </span>
              <span
                className={`shrink-0 text-[10px] uppercase tracking-wider ${
                  c.state === "found" ? "text-emerald-400" : c.optional ? "text-gold" : "text-red-400"
                }`}
              >
                {c.state === "found" ? "✓ found" : "⚠ missing"}
              </span>
            </li>
          ))}
        </ul>
        <p className="mt-3 text-xs text-muted-foreground">
          Presence only — configuration values are never read or displayed.
        </p>
      </Panel>
    </div>
  );
}
