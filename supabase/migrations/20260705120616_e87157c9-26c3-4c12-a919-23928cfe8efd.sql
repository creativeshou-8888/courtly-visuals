
-- 1. Extend matches
ALTER TABLE public.matches
  ADD COLUMN IF NOT EXISTS doubles_style text,
  ADD COLUMN IF NOT EXISTS max_players smallint NOT NULL DEFAULT 2,
  ADD COLUMN IF NOT EXISTS partner_id uuid;

ALTER TABLE public.matches
  DROP CONSTRAINT IF EXISTS matches_doubles_style_chk,
  DROP CONSTRAINT IF EXISTS matches_max_players_chk,
  DROP CONSTRAINT IF EXISTS matches_format_shape_chk;

ALTER TABLE public.matches
  ADD CONSTRAINT matches_doubles_style_chk
    CHECK (doubles_style IS NULL OR doubles_style IN ('standard','rotating'));

ALTER TABLE public.matches
  ADD CONSTRAINT matches_max_players_chk
    CHECK (max_players IN (2,4,5,6));

ALTER TABLE public.matches
  ADD CONSTRAINT matches_format_shape_chk CHECK (
    (format = 'singles'
      AND max_players = 2
      AND doubles_style IS NULL
      AND partner_id IS NULL)
    OR (format = 'doubles' AND doubles_style = 'standard' AND max_players = 4)
    OR (format = 'doubles' AND doubles_style = 'rotating' AND max_players IN (5,6) AND partner_id IS NULL)
  );

-- 2. Participants table
CREATE TABLE IF NOT EXISTS public.match_participants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id uuid NOT NULL REFERENCES public.matches(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (match_id, user_id)
);

GRANT SELECT ON public.match_participants TO authenticated;
GRANT ALL ON public.match_participants TO service_role;

ALTER TABLE public.match_participants ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Participants readable to authenticated" ON public.match_participants;
CREATE POLICY "Participants readable to authenticated"
  ON public.match_participants FOR SELECT TO authenticated USING (true);

CREATE INDEX IF NOT EXISTS match_participants_match_id_idx ON public.match_participants(match_id);
CREATE INDEX IF NOT EXISTS match_participants_user_id_idx ON public.match_participants(user_id);

-- 3. Seed doubles participants at creation (creator + optional partner)
CREATE OR REPLACE FUNCTION public.seed_doubles_participants(_id uuid, _partner_id uuid)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _uid uuid := auth.uid();
  _m public.matches;
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  SELECT * INTO _m FROM public.matches WHERE id = _id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Match not found'; END IF;
  IF _m.creator_id <> _uid THEN RAISE EXCEPTION 'Only the creator can seed participants'; END IF;
  IF _m.format <> 'doubles' THEN RAISE EXCEPTION 'Not a doubles match'; END IF;

  INSERT INTO public.match_participants(match_id, user_id)
    VALUES (_id, _uid)
    ON CONFLICT DO NOTHING;

  IF _partner_id IS NOT NULL AND _m.doubles_style = 'standard' THEN
    IF _partner_id = _uid THEN RAISE EXCEPTION 'Partner cannot be yourself'; END IF;
    INSERT INTO public.match_participants(match_id, user_id)
      VALUES (_id, _partner_id)
      ON CONFLICT DO NOTHING;
  END IF;
END;
$$;

-- 4. Join doubles invite
CREATE OR REPLACE FUNCTION public.join_doubles_match(_id uuid)
RETURNS matches
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _uid uuid := auth.uid();
  _m public.matches;
  _joined int;
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
  IF _joined >= _m.max_players THEN
    RAISE EXCEPTION 'This match is full';
  END IF;

  INSERT INTO public.match_participants(match_id, user_id) VALUES (_id, _uid);
  _joined := _joined + 1;

  IF _joined >= _m.max_players THEN
    UPDATE public.matches SET status = 'accepted' WHERE id = _id
      RETURNING * INTO _row;
  ELSE
    _row := _m;
  END IF;

  RETURN _row;
END;
$$;
