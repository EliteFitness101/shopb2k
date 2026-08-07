// Production health API. Admin-gated. Returns structured status only —
// never secrets, tokens or keys.
import { createFileRoute } from "@tanstack/react-router";
import { createClient } from "@supabase/supabase-js";
import {
  configurationHealth,
  integrationHealth,
  overallLaunchScore,
  overallStatus,
  readinessScores,
} from "@/platform/health";
import { SITE_URL } from "@/config/site";

export const Route = createFileRoute("/api/admin/health")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const token = (request.headers.get("authorization") ?? "").replace(/^Bearer\s+/i, "");
        if (!token) return new Response("Unauthorized", { status: 401 });

        const url = process.env['SUPABASE_URL'];
        const key = process.env['SUPABASE_PUBLISHABLE_KEY'];
        if (!url || !key) return new Response("Unavailable", { status: 503 });

        const supabase = createClient(url, key, {
          auth: { persistSession: false, autoRefreshToken: false },
          global: { headers: { Authorization: `Bearer ${token}` } },
        });

        const { data: userData, error: userError } = await supabase.auth.getUser(token);
        if (userError || !userData.user) return new Response("Unauthorized", { status: 401 });

        const { data: isAdmin } = await supabase.rpc("has_role", {
          _user_id: userData.user.id,
          _role: "admin",
        });
        if (!isAdmin) return new Response("Forbidden", { status: 403 });

        const integrations = integrationHealth();
        const byGroup = (group: string) => integrations.filter((i) => i.group === group);

        return Response.json({
          system: { name: "ResoFit OS", site: SITE_URL, version: "3.1" },
          environment: process.env['NODE_ENV'] ?? "production",
          database: byGroup("database"),
          commerce: byGroup("commerce"),
          payments: byGroup("payments"),
          media: byGroup("media"),
          automation: byGroup("automation"),
          analytics: byGroup("analytics"),
          chatb2k: byGroup("chatb2k"),
          agents: byGroup("agents"),
          integrations,
          configuration: configurationHealth(),
          readiness: readinessScores(),
          launchScore: overallLaunchScore(),
          overallStatus: overallStatus(),
          generatedAt: new Date().toISOString(),
        });
      },
    },
  },
});
