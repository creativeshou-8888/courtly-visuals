
-- 1. Recreate view as security_invoker (linter fix 0010)
DROP VIEW public.public_profiles;

-- Row-level SELECT policy: allow read of NON-PHONE columns. Phone column
-- is protected by lack of column-level GRANT, not by RLS.
DROP POLICY "Owner or admin can read profile" ON public.profiles;

CREATE POLICY "Anyone can read non-phone profile columns"
  ON public.profiles FOR SELECT
  TO anon, authenticated
  USING (true);

-- Revoke blanket SELECT (from earlier migration) and re-grant per column.
REVOKE SELECT ON public.profiles FROM authenticated;

GRANT SELECT (
  id, name, email, photo_url, level, initial_rating, current_rating,
  provisional, rated_matches, wins, losses, preferred_courts, availability,
  bio, onboarded, created_at, updated_at
) ON public.profiles TO authenticated;

GRANT SELECT (
  id, name, photo_url, level, initial_rating, current_rating,
  provisional, rated_matches, wins, losses, preferred_courts, availability,
  bio, onboarded, created_at
) ON public.profiles TO anon;

-- Note: `phone` column is intentionally NOT granted to anon or authenticated.
-- Owner/admin read it only through the security-definer functions below.

CREATE VIEW public.public_profiles
WITH (security_invoker = on) AS
SELECT
  id, name, photo_url, level, initial_rating, current_rating,
  provisional, rated_matches, wins, losses,
  preferred_courts, availability, bio, onboarded, created_at
FROM public.profiles;

GRANT SELECT ON public.public_profiles TO anon, authenticated;

-- 2. Owner-only fetch that includes phone.
CREATE OR REPLACE FUNCTION public.get_my_profile()
RETURNS public.profiles
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT * FROM public.profiles WHERE id = auth.uid();
$$;

REVOKE EXECUTE ON FUNCTION public.get_my_profile() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_my_profile() TO authenticated;

-- 3. Admin-only fetch that includes phone (for support tooling).
CREATE OR REPLACE FUNCTION public.get_profile_with_phone(_id uuid)
RETURNS public.profiles
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE _row public.profiles;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Forbidden';
  END IF;
  SELECT * INTO _row FROM public.profiles WHERE id = _id;
  RETURN _row;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.get_profile_with_phone(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_profile_with_phone(uuid) TO authenticated;

-- 4. Lock down search_path on existing functions (linter fix 0011)
ALTER FUNCTION public.set_updated_at() SET search_path = public;

-- 5. Revoke anon execute on user-only functions (linter fix 0028)
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.complete_onboarding(text, text, numeric, text[], text[], text, text) FROM PUBLIC, anon;
-- authenticated grant already exists from prior migration
