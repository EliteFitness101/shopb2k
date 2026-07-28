import { defineTool } from "@lovable.dev/mcp-js";
import { errorResult, jsonResult, supabaseForUser, unauthenticated } from "../supabase";

export default defineTool({
  name: "list_my_achievements",
  title: "List my achievements",
  description: "List the achievements the signed-in user has unlocked in ResoFit Play, newest first.",
  inputSchema: {},
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async (_input, ctx) => {
    if (!ctx.isAuthenticated()) return unauthenticated();
    const { data, error } = await supabaseForUser(ctx)
      .from("achievement_unlocks")
      .select("achievement_slug, unlocked_at")
      .eq("user_id", ctx.getUserId()!)
      .order("unlocked_at", { ascending: false })
      .limit(100);
    if (error) return errorResult(error.message);
    return jsonResult(data ?? []);
  },
});
