
-- Role enum + user_roles (separate table for security)
CREATE TYPE public.app_role AS ENUM ('admin', 'moderator', 'player');

CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role app_role NOT NULL DEFAULT 'player',
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users read own roles" ON public.user_roles FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

-- Profiles
CREATE TABLE public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name text,
  avatar_url text,
  xp integer NOT NULL DEFAULT 0,
  reso_coins integer NOT NULL DEFAULT 0,
  level integer NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT SELECT ON public.profiles TO anon;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Profiles public read" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "Users update own profile" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);
CREATE POLICY "Users insert own profile" ON public.profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, display_name, avatar_url)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
    NEW.raw_user_meta_data->>'avatar_url'
  );
  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'player');
  RETURN NEW;
END;
$$;
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

CREATE OR REPLACE FUNCTION public.set_updated_at() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;
CREATE TRIGGER profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Games catalog
CREATE TABLE public.games (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  name text NOT NULL,
  description text,
  category text NOT NULL DEFAULT 'strategy',
  status text NOT NULL DEFAULT 'coming_soon',
  icon text,
  min_players int NOT NULL DEFAULT 1,
  max_players int NOT NULL DEFAULT 2,
  featured boolean NOT NULL DEFAULT false,
  sort_order int NOT NULL DEFAULT 100,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.games TO anon, authenticated;
GRANT ALL ON public.games TO service_role;
ALTER TABLE public.games ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Games public read" ON public.games FOR SELECT USING (true);
CREATE POLICY "Admins manage games" ON public.games FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

INSERT INTO public.games (slug, name, description, category, status, min_players, max_players, featured, sort_order) VALUES
  ('trivia', 'Wellness Trivia', 'Fast-paced trivia across wellness, longevity, and strength.', 'trivia', 'live', 1, 1, true, 10),
  ('chess', 'Chess', 'Classic strategy with ChatB2K coaching.', 'strategy', 'coming_soon', 2, 2, true, 20),
  ('ludo', 'Ludo', 'Roll, race, celebrate together.', 'family', 'coming_soon', 2, 4, true, 30),
  ('checkers', 'Checkers', 'Timeless board classic.', 'strategy', 'coming_soon', 2, 2, false, 40);

-- Trivia questions
CREATE TABLE public.trivia_questions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category text NOT NULL DEFAULT 'wellness',
  difficulty text NOT NULL DEFAULT 'easy',
  question text NOT NULL,
  choices jsonb NOT NULL,
  correct_index int NOT NULL,
  explanation text,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.trivia_questions TO anon, authenticated;
GRANT ALL ON public.trivia_questions TO service_role;
ALTER TABLE public.trivia_questions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Trivia public read" ON public.trivia_questions FOR SELECT USING (active = true);
CREATE POLICY "Admins manage trivia" ON public.trivia_questions FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

INSERT INTO public.trivia_questions (category, difficulty, question, choices, correct_index, explanation) VALUES
  ('nutrition','easy','Which macronutrient is most important for muscle repair?','["Fats","Protein","Sugar","Fiber"]'::jsonb,1,'Protein provides amino acids required for muscle repair.'),
  ('hydration','easy','Approx. how many liters of water should the average adult drink daily?','["0.5L","1L","2.5L","6L"]'::jsonb,2,'~2.5L is a common baseline; individual needs vary.'),
  ('mobility','easy','Which practice best improves joint mobility over time?','["Static stretching only","Regular full-range movement","Skipping warm-ups","Heavy lifting only"]'::jsonb,1,'Regular full-range movement trains joints across usable ranges.'),
  ('longevity','medium','Which habit is most consistently linked to longevity in Blue Zones?','["Daily alcohol","Strong social ties","Never sleeping","High sugar diet"]'::jsonb,1,'Strong social connection shows up across all Blue Zones.'),
  ('recovery','easy','Which single factor most improves recovery from exercise?','["Ice baths","Sleep","Supplements","Longer workouts"]'::jsonb,1,'Sleep is the highest-leverage recovery input.'),
  ('strength','medium','Progressive overload means…','["Same weight forever","Gradually increasing training demand","Only lifting heavy","Skipping rest days"]'::jsonb,1,'You gradually raise volume, load, or intensity over time.'),
  ('mindfulness','easy','How many minutes of daily meditation show measurable stress benefits in studies?','["0","10","120","300"]'::jsonb,1,'Even ~10 minutes shows measurable benefit.'),
  ('nutrition','medium','Which oil has the highest smoke point suited for high-heat cooking?','["Extra virgin olive","Flax","Avocado","Butter"]'::jsonb,2,'Avocado oil has one of the highest smoke points.'),
  ('cardio','easy','Zone 2 cardio primarily improves…','["Max power","Aerobic base and fat oxidation","Sprint speed","Grip strength"]'::jsonb,1,'Zone 2 builds aerobic capacity and mitochondrial function.'),
  ('sleep','easy','Deep sleep is most important for…','["Screen time","Physical recovery","Doomscrolling","Snacking"]'::jsonb,1,'Deep sleep drives physical restoration and growth hormone release.');

-- Match results (generic across games)
CREATE TABLE public.game_results (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  game_slug text NOT NULL REFERENCES public.games(slug),
  score int NOT NULL DEFAULT 0,
  duration_seconds int,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX game_results_game_score_idx ON public.game_results (game_slug, score DESC, created_at DESC);
CREATE INDEX game_results_user_idx ON public.game_results (user_id, created_at DESC);
GRANT SELECT, INSERT ON public.game_results TO authenticated;
GRANT SELECT ON public.game_results TO anon;
GRANT ALL ON public.game_results TO service_role;
ALTER TABLE public.game_results ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Results public read" ON public.game_results FOR SELECT USING (true);
CREATE POLICY "Users insert own results" ON public.game_results FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

-- Achievements
CREATE TABLE public.achievements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  name text NOT NULL,
  description text,
  icon text,
  xp_reward int NOT NULL DEFAULT 0,
  coin_reward int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.achievements TO anon, authenticated;
GRANT ALL ON public.achievements TO service_role;
ALTER TABLE public.achievements ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Achievements public read" ON public.achievements FOR SELECT USING (true);
CREATE POLICY "Admins manage achievements" ON public.achievements FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

INSERT INTO public.achievements (slug, name, description, xp_reward, coin_reward) VALUES
  ('first_match','First Match','Play your first ResoFit Play game.',50,25),
  ('trivia_5','Trivia Rookie','Answer 5 trivia questions correctly.',100,50),
  ('trivia_perfect','Perfect Round','Score 100% in a trivia round.',250,100),
  ('daily_streak_3','3-Day Streak','Play 3 days in a row.',150,75);

CREATE TABLE public.achievement_unlocks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  achievement_slug text NOT NULL REFERENCES public.achievements(slug),
  unlocked_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, achievement_slug)
);
GRANT SELECT, INSERT ON public.achievement_unlocks TO authenticated;
GRANT ALL ON public.achievement_unlocks TO service_role;
ALTER TABLE public.achievement_unlocks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users read own unlocks" ON public.achievement_unlocks FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users insert own unlocks" ON public.achievement_unlocks FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

-- Rewards
CREATE TABLE public.rewards (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  name text NOT NULL,
  description text,
  cost_coins int NOT NULL DEFAULT 0,
  kind text NOT NULL DEFAULT 'badge',
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.rewards TO anon, authenticated;
GRANT ALL ON public.rewards TO service_role;
ALTER TABLE public.rewards ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Rewards public read" ON public.rewards FOR SELECT USING (active = true);
CREATE POLICY "Admins manage rewards" ON public.rewards FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

CREATE TABLE public.reward_claims (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  reward_slug text NOT NULL REFERENCES public.rewards(slug),
  claimed_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.reward_claims TO authenticated;
GRANT ALL ON public.reward_claims TO service_role;
ALTER TABLE public.reward_claims ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users read own claims" ON public.reward_claims FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users insert own claims" ON public.reward_claims FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

-- Friendships
CREATE TABLE public.friendships (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  requester_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  addressee_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (requester_id, addressee_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.friendships TO authenticated;
GRANT ALL ON public.friendships TO service_role;
ALTER TABLE public.friendships ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users see own friendships" ON public.friendships FOR SELECT TO authenticated USING (auth.uid() IN (requester_id, addressee_id));
CREATE POLICY "Users create own requests" ON public.friendships FOR INSERT TO authenticated WITH CHECK (auth.uid() = requester_id);
CREATE POLICY "Users respond to own friendships" ON public.friendships FOR UPDATE TO authenticated USING (auth.uid() IN (requester_id, addressee_id)) WITH CHECK (auth.uid() IN (requester_id, addressee_id));

-- Tournaments (scaffold)
CREATE TABLE public.tournaments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  name text NOT NULL,
  game_slug text NOT NULL REFERENCES public.games(slug),
  format text NOT NULL DEFAULT 'single_elim',
  starts_at timestamptz,
  ends_at timestamptz,
  status text NOT NULL DEFAULT 'draft',
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.tournaments TO anon, authenticated;
GRANT ALL ON public.tournaments TO service_role;
ALTER TABLE public.tournaments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Tournaments public read" ON public.tournaments FOR SELECT USING (true);
CREATE POLICY "Admins manage tournaments" ON public.tournaments FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

CREATE TABLE public.tournament_players (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tournament_id uuid NOT NULL REFERENCES public.tournaments(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  joined_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tournament_id, user_id)
);
GRANT SELECT, INSERT, DELETE ON public.tournament_players TO authenticated;
GRANT ALL ON public.tournament_players TO service_role;
ALTER TABLE public.tournament_players ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Tournament players public read" ON public.tournament_players FOR SELECT USING (true);
CREATE POLICY "Users join tournaments" ON public.tournament_players FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users leave tournaments" ON public.tournament_players FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- Activity feed
CREATE TABLE public.activity_feed (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  kind text NOT NULL,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX activity_feed_created_idx ON public.activity_feed (created_at DESC);
GRANT SELECT, INSERT ON public.activity_feed TO authenticated;
GRANT SELECT ON public.activity_feed TO anon;
GRANT ALL ON public.activity_feed TO service_role;
ALTER TABLE public.activity_feed ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Activity public read" ON public.activity_feed FOR SELECT USING (true);
CREATE POLICY "Users insert own activity" ON public.activity_feed FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

-- Wellness bonus events
CREATE TABLE public.wellness_bonus_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  source text NOT NULL,
  xp_bonus int NOT NULL DEFAULT 0,
  coin_bonus int NOT NULL DEFAULT 0,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.wellness_bonus_events TO authenticated;
GRANT ALL ON public.wellness_bonus_events TO service_role;
ALTER TABLE public.wellness_bonus_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users read own bonuses" ON public.wellness_bonus_events FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users insert own bonuses" ON public.wellness_bonus_events FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

-- Award XP + coins RPC (used after a match)
CREATE OR REPLACE FUNCTION public.award_xp_coins(_xp int, _coins int)
RETURNS public.profiles
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE result public.profiles;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  UPDATE public.profiles
     SET xp = xp + GREATEST(_xp, 0),
         reso_coins = reso_coins + GREATEST(_coins, 0),
         level = 1 + ((xp + GREATEST(_xp,0)) / 500)
   WHERE id = auth.uid()
   RETURNING * INTO result;
  RETURN result;
END;
$$;
GRANT EXECUTE ON FUNCTION public.award_xp_coins(int, int) TO authenticated;

-- Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.activity_feed;
ALTER PUBLICATION supabase_realtime ADD TABLE public.profiles;
