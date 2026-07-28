import { auth, defineMcp } from "@lovable.dev/mcp-js";
import getMyProfile from "./tools/get-my-profile";
import listMyAchievements from "./tools/list-my-achievements";
import listMyGameResults from "./tools/list-my-game-results";
import listRewards from "./tools/list-rewards";
import listLeaderboard from "./tools/list-leaderboard";
import claimReward from "./tools/claim-reward";

const projectRef = import.meta.env.VITE_SUPABASE_PROJECT_ID ?? "project-ref-unset";

export default defineMcp({
  name: "resofit-mcp",
  title: "ResoFit OS",
  version: "0.1.0",
  instructions:
    "Tools for ResoFit Play, the ResoFit wellness community. Read the signed-in user's profile, XP, achievements and recent games, browse the rewards store and XP leaderboard, and claim rewards on their behalf.",
  auth: auth.oauth.issuer({
    issuer: `https://${projectRef}.supabase.co/auth/v1`,
    acceptedAudiences: "authenticated",
  }),
  tools: [getMyProfile, listMyAchievements, listMyGameResults, listRewards, listLeaderboard, claimReward],
});
