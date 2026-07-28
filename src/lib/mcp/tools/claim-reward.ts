import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { errorResult, jsonResult, supabaseForUser, unauthenticated } from "../supabase";

export default defineTool({
  name: "claim_reward",
  title: "Claim a reward",
  description: "Claim a ResoFit Play reward for the signed-in user by its reward slug.",
  inputSchema: {
    reward_slug: z.string().trim().min(1).describe("Slug of the reward to claim, from list_rewards."),
  },
  annotations: { readOnlyHint: false, destructiveHint: false, openWorldHint: false },
  handler: async ({ reward_slug }, ctx) => {
    if (!ctx.isAuthenticated()) return unauthenticated();
    const { data, error } = await supabaseForUser(ctx)
      .from("reward_claims")
      .insert({ user_id: ctx.getUserId()!, reward_slug })
      .select()
      .maybeSingle();
    if (error) return errorResult(error.message);
    return jsonResult(data);
  },
});
