
CREATE OR REPLACE FUNCTION public.resubmit_score(_id uuid, _winner_id uuid, _sets jsonb)
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

  IF _m.status <> 'disputed' THEN
    RAISE EXCEPTION 'Only disputed matches can be resubmitted';
  END IF;
  IF _uid <> _m.submitted_by THEN
    RAISE EXCEPTION 'Only the original submitter can resubmit the score';
  END IF;
  IF _winner_id <> _m.creator_id AND _winner_id <> _m.opponent_id THEN
    RAISE EXCEPTION 'Winner must be one of the two players';
  END IF;

  _creator_won := (_winner_id = _m.creator_id);
  PERFORM public.validate_tennis_sets(_sets, _creator_won);

  UPDATE public.matches
    SET status = 'score_pending',
        winner_id = _winner_id,
        score_sets = _sets,
        submitted_by = _uid,
        submitted_at = now(),
        confirmed_at = NULL
    WHERE id = _id AND status = 'disputed'
    RETURNING * INTO _row;
  IF NOT FOUND THEN RAISE EXCEPTION 'Match state changed, please refresh'; END IF;
  RETURN _row;
END;
$$;

CREATE OR REPLACE FUNCTION public.cancel_disputed_match(_id uuid)
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

  IF _m.status <> 'disputed' THEN
    RAISE EXCEPTION 'Only disputed matches can be cancelled here';
  END IF;
  IF _uid <> _m.submitted_by THEN
    RAISE EXCEPTION 'Only the original submitter can cancel a disputed match';
  END IF;
  IF _m.rating_applied THEN
    RAISE EXCEPTION 'Ratings already applied for this match';
  END IF;

  UPDATE public.matches
    SET status = 'cancelled'
    WHERE id = _id AND status = 'disputed'
    RETURNING * INTO _row;
  IF NOT FOUND THEN RAISE EXCEPTION 'Match state changed, please refresh'; END IF;
  RETURN _row;
END;
$$;
