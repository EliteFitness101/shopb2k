import { createFileRoute } from "@tanstack/react-router";

const SUPABASE_FUNCTION = "buffer-publisher";

function cronAuthorized(request: Request) {
  const secret = process.env.CRON_SECRET || process.env.CHATGPT_PUBLISH_SECRET;
  const authorization = request.headers.get("authorization") ?? "";
  return Boolean(secret && authorization === `Bearer ${secret}`);
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

        let generator: Record<string, unknown> = { status: "skipped" };
        try {
          const generatorResponse = await fetch(new URL("/api/content/generate-cron", request.url), {
            method: "GET",
            headers: { authorization: request.headers.get("authorization") ?? "" },
          });
          generator = await generatorResponse.json().catch(() => ({ status: "invalid_generator_response" }));
        } catch (error) {
          generator = {
            status: "generator_failed",
            error: error instanceof Error ? error.message : String(error),
          };
        }

        const response = await fetch(`${supabaseUrl}/functions/v1/${SUPABASE_FUNCTION}`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${serviceRoleKey}`,
          },
          body: JSON.stringify({ source: "vercel-cron", generator }),
        });

        const body = await response.json().catch(() => ({}));
        return Response.json(
          { ok: response.ok && body?.ok !== false, generator, publisher: body },
          { status: response.ok ? 200 : 502 },
        );
      },
    },
  },
});
