// Startup environment validation. Warns only — never throws, never logs values.
import { listServices } from "./services";

export interface EnvReport {
  ok: boolean;
  missing: Array<{ service: string; keys: string[] }>;
}

export function validateEnvironment(): EnvReport {
  const env = import.meta.env as Record<string, string | undefined>;
  const missing: EnvReport["missing"] = [];

  for (const service of listServices()) {
    const keys = service.publicEnv.filter((k) => !env[k]);
    if (keys.length) missing.push({ service: service.name, keys });
  }

  return { ok: missing.length === 0, missing };
}

/** Call once on client mount. Logs a grouped warning for unconfigured services. */
export function reportEnvironment(): EnvReport {
  const report = validateEnvironment();
  if (!report.ok && import.meta.env.DEV) {
    for (const m of report.missing) {
      // Names only — secret values are never read or printed.
      console.warn(`[platform] ${m.service} not fully configured. Missing: ${m.keys.join(", ")}`);
    }
  }
  return report;
}
