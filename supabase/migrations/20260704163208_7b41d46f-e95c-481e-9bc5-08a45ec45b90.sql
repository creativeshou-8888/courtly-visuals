
CREATE TABLE public.post_match_feedback (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id uuid NOT NULL REFERENCES public.matches(id) ON DELETE CASCADE,
  giver_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  receiver_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  badges text[] NOT NULL DEFAULT '{}',
  note text,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT feedback_unique_giver_per_match UNIQUE (match_id, giver_id),
  CONSTRAINT feedback_giver_not_receiver CHECK (giver_id <> receiver_id),
  CONSTRAINT feedback_max_3_badges CHECK (array_length(badges, 1) IS NULL OR array_length(badges, 1) <= 3),
  CONSTRAINT feedback_note_length CHECK (note IS NULL OR char_length(note) <= 300)
);

GRANT SELECT, INSERT ON public.post_match_feedback TO authenticated;
GRANT ALL ON public.post_match_feedback TO service_role;

ALTER TABLE public.post_match_feedback ENABLE ROW LEVEL SECURITY;

-- Anyone signed in can read feedback (kudos are shown on public profiles)
CREATE POLICY "Feedback is readable by authenticated users"
  ON public.post_match_feedback FOR SELECT
  TO authenticated
  USING (true);

-- Insert enforced through server function; simple own-row check as backstop
CREATE POLICY "Users can insert their own feedback"
  ON public.post_match_feedback FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = giver_id);

CREATE INDEX idx_feedback_receiver ON public.post_match_feedback (receiver_id);
CREATE INDEX idx_feedback_match ON public.post_match_feedback (match_id);

-- RPC to submit feedback with full validation
CREATE OR REPLACE FUNCTION public.submit_post_match_feedback(
  _match_id uuid,
  _badges text[],
  _note text
)
RETURNS public.post_match_feedback
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _uid uuid := auth.uid();
  _m public.matches;
  _receiver uuid;
  _allowed text[] := ARRAY[
    'Super Forehand','Super Backhand','Super Serve','Volley Master',
    'Power Hitter','Slice Master','Moonball Master','All-Rounder',
    'Great Sport','Rising Star','Never Gives Up','Dream Partner'
  ];
  _b text;
  _row public.post_match_feedback;
  _clean_badges text[];
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;

  SELECT * INTO _m FROM public.matches WHERE id = _match_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Match not found'; END IF;
  IF _m.status <> 'confirmed' THEN
    RAISE EXCEPTION 'Feedback can only be left on confirmed matches';
  END IF;
  IF _uid <> _m.creator_id AND _uid <> _m.opponent_id THEN
    RAISE EXCEPTION 'Only match participants can leave feedback';
  END IF;

  _receiver := CASE WHEN _uid = _m.creator_id THEN _m.opponent_id ELSE _m.creator_id END;
  IF _receiver IS NULL THEN RAISE EXCEPTION 'Match has no opponent'; END IF;

  -- Deduplicate + validate badges
  IF _badges IS NULL THEN
    _clean_badges := ARRAY[]::text[];
  ELSE
    SELECT COALESCE(array_agg(DISTINCT b), ARRAY[]::text[])
      INTO _clean_badges
      FROM unnest(_badges) AS b
      WHERE b = ANY(_allowed);
  END IF;

  IF array_length(_clean_badges, 1) IS NOT NULL AND array_length(_clean_badges, 1) > 3 THEN
    RAISE EXCEPTION 'Maximum 3 badges allowed';
  END IF;

  IF _note IS NOT NULL AND char_length(_note) > 300 THEN
    RAISE EXCEPTION 'Note must be 300 characters or fewer';
  END IF;

  INSERT INTO public.post_match_feedback (match_id, giver_id, receiver_id, badges, note)
  VALUES (_match_id, _uid, _receiver, _clean_badges, NULLIF(btrim(_note), ''))
  RETURNING * INTO _row;

  RETURN _row;
END;
$$;
