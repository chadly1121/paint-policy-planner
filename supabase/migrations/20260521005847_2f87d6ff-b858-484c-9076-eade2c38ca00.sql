ALTER TABLE public.orgs
ADD COLUMN jurisdiction text NOT NULL DEFAULT 'CA-ON'
CHECK (jurisdiction IN ('CA-ON', 'CA-other', 'US'));