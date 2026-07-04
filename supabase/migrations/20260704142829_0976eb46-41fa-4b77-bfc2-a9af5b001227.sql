-- Enums
CREATE TYPE public.match_type AS ENUM ('rated', 'friendly');
CREATE TYPE public.match_status AS ENUM (
  'open', 'invited', 'accepted', 'declined',
  'score_pending', 'confirmation_pending', 'confirmed',
  'disputed', 'cancelled', 'expired', 'voided'
);

-- Table
CREATE TABLE public.matches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  opponent_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  date_time timestamptz NOT NULL,
  court_location text NOT NULL,
  court_booked boolean NOT NULL DEFAULT false,
  match_type public.match_type NOT NULL,
  status public.match_status NOT NULL DEFAULT 'open',
  desired_min_rating int,
  desired_max_rating int,
  message text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT matches_not_self CHECK (opponent_id IS NULL OR opponent_id <> creator_id),
  CONSTRAINT matches_rating_range CHECK (
    desired_min_rating IS NULL OR desired_max_rating IS NULL OR desired_min_rating <= desired_max_rating
  ),
  CONSTRAINT matches_message_len CHECK (message IS NULL OR char_length(message) <= 500),
  CONSTRAINT matches_court_len CHECK (char_length(court_location) BETWEEN 1 AND 200)
);

CREATE INDEX matches_creator_idx ON public.matches(creator_id);
CREATE INDEX matches_opponent_idx ON public.matches(opponent_id);
CREATE INDEX matches_status_idx ON public.matches(status);

-- Grants
GRANT SELECT, INSERT, UPDATE ON public.matches TO authenticated;
GRANT ALL ON public.matches TO service_role;

-- RLS
ALTER TABLE public.matches ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Creator can read own matches"
  ON public.matches FOR SELECT TO authenticated
  USING (auth.uid() = creator_id);

CREATE POLICY "Invited opponent can read"
  ON public.matches FOR SELECT TO authenticated
  USING (auth.uid() = opponent_id);

CREATE POLICY "Any signed-in user can read open invites"
  ON public.matches FOR SELECT TO authenticated
  USING (status = 'open');

CREATE POLICY "Creator can insert own matches"
  ON public.matches FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = creator_id
    AND date_time > now()
    AND status IN ('open', 'invited')
    AND (
      (opponent_id IS NULL AND status = 'open')
      OR (opponent_id IS NOT NULL AND status = 'invited')
    )
  );

CREATE POLICY "Creator can update own matches"
  ON public.matches FOR UPDATE TO authenticated
  USING (auth.uid() = creator_id)
  WITH CHECK (auth.uid() = creator_id);

-- Updated-at trigger (reuse existing helper)
CREATE TRIGGER matches_set_updated_at
  BEFORE UPDATE ON public.matches
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
