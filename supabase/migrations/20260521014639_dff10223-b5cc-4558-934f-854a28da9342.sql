-- 1) Enum for relationship types
DO $$ BEGIN
  CREATE TYPE public.doc_relationship_type AS ENUM ('related', 'suggested_next', 'depends_on', 'replaces');
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- 2) Document relationships table
-- Note: documents live across 6 category tables, so we key relationships by the
-- canonical ROP-XXX-### code (doc_id_external) rather than a polymorphic FK.
CREATE TABLE IF NOT EXISTS public.document_relationships (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id                UUID NOT NULL,
  from_doc_id_external  TEXT NOT NULL,
  to_doc_id_external    TEXT NOT NULL,
  relationship_type     public.doc_relationship_type NOT NULL DEFAULT 'related',
  notes                 TEXT,
  source                TEXT NOT NULL DEFAULT 'manual', -- 'manual' | 'auto'
  created_by            UUID,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (org_id, from_doc_id_external, to_doc_id_external, relationship_type)
);

CREATE INDEX IF NOT EXISTS idx_docrel_from ON public.document_relationships (org_id, from_doc_id_external);
CREATE INDEX IF NOT EXISTS idx_docrel_to   ON public.document_relationships (org_id, to_doc_id_external);

ALTER TABLE public.document_relationships ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members can view relationships"
  ON public.document_relationships FOR SELECT
  USING (org_id = public.get_user_org_id(auth.uid()));

CREATE POLICY "Org admins can insert relationships"
  ON public.document_relationships FOR INSERT
  WITH CHECK (public.is_org_admin(auth.uid(), org_id));

CREATE POLICY "Org admins can update relationships"
  ON public.document_relationships FOR UPDATE
  USING (public.is_org_admin(auth.uid(), org_id));

CREATE POLICY "Org admins can delete relationships"
  ON public.document_relationships FOR DELETE
  USING (public.is_org_admin(auth.uid(), org_id));

CREATE TRIGGER trg_document_relationships_updated_at
  BEFORE UPDATE ON public.document_relationships
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();