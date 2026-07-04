
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

  IF _row.match_type = 'rated' THEN
    UPDATE public.profiles
      SET rated_matches = rated_matches + 1
      WHERE id IN (_row.creator_id, _row.opponent_id);
  END IF;

  RETURN _row;
END;
$function$;

WITH counts AS (
  SELECT p.id AS profile_id, COUNT(*)::int AS n
  FROM public.profiles p
  JOIN public.matches m
    ON m.status = 'confirmed'
   AND m.match_type = 'rated'
   AND (m.creator_id = p.id OR m.opponent_id = p.id)
  GROUP BY p.id
)
UPDATE public.profiles p
SET rated_matches = counts.n
FROM counts
WHERE p.id = counts.profile_id
  AND p.rated_matches <> counts.n;
