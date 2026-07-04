
-- Storage RLS for avatars bucket. Users can only manage files inside a folder named after their user id.
CREATE POLICY "Users can read own avatars" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Users can upload own avatars" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Users can update own avatars" ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text)
  WITH CHECK (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Users can delete own avatars" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);

-- Allow a user to correct their starting playing level exactly while rated_matches = 0.
-- This RPC replaces manual UPDATE-on-level from the client. It recomputes initial + current rating.
CREATE OR REPLACE FUNCTION public.correct_starting_level(_level numeric)
RETURNS public.profiles
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _rating int;
  _row public.profiles;
  _current public.profiles;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT * INTO _current FROM public.profiles WHERE id = auth.uid();
  IF _current.rated_matches > 0 THEN
    RAISE EXCEPTION 'Level is locked after your first rated match';
  END IF;

  _rating := CASE _level
    WHEN 2.5 THEN 800
    WHEN 3.0 THEN 1000
    WHEN 3.5 THEN 1200
    WHEN 4.0 THEN 1400
    WHEN 4.5 THEN 1600
    WHEN 5.0 THEN 1800
    ELSE NULL
  END;

  IF _rating IS NULL THEN
    RAISE EXCEPTION 'Invalid level: %', _level;
  END IF;

  UPDATE public.profiles
  SET level = _level,
      initial_rating = _rating,
      current_rating = _rating,
      provisional = true
  WHERE id = auth.uid()
  RETURNING * INTO _row;

  RETURN _row;
END;
$$;

REVOKE ALL ON FUNCTION public.correct_starting_level(numeric) FROM public;
GRANT EXECUTE ON FUNCTION public.correct_starting_level(numeric) TO authenticated;
