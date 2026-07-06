-- Enforce the same open Singles rating eligibility used by Find and match detail.
-- This changes function behavior only; no tables, columns, or other schema shape change.
CREATE OR REPLACE FUNCTION public.accept_match(_id uuid)
RETURNS public.matches
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _uid uuid := auth.uid();
  _m public.matches;
  _viewer_rating integer;
  _row public.matches;
BEGIN
  IF _uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT * INTO _m FROM public.matches WHERE id = _id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Match not found';
  END IF;

  IF _m.creator_id = _uid THEN
    RAISE EXCEPTION 'You cannot accept your own invite';
  END IF;

  IF _m.date_time <= now() THEN
    RAISE EXCEPTION 'This match is in the past';
  END IF;

  IF _m.status = 'open' THEN
    IF _m.format <> 'singles' THEN
      RAISE EXCEPTION 'Use the doubles join flow for this invite';
    END IF;
    IF _m.opponent_id IS NOT NULL THEN
      RAISE EXCEPTION 'Invite already taken';
    END IF;

    IF _m.desired_min_rating IS NOT NULL OR _m.desired_max_rating IS NOT NULL THEN
      SELECT current_rating INTO _viewer_rating
      FROM public.profiles
      WHERE id = _uid;

      IF _viewer_rating IS NULL
        OR (_m.desired_min_rating IS NOT NULL AND _viewer_rating < _m.desired_min_rating)
        OR (_m.desired_max_rating IS NOT NULL AND _viewer_rating > _m.desired_max_rating)
      THEN
        RAISE EXCEPTION 'Outside your rating range';
      END IF;
    END IF;

    UPDATE public.matches
      SET opponent_id = _uid, status = 'accepted'
      WHERE id = _id AND status = 'open' AND opponent_id IS NULL
      RETURNING * INTO _row;
    IF NOT FOUND THEN
      RAISE EXCEPTION 'Invite already taken';
    END IF;
    RETURN _row;
  ELSIF _m.status = 'invited' THEN
    IF _m.opponent_id <> _uid THEN
      RAISE EXCEPTION 'This invite is not for you';
    END IF;
    UPDATE public.matches
      SET status = 'accepted'
      WHERE id = _id AND status = 'invited' AND opponent_id = _uid
      RETURNING * INTO _row;
    RETURN _row;
  ELSE
    RAISE EXCEPTION 'This invite cannot be accepted';
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION public.accept_match(uuid) TO authenticated;
