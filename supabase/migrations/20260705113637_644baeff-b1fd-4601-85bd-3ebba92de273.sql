ALTER TABLE public.matches
  ADD COLUMN IF NOT EXISTS format text NOT NULL DEFAULT 'singles';

UPDATE public.matches SET format = 'singles' WHERE format IS NULL;

ALTER TABLE public.matches
  DROP CONSTRAINT IF EXISTS matches_format_check;

ALTER TABLE public.matches
  ADD CONSTRAINT matches_format_check CHECK (format IN ('singles', 'doubles'));