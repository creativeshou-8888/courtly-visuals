
-- Roles enum + table
CREATE TYPE public.app_role AS ENUM ('player', 'admin');

CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);

GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

CREATE POLICY "Users can read own roles"
  ON public.user_roles FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Only admins can modify roles"
  ON public.user_roles FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Profiles
CREATE TABLE public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL DEFAULT '',
  email text NOT NULL DEFAULT '',
  photo_url text,
  level numeric(2,1),
  initial_rating int,
  current_rating int,
  provisional boolean NOT NULL DEFAULT true,
  rated_matches int NOT NULL DEFAULT 0,
  wins int NOT NULL DEFAULT 0,
  losses int NOT NULL DEFAULT 0,
  preferred_courts text[] NOT NULL DEFAULT '{}',
  availability text[] NOT NULL DEFAULT '{}',
  phone text,
  bio text,
  onboarded boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT profiles_level_valid CHECK (level IS NULL OR level IN (2.5,3.0,3.5,4.0,4.5,5.0))
);

GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Owner + admin only (protects phone)
CREATE POLICY "Owner or admin can read profile"
  ON public.profiles FOR SELECT TO authenticated
  USING (auth.uid() = id OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Owner can update own profile"
  ON public.profiles FOR UPDATE TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Owner can insert own profile"
  ON public.profiles FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = id);

-- updated_at trigger
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;

CREATE TRIGGER profiles_set_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Public view (no phone). SECURITY DEFINER by default (view owner = postgres)
-- so it bypasses RLS on profiles; only the safe columns are exposed.
CREATE VIEW public.public_profiles AS
SELECT
  id, name, photo_url, level, initial_rating, current_rating,
  provisional, rated_matches, wins, losses,
  preferred_courts, availability, bio, onboarded, created_at
FROM public.profiles;

GRANT SELECT ON public.public_profiles TO anon, authenticated;

-- Auto-create profile + player role on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, name, email)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'name', ''),
    NEW.email
  );
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'player')
  ON CONFLICT DO NOTHING;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Onboarding completion: maps level -> starting rating
CREATE OR REPLACE FUNCTION public.complete_onboarding(
  _name text,
  _photo_url text,
  _level numeric,
  _preferred_courts text[],
  _availability text[],
  _phone text,
  _bio text
)
RETURNS public.profiles
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _rating int;
  _row public.profiles;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
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
  SET name = COALESCE(NULLIF(_name,''), name),
      photo_url = _photo_url,
      level = _level,
      initial_rating = _rating,
      current_rating = _rating,
      provisional = true,
      rated_matches = 0,
      wins = 0,
      losses = 0,
      preferred_courts = COALESCE(_preferred_courts, '{}'),
      availability = COALESCE(_availability, '{}'),
      phone = _phone,
      bio = _bio,
      onboarded = true
  WHERE id = auth.uid()
  RETURNING * INTO _row;

  RETURN _row;
END;
$$;

GRANT EXECUTE ON FUNCTION public.complete_onboarding(text, text, numeric, text[], text[], text, text) TO authenticated;
