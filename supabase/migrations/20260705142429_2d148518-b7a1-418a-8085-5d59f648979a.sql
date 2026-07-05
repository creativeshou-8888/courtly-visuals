CREATE POLICY "Doubles participants can read match"
ON public.matches FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.match_participants mp
    WHERE mp.match_id = matches.id AND mp.user_id = auth.uid()
  )
);