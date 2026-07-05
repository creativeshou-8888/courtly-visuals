
-- Guest players for standard doubles matches
CREATE TABLE public.match_guests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id uuid NOT NULL REFERENCES public.matches(id) ON DELETE CASCADE,
  added_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  guest_name text NOT NULL CHECK (char_length(btrim(guest_name)) BETWEEN 1 AND 40),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX match_guests_match_id_idx ON public.match_guests(match_id);

GRANT SELECT, INSERT, DELETE ON public.match_guests TO authenticated;
GRANT ALL ON public.match_guests TO service_role;

ALTER TABLE public.match_guests ENABLE ROW LEVEL SECURITY;

-- Anyone authenticated who can see the match can see its guests
CREATE POLICY "Guests are visible to authenticated users"
  ON public.match_guests FOR SELECT TO authenticated USING (true);

-- Insert/delete are gated by RPCs which use SECURITY DEFINER; block direct writes
CREATE POLICY "No direct insert" ON public.match_guests FOR INSERT TO authenticated WITH CHECK (false);
CREATE POLICY "No direct delete" ON public.match_guests FOR DELETE TO authenticated USING (false);

-- Add guest (host only, standard doubles, capacity respected)
CREATE OR REPLACE FUNCTION public.add_match_guest(_match_id uuid, _name text)
RETURNS public.match_guests
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _uid uuid := auth.uid();
  _m public.matches;
  _joined int;
  _guests int;
  _clean text;
  _row public.match_guests;
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;

  SELECT * INTO _m FROM public.matches WHERE id = _match_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Match not found'; END IF;
  IF _m.creator_id <> _uid THEN RAISE EXCEPTION 'Only the host can add a guest'; END IF;
  IF _m.format <> 'doubles' OR _m.doubles_style <> 'standard' THEN
    RAISE EXCEPTION 'Guests are only allowed in standard doubles matches';
  END IF;
  IF _m.status NOT IN ('open','accepted') THEN
    RAISE EXCEPTION 'Cannot add guests to this match';
  END IF;

  _clean := btrim(COALESCE(_name, ''));
  IF char_length(_clean) < 1 OR char_length(_clean) > 40 THEN
    RAISE EXCEPTION 'Guest name must be 1–40 characters';
  END IF;

  SELECT count(*) INTO _joined FROM public.match_participants WHERE match_id = _match_id;
  SELECT count(*) INTO _guests FROM public.match_guests WHERE match_id = _match_id;
  IF (_joined + _guests) >= _m.max_players THEN
    RAISE EXCEPTION 'This match is full';
  END IF;

  INSERT INTO public.match_guests(match_id, added_by, guest_name)
    VALUES (_match_id, _uid, _clean)
    RETURNING * INTO _row;

  -- If match becomes full via guest, flip to accepted
  IF (_joined + _guests + 1) >= _m.max_players AND _m.status = 'open' THEN
    UPDATE public.matches SET status = 'accepted' WHERE id = _match_id;
  END IF;

  RETURN _row;
END;
$$;

-- Remove guest (host only)
CREATE OR REPLACE FUNCTION public.remove_match_guest(_guest_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _uid uuid := auth.uid();
  _g public.match_guests;
  _m public.matches;
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;

  SELECT * INTO _g FROM public.match_guests WHERE id = _guest_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Guest not found'; END IF;

  SELECT * INTO _m FROM public.matches WHERE id = _g.match_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Match not found'; END IF;
  IF _m.creator_id <> _uid THEN RAISE EXCEPTION 'Only the host can remove a guest'; END IF;
  IF _m.status NOT IN ('open','accepted') THEN
    RAISE EXCEPTION 'Cannot remove guests from this match';
  END IF;

  DELETE FROM public.match_guests WHERE id = _guest_id;

  -- If match was accepted purely because it was full, reopen it now that a spot opened
  IF _m.status = 'accepted' THEN
    UPDATE public.matches SET status = 'open' WHERE id = _m.id AND status = 'accepted';
  END IF;
END;
$$;

-- Update join_doubles_match to account for guests in capacity
CREATE OR REPLACE FUNCTION public.join_doubles_match(_id uuid)
RETURNS public.matches
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _uid uuid := auth.uid();
  _m public.matches;
  _joined int;
  _guests int;
  _row public.matches;
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;

  SELECT * INTO _m FROM public.matches WHERE id = _id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Match not found'; END IF;

  IF _m.format <> 'doubles' THEN RAISE EXCEPTION 'Not a doubles match'; END IF;
  IF _m.status <> 'open' THEN RAISE EXCEPTION 'This invite is no longer open'; END IF;
  IF _m.date_time <= now() THEN RAISE EXCEPTION 'This match is in the past'; END IF;

  IF EXISTS (SELECT 1 FROM public.match_participants WHERE match_id = _id AND user_id = _uid) THEN
    RAISE EXCEPTION 'You already joined this match';
  END IF;

  SELECT count(*) INTO _joined FROM public.match_participants WHERE match_id = _id;
  SELECT count(*) INTO _guests FROM public.match_guests WHERE match_id = _id;
  IF (_joined + _guests) >= _m.max_players THEN
    RAISE EXCEPTION 'This match is full';
  END IF;

  INSERT INTO public.match_participants(match_id, user_id) VALUES (_id, _uid);
  _joined := _joined + 1;

  IF (_joined + _guests) >= _m.max_players THEN
    UPDATE public.matches SET status = 'accepted' WHERE id = _id
      RETURNING * INTO _row;
  ELSE
    _row := _m;
  END IF;

  RETURN _row;
END;
$$;
