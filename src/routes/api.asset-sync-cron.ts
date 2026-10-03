import { createFileRoute } from "@tanstack/react-router";

const FUNCTION_URL = "https://vbqjvmnhdtdhmeeudqnn.supabase.co/functions/v1/asset-sync";

function authorized(request: Request) {
  const secret = process.env.CRON_SECRET || process.env.ASSET_SYNC_SECRET;
  return Boolean(secret && request.headers.get("authorization") === `Bearer ${secret}`);
}

export const Route = createFileRoute("/api/asset-sync-cron")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        if (!authorized(request)) {
          return Response.json({ ok: false, error: "Unauthorized" }, { status: 401 });
        }

        const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY;
        if (!serviceKey) {
          return Response.json({ ok: false, error: "Supabase server credential is not configured" }, { status: 500 });
        }

        const response = await fetch(FUNCTION_URL, {
          method: "POST",
          headers: {
            apikey: serviceKey,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ source: "vercel-cron" }),
        });

        const body = await response.json().catch(() => ({}));
        return Response.json(
          { ok: response.ok && body?.ok !== false, assetSync: body },
          { status: response.ok ? 200 : 502 },
        );
      },
    },
  },
});
