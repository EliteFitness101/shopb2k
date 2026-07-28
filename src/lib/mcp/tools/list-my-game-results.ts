import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { errorResult, jsonResult, supabaseForUser, unauthenticated } from "../supabase";

export default defineTool({
  name: "list_my_game_results",
  title: "List my recent games",
  description: "List the signed-in user's recent ResoFit Play game results, newest first.",
  inputSchema: {
    limit: z.number().int().optional().describe("How many results to return (1-50, default 10)."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ limit }, ctx) => {
    if (!ctx.isAuthenticated()) return unauthenticated();
    const take = Math.min(Math.max(limit ?? 10, 1), 50);
    const { data, error } = await supabaseForUser(ctx)
      .from("game_results")
      .select("*")
      .eq("user_id", ctx.getUserId()!)
      .order("created_at", { ascending: false })
      .limit(take);
    if (error) return errorResult(error.message);
    return jsonResult(data ?? []);
  },
});
