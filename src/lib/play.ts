// Shared Play-layer types and helpers
export interface Game {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  category: string;
  status: string; // 'live' | 'coming_soon'
  min_players: number;
  max_players: number;
  featured: boolean;
  sort_order: number;
  icon: string | null;
}

export interface Profile {
  id: string;
  display_name: string | null;
  avatar_url: string | null;
  xp: number;
  reso_coins: number;
  level: number;
}

export const PLAY_EVENTS = [
  "play_home_view",
  "game_selected",
  "quick_match",
  "match_started",
  "match_finished",
  "achievement_unlocked",
  "reward_claimed",
  "leaderboard_view",
  "tournament_joined",
  "friend_invited",
  "wellness_bonus",
  "chatb2k_play_assist",
] as const;
