
-- 1. Add rating_applied + per-player rating change columns to matches
ALTER TABLE public.matches
  ADD COLUMN IF NOT EXISTS rating_applied boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS creator_rating_change integer,
  ADD COLUMN IF NOT EXISTS opponent_rating_change integer;

-- 2. Backfill: any pre-existing confirmed match is treated as already applied (approach B)
UPDATE public.matches SET rating_applied = true WHERE status = 'confirmed';

-- 3. Rating history table
CREATE TABLE IF NOT EXISTS public.rating_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  match_id uuid NOT NULL REFERENCES public.matches(id) ON DELETE CASCADE,
  rating_before integer NOT NULL,
  rating_after integer NOT NULL,
  rating_change integer NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, match_id)
);

GRANT SELECT ON public.rating_history TO authenticated;
GRANT ALL ON public.rating_history TO service_role;

ALTER TABLE public.rating_history ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Players can read rating history of their matches" ON public.rating_history;
CREATE POLICY "Players can read rating history of their matches"
  ON public.rating_history FOR SELECT
  TO authenticated
  USING (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.matches m
      WHERE m.id = match_id
        AND (m.creator_id = auth.uid() OR m.opponent_id = auth.uid())
    )
  );

CREATE INDEX IF NOT EXISTS rating_history_user_created_idx
  ON public.rating_history (user_id, created_at DESC);

-- 4. Replace confirm_score with Elo-applying atomic version
CREATE OR REPLACE FUNCTION public.confirm_score(_id uuid)
 RETURNS matches
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _uid uuid := auth.uid();
  _m public.matches;
  _row public.matches;
  _loser_id uuid;
  _creator public.profiles;
  _opponent public.profiles;
  _creator_won boolean;
  _k_creator int;
  _k_opponent int;
  _exp_creator numeric;
  _exp_opponent numeric;
  _actual_creator numeric;
  _actual_opponent numeric;
  _creator_before int;
  _opponent_before int;
  _creator_after int;
  _opponent_after int;
  _creator_change int;
  _opponent_change int;
  _creator_new_count int;
  _opponent_new_count int;
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

  -- Lock both profiles in a deterministic order to avoid deadlocks
  IF _m.creator_id < _m.opponent_id THEN
    SELECT * INTO _creator FROM public.profiles WHERE id = _m.creator_id FOR UPDATE;
    SELECT * INTO _opponent FROM public.profiles WHERE id = _m.opponent_id FOR UPDATE;
  ELSE
    SELECT * INTO _opponent FROM public.profiles WHERE id = _m.opponent_id FOR UPDATE;
    SELECT * INTO _creator FROM public.profiles WHERE id = _m.creator_id FOR UPDATE;
  END IF;

  -- Flip status + wins/losses (guard against double apply via status filter)
  UPDATE public.matches
    SET status = 'confirmed', confirmed_at = now()
    WHERE id = _id AND status = 'score_pending'
    RETURNING * INTO _row;
  IF NOT FOUND THEN RAISE EXCEPTION 'Match state changed, please refresh'; END IF;

  UPDATE public.profiles SET wins = wins + 1 WHERE id = _row.winner_id;
  UPDATE public.profiles SET losses = losses + 1 WHERE id = _loser_id;

  IF _row.match_type = 'rated' THEN
    -- Increment rated_matches for both players
    UPDATE public.profiles
      SET rated_matches = rated_matches + 1
      WHERE id IN (_row.creator_id, _row.opponent_id);

    -- Apply Elo exactly once
    IF NOT _row.rating_applied THEN
      _creator_before  := COALESCE(_creator.current_rating, 1000);
      _opponent_before := COALESCE(_opponent.current_rating, 1000);
      _creator_won := (_row.winner_id = _row.creator_id);

      -- K based on rated_matches BEFORE this match (i.e. pre-increment count)
      _k_creator  := CASE WHEN _creator.rated_matches  < 5 THEN 40 ELSE 24 END;
      _k_opponent := CASE WHEN _opponent.rated_matches < 5 THEN 40 ELSE 24 END;

      _exp_creator  := 1.0 / (1.0 + power(10.0, (_opponent_before - _creator_before)::numeric / 400.0));
      _exp_opponent := 1.0 / (1.0 + power(10.0, (_creator_before  - _opponent_before)::numeric / 400.0));

      _actual_creator  := CASE WHEN _creator_won THEN 1 ELSE 0 END;
      _actual_opponent := 1 - _actual_creator;

      _creator_change  := round(_k_creator  * (_actual_creator  - _exp_creator));
      _opponent_change := round(_k_opponent * (_actual_opponent - _exp_opponent));

      _creator_after  := _creator_before  + _creator_change;
      _opponent_after := _opponent_before + _opponent_change;

      _creator_new_count  := _creator.rated_matches  + 1;
      _opponent_new_count := _opponent.rated_matches + 1;

      UPDATE public.profiles
        SET current_rating = _creator_after,
            provisional = (_creator_new_count < 5)
        WHERE id = _creator.id;
      UPDATE public.profiles
        SET current_rating = _opponent_after,
            provisional = (_opponent_new_count < 5)
        WHERE id = _opponent.id;

      INSERT INTO public.rating_history (user_id, match_id, rating_before, rating_after, rating_change)
      VALUES
        (_creator.id,  _row.id, _creator_before,  _creator_after,  _creator_change),
        (_opponent.id, _row.id, _opponent_before, _opponent_after, _opponent_change)
      ON CONFLICT (user_id, match_id) DO NOTHING;

      UPDATE public.matches
        SET rating_applied = true,
            creator_rating_change = _creator_change,
            opponent_rating_change = _opponent_change
        WHERE id = _row.id AND rating_applied = false
        RETURNING * INTO _row;
    END IF;
  END IF;

  RETURN _row;
END;
$function$;
