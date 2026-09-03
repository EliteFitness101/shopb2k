import { createFileRoute } from "@tanstack/react-router";

const SUPABASE_FUNCTION = "buffer-publisher";

function cronAuthorized(request: Request) {
  const secret = process.env.CHATGPT_PUBLISH_SECRET;
  const cron = request.headers.get("authorization") ?? "";
  const vercelCron = request.headers.get("x-vercel-cron-schedule");
  return Boolean(secret && cron === `Bearer ${secret}`) || Boolean(vercelCron);
}

export const Route = createFileRoute("/api/content/publish-cron")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        if (!cronAuthorized(request)) {
          return Response.json({ ok: false, error: "Unauthorized" }, { status: 401 });
        }

        const supabaseUrl = process.env.SUPABASE_URL;
        const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
        if (!supabaseUrl || !serviceRoleKey) {
          return Response.json({ ok: false, error: "Supabase server configuration is incomplete" }, { status: 500 });
        }

        const response = await fetch(`${supabaseUrl}/functions/v1/${SUPABASE_FUNCTION}`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${serviceRoleKey}`,
          },
          body: JSON.stringify({ source: "vercel-cron" }),
        });

        const body = await response.json().catch(() => ({}));
        return Response.json(
          { ok: response.ok && body?.ok !== false, publisher: body },
          { status: response.ok ? 200 : 502 },
        );
      },
    },
  },
});
