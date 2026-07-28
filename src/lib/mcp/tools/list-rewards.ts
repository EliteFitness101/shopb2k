import { defineTool } from "@lovable.dev/mcp-js";
import { errorResult, jsonResult, supabaseForUser, unauthenticated } from "../supabase";

export default defineTool({
  name: "list_rewards",
  title: "List ResoFit rewards",
  description: "List rewards available in the ResoFit Play rewards store, with their ResoCoin cost.",
  inputSchema: {},
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async (_input, ctx) => {
    if (!ctx.isAuthenticated()) return unauthenticated();
    const { data, error } = await supabaseForUser(ctx).from("rewards").select("*").limit(100);
    if (error) return errorResult(error.message);
    return jsonResult(data ?? []);
  },
});
