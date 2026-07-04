
-- 1. Add score columns to matches
ALTER TABLE public.matches
  ADD COLUMN IF NOT EXISTS winner_id uuid,
  ADD COLUMN IF NOT EXISTS submitted_by uuid,
  ADD COLUMN IF NOT EXISTS submitted_at timestamptz,
  ADD COLUMN IF NOT EXISTS confirmed_at timestamptz,
  ADD COLUMN IF NOT EXISTS score_sets jsonb;

-- 2. Ensure the opponent of an ACCEPTED match can also read the row (previous
-- "Invited opponent can read" only covered opponent_id = auth.uid() which is
-- still true after acceptance, so it already works — but add an explicit
-- policy for clarity that opponents can read accepted matches too).
DROP POLICY IF EXISTS "Opponent can read own matches" ON public.matches;
CREATE POLICY "Opponent can read own matches"
  ON public.matches FOR SELECT
  TO authenticated
  USING (auth.uid() = opponent_id);

-- 3. Allow the opponent to update the row for score confirmation/dispute
-- (submission and confirmation go through SECURITY DEFINER RPCs, so this is
-- just a belt-and-braces safety; RPCs enforce all rules).
DROP POLICY IF EXISTS "Opponent can update accepted match for scoring" ON public.matches;
CREATE POLICY "Opponent can update accepted match for scoring"
  ON public.matches FOR UPDATE
  TO authenticated
  USING (auth.uid() = opponent_id)
  WITH CHECK (auth.uid() = opponent_id);

-- 4. Tennis score validation helper
CREATE OR REPLACE FUNCTION public.validate_tennis_sets(_sets jsonb, _creator_won boolean)
RETURNS void
LANGUAGE plpgsql
IMMUTABLE
SET search_path = public
AS $$
DECLARE
  set_count int;
  a_sets int := 0;
  b_sets int := 0;
  s jsonb;
  a int;
  b int;
  is_final boolean;
  i int;
BEGIN
  IF _sets IS NULL OR jsonb_typeof(_sets) <> 'array' THEN
    RAISE EXCEPTION 'Invalid score format';
  END IF;
  set_count := jsonb_array_length(_sets);
  IF set_count < 2 OR set_count > 3 THEN
    RAISE EXCEPTION 'A best-of-3 match needs 2 or 3 sets';
  END IF;

  FOR i IN 0..set_count - 1 LOOP
    s := _sets -> i;
    IF s IS NULL OR (s ? 'a') = false OR (s ? 'b') = false THEN
      RAISE EXCEPTION 'Each set must have "a" and "b" game counts';
    END IF;
    a := (s->>'a')::int;
    b := (s->>'b')::int;
    is_final := (i = set_count - 1) AND (set_count = 3);

    IF a < 0 OR b < 0 THEN
      RAISE EXCEPTION 'Set scores cannot be negative';
    END IF;
    IF a = b THEN
      RAISE EXCEPTION 'Set % has a tie: %-%', i + 1, a, b;
    END IF;

    IF NOT (
      (a = 6 AND b BETWEEN 0 AND 4) OR
      (b = 6 AND a BETWEEN 0 AND 4) OR
      (a = 7 AND b IN (5, 6)) OR
      (b = 7 AND a IN (5, 6)) OR
      (is_final AND (
        (a >= 10 AND a - b >= 2) OR (b >= 10 AND b - a >= 2)
      ))
    ) THEN
      RAISE EXCEPTION 'Invalid tennis set score: %-%', a, b;
    END IF;

    IF a > b THEN a_sets := a_sets + 1; ELSE b_sets := b_sets + 1; END IF;
  END LOOP;

  IF NOT ((a_sets = 2 AND b_sets <= 1) OR (b_sets = 2 AND a_sets <= 1)) THEN
    RAISE EXCEPTION 'A match must be won 2 sets to 0 or 2 sets to 1';
  END IF;

  IF _creator_won AND a_sets < b_sets THEN
    RAISE EXCEPTION 'Set scores do not match the selected winner';
  END IF;
  IF (NOT _creator_won) AND b_sets < a_sets THEN
    RAISE EXCEPTION 'Set scores do not match the selected winner';
  END IF;
END;
$$;

-- 5. submit_score RPC
CREATE OR REPLACE FUNCTION public.submit_score(_id uuid, _winner_id uuid, _sets jsonb)
RETURNS public.matches
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _uid uuid := auth.uid();
  _m public.matches;
  _row public.matches;
  _creator_won boolean;
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;

  SELECT * INTO _m FROM public.matches WHERE id = _id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Match not found'; END IF;

  IF _uid <> _m.creator_id AND _uid <> _m.opponent_id THEN
    RAISE EXCEPTION 'Only the two players can submit a score';
  END IF;
  IF _m.status <> 'accepted' THEN
    RAISE EXCEPTION 'Only accepted matches can receive a score';
  END IF;
  IF _m.date_time > now() THEN
    RAISE EXCEPTION 'You can enter the score only after the scheduled match time';
  END IF;
  IF _winner_id <> _m.creator_id AND _winner_id <> _m.opponent_id THEN
    RAISE EXCEPTION 'Winner must be one of the two players';
  END IF;

  _creator_won := (_winner_id = _m.creator_id);
  PERFORM public.validate_tennis_sets(_sets, _creator_won);

  UPDATE public.matches
    SET status = 'score_pending',
        winner_id = _winner_id,
        submitted_by = _uid,
        submitted_at = now(),
        score_sets = _sets,
        confirmed_at = NULL
    WHERE id = _id AND status = 'accepted'
    RETURNING * INTO _row;
  IF NOT FOUND THEN RAISE EXCEPTION 'Match state changed, please refresh'; END IF;
  RETURN _row;
END;
$$;

-- 6. confirm_score RPC
CREATE OR REPLACE FUNCTION public.confirm_score(_id uuid)
RETURNS public.matches
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _uid uuid := auth.uid();
  _m public.matches;
  _row public.matches;
  _loser_id uuid;
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;

  SELECT * INTO _m FROM public.matches WHERE id = _id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Match not found'; END IF;

  IF _uid <> _m.creator_id AND _uid <> _m.opponent_id THEN
    RAISE EXCEPTION 'Only the two players can confirm a score';
  END IF;
  IF _m.status <> 'score_pending' THEN
    RAISE EXCEPTION 'This match is not awaiting confirmation';
  END IF;
  IF _uid = _m.submitted_by THEN
    RAISE EXCEPTION 'You cannot confirm a score you submitted';
  END IF;

  _loser_id := CASE WHEN _m.winner_id = _m.creator_id THEN _m.opponent_id ELSE _m.creator_id END;

  UPDATE public.matches
    SET status = 'confirmed', confirmed_at = now()
    WHERE id = _id AND status = 'score_pending'
    RETURNING * INTO _row;
  IF NOT FOUND THEN RAISE EXCEPTION 'Match state changed, please refresh'; END IF;

  UPDATE public.profiles SET wins = wins + 1 WHERE id = _row.winner_id;
  UPDATE public.profiles SET losses = losses + 1 WHERE id = _loser_id;

  RETURN _row;
END;
$$;

-- 7. dispute_score RPC
CREATE OR REPLACE FUNCTION public.dispute_score(_id uuid)
RETURNS public.matches
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _uid uuid := auth.uid();
  _m public.matches;
  _row public.matches;
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;

  SELECT * INTO _m FROM public.matches WHERE id = _id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Match not found'; END IF;

  IF _uid <> _m.creator_id AND _uid <> _m.opponent_id THEN
    RAISE EXCEPTION 'Only the two players can dispute a score';
  END IF;
  IF _m.status <> 'score_pending' THEN
    RAISE EXCEPTION 'This match is not awaiting confirmation';
  END IF;
  IF _uid = _m.submitted_by THEN
    RAISE EXCEPTION 'You cannot dispute a score you submitted';
  END IF;

  UPDATE public.matches
    SET status = 'disputed'
    WHERE id = _id AND status = 'score_pending'
    RETURNING * INTO _row;
  IF NOT FOUND THEN RAISE EXCEPTION 'Match state changed, please refresh'; END IF;
  RETURN _row;
END;
$$;
