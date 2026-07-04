
-- Phase 3B: safe accept/decline RPCs
CREATE OR REPLACE FUNCTION public.accept_match(_id uuid)
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
    IF _m.opponent_id IS NOT NULL THEN
      RAISE EXCEPTION 'Invite already taken';
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

CREATE OR REPLACE FUNCTION public.decline_match(_id uuid)
RETURNS public.matches
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _uid uuid := auth.uid();
  _row public.matches;
BEGIN
  IF _uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  UPDATE public.matches
    SET status = 'declined'
    WHERE id = _id AND status = 'invited' AND opponent_id = _uid
    RETURNING * INTO _row;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Cannot decline this invite';
  END IF;
  RETURN _row;
END;
$$;

GRANT EXECUTE ON FUNCTION public.accept_match(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.decline_match(uuid) TO authenticated;
