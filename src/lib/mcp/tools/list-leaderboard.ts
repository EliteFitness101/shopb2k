import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { errorResult, jsonResult, supabaseForUser, unauthenticated } from "../supabase";

export default defineTool({
  name: "list_leaderboard",
  title: "List XP leaderboard",
  description: "List the top ResoFit Play players ranked by XP.",
  inputSchema: {
    limit: z.number().int().optional().describe("How many players to return (1-50, default 10)."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ limit }, ctx) => {
    if (!ctx.isAuthenticated()) return unauthenticated();
    const take = Math.min(Math.max(limit ?? 10, 1), 50);
    const { data, error } = await supabaseForUser(ctx)
      .from("profiles")
      .select("display_name, level, xp")
      .order("xp", { ascending: false })
      .limit(take);
    if (error) return errorResult(error.message);
    return jsonResult(data ?? []);
  },
});
