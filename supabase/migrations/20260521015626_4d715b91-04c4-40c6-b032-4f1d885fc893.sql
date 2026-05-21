ALTER TABLE public.orgs
  ALTER COLUMN jurisdiction SET DEFAULT 'CA-ON',
  ALTER COLUMN jurisdiction SET NOT NULL;

UPDATE public.orgs SET jurisdiction = 'CA-ON' WHERE jurisdiction IS NULL OR jurisdiction NOT IN ('CA-ON','CA-other','US');

ALTER TABLE public.orgs
  DROP CONSTRAINT IF EXISTS orgs_jurisdiction_check;

ALTER TABLE public.orgs
  ADD CONSTRAINT orgs_jurisdiction_check CHECK (jurisdiction IN ('CA-ON','CA-other','US'));