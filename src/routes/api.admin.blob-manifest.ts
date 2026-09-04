import { createFileRoute } from "@tanstack/react-router";

async function requireAdmin(request: Request) {
  const auth = request.headers.get("authorization") ?? "";
  if (!auth.startsWith("Bearer ")) return null;
  const token = auth.slice(7);
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data, error } = await supabaseAdmin.auth.getUser(token);
  if (error || !data.user) return null;
  const { data: isAdmin } = await supabaseAdmin.rpc("has_role", { _user_id: data.user.id, _role: "admin" });
  return isAdmin ? { userId: data.user.id, supabaseAdmin } : null;
}

export const Route = createFileRoute("/api/admin/blob-manifest")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const admin = await requireAdmin(request);
        if (!admin) return Response.json({ ok: false, error: "Admin role required" }, { status: 403 });
        const { data, error } = await admin.supabaseAdmin
          .from("asset_manifest")
          .select("id,blob_pathname,handle,campaign_type,platform,status,title,caption,destination,keywords,safety_checked,notes,created_at,updated_at")
          .order("status", { ascending: true })
          .order("created_at", { ascending: true });
        if (error) return Response.json({ ok: false, error: error.message }, { status: 500 });
        return Response.json({ ok: true, items: data ?? [] });
      },
      PATCH: async ({ request }) => {
        const admin = await requireAdmin(request);
        if (!admin) return Response.json({ ok: false, error: "Admin role required" }, { status: 403 });
        const body = await request.json().catch(() => ({}));
        const id = String(body.id ?? "").trim();
        if (!id) return Response.json({ ok: false, error: "id is required" }, { status: 400 });

        const patch: Record<string, unknown> = {};
        for (const key of ["handle", "campaign_type", "platform", "status", "title", "caption", "destination", "notes"]) {
          if (body[key] !== undefined) patch[key] = body[key] === "" ? null : body[key];
        }
        if (body.keywords !== undefined) patch.keywords = Array.isArray(body.keywords) ? body.keywords.map(String) : [];
        if (body.safety_checked !== undefined) patch.safety_checked = Boolean(body.safety_checked);
        patch.updated_at = new Date().toISOString();

        const { data, error } = await admin.supabaseAdmin
          .from("asset_manifest")
          .update(patch)
          .eq("id", id)
          .select("id,blob_pathname,handle,campaign_type,platform,status,title,caption,destination,keywords,safety_checked,notes,created_at,updated_at")
          .single();
        if (error) return Response.json({ ok: false, error: error.message }, { status: 400 });
        return Response.json({ ok: true, item: data });
      },
    },
  },
});
