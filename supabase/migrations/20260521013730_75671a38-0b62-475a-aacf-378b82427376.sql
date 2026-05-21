-- 1. Add parsed_sections column to all 5 tables
ALTER TABLE public.company_policies     ADD COLUMN IF NOT EXISTS parsed_sections jsonb;
ALTER TABLE public.company_sops         ADD COLUMN IF NOT EXISTS parsed_sections jsonb;
ALTER TABLE public.company_safety       ADD COLUMN IF NOT EXISTS parsed_sections jsonb;
ALTER TABLE public.company_training     ADD COLUMN IF NOT EXISTS parsed_sections jsonb;
ALTER TABLE public.company_disciplinary ADD COLUMN IF NOT EXISTS parsed_sections jsonb;

-- 2. Parser function: splits content by H2 (##) and maps known headings to canonical keys
CREATE OR REPLACE FUNCTION public.parse_document_sections(_content text)
RETURNS jsonb
LANGUAGE plpgsql
IMMUTABLE
SET search_path TO 'public'
AS $$
DECLARE
  result jsonb := jsonb_build_object(
    'purpose', NULL,
    'scope', NULL,
    'non_negotiables', NULL,
    'policy_statement', NULL,
    'procedure_steps', NULL,
    'tools_required', NULL,
    'quality_check', NULL,
    'common_mistakes', NULL,
    'responsibilities', NULL,
    'consequences', NULL,
    'acknowledgement', NULL
  );
  lines text[];
  line text;
  current_heading text := NULL;
  current_key text := NULL;
  buffer text := '';
  i int;
  -- helpers
  bullets text[];
  numbered text[];
  resp_arr jsonb := '[]'::jsonb;
  bullet_match text;
  trimmed text;
  role_part text;
  duties_part text;
  m text[];

  -- finalize current section into result
  -- (declared inline below; do work in flush block)
BEGIN
  IF _content IS NULL OR length(trim(_content)) = 0 THEN
    RETURN result;
  END IF;

  lines := regexp_split_to_array(_content, E'\\r?\\n');

  -- Append a sentinel H2 so the final section is flushed
  lines := array_append(lines, '## __END__');

  FOR i IN 1 .. array_length(lines, 1) LOOP
    line := lines[i];

    IF line ~ '^\s*##\s+' THEN
      -- flush previous section
      IF current_key IS NOT NULL THEN
        trimmed := btrim(buffer, E' \n\r\t');

        IF current_key IN ('purpose','scope','policy_statement','quality_check','consequences','acknowledgement') THEN
          IF length(trimmed) > 0 THEN
            result := jsonb_set(result, ARRAY[current_key], to_jsonb(trimmed));
          END IF;

        ELSIF current_key IN ('non_negotiables','tools_required','common_mistakes') THEN
          -- split by bullet/line
          bullets := ARRAY(
            SELECT btrim(regexp_replace(l, '^\s*[-*•]\s*', ''))
            FROM regexp_split_to_table(trimmed, E'\\r?\\n') AS l
            WHERE btrim(l) <> ''
              AND btrim(l) !~ '^#'
          );
          IF array_length(bullets, 1) IS NOT NULL THEN
            result := jsonb_set(result, ARRAY[current_key], to_jsonb(bullets));
          END IF;

        ELSIF current_key = 'procedure_steps' THEN
          -- prefer numbered items; fall back to bullets/lines
          numbered := ARRAY(
            SELECT btrim(regexp_replace(l, '^\s*(\d+\.|\d+\)|[-*•])\s*', ''))
            FROM regexp_split_to_table(trimmed, E'\\r?\\n') AS l
            WHERE btrim(l) <> ''
              AND btrim(l) !~ '^#'
          );
          IF array_length(numbered, 1) IS NOT NULL THEN
            result := jsonb_set(result, ARRAY[current_key], to_jsonb(numbered));
          END IF;

        ELSIF current_key = 'responsibilities' THEN
          resp_arr := '[]'::jsonb;
          FOR bullet_match IN
            SELECT btrim(regexp_replace(l, '^\s*[-*•]\s*', ''))
            FROM regexp_split_to_table(trimmed, E'\\r?\\n') AS l
            WHERE btrim(l) <> ''
              AND btrim(l) !~ '^#'
          LOOP
            -- Try "Role: duties" or "**Role**: duties"
            m := regexp_match(bullet_match, '^\*{0,2}([^:*]+)\*{0,2}\s*[:\-–]\s*(.+)$');
            IF m IS NOT NULL THEN
              role_part := btrim(m[1]);
              duties_part := btrim(m[2]);
            ELSE
              role_part := bullet_match;
              duties_part := '';
            END IF;
            resp_arr := resp_arr || jsonb_build_object('role', role_part, 'duties', duties_part);
          END LOOP;
          IF jsonb_array_length(resp_arr) > 0 THEN
            result := jsonb_set(result, ARRAY[current_key], resp_arr);
          END IF;
        END IF;
      END IF;

      -- start new section
      current_heading := lower(btrim(regexp_replace(line, '^\s*##\s+', '')));
      -- strip trailing punctuation/slashes/parens commonly added
      current_heading := regexp_replace(current_heading, '[/\(].*$', '');
      current_heading := btrim(current_heading);

      current_key := CASE
        WHEN current_heading = 'purpose' OR current_heading = 'purpose/overview' OR current_heading LIKE 'purpose %' THEN 'purpose'
        WHEN current_heading = 'scope' THEN 'scope'
        WHEN current_heading = 'non-negotiables' OR current_heading = 'non negotiables' THEN 'non_negotiables'
        WHEN current_heading = 'policy statement' THEN 'policy_statement'
        WHEN current_heading = 'procedure' OR current_heading = 'step-by-step procedure' OR current_heading = 'procedure steps' OR current_heading = 'procedures' THEN 'procedure_steps'
        WHEN current_heading LIKE 'required tools%' OR current_heading = 'tools required' OR current_heading LIKE 'materials/equipment%' OR current_heading LIKE 'materials and equipment%' THEN 'tools_required'
        WHEN current_heading = 'quality check' OR current_heading = 'definition of done' OR current_heading = 'quality standards' THEN 'quality_check'
        WHEN current_heading = 'common mistakes to avoid' OR current_heading = 'common mistakes' THEN 'common_mistakes'
        WHEN current_heading = 'responsibilities' THEN 'responsibilities'
        WHEN current_heading = 'consequences of non-compliance' OR current_heading = 'consequences' THEN 'consequences'
        WHEN current_heading = 'acknowledgement' OR current_heading = 'acknowledgment' THEN 'acknowledgement'
        ELSE NULL
      END;

      buffer := '';
    ELSE
      buffer := buffer || E'\n' || line;
    END IF;
  END LOOP;

  RETURN result;
END;
$$;

-- 3. Trigger function to keep parsed_sections in sync with content
CREATE OR REPLACE FUNCTION public.refresh_parsed_sections()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF TG_OP = 'INSERT'
     OR NEW.content IS DISTINCT FROM OLD.content
     OR NEW.parsed_sections IS NULL THEN
    NEW.parsed_sections := public.parse_document_sections(NEW.content);
  END IF;
  RETURN NEW;
END;
$$;

-- 4. Attach triggers to all 5 tables (BEFORE INSERT/UPDATE)
DROP TRIGGER IF EXISTS trg_refresh_parsed_sections ON public.company_policies;
CREATE TRIGGER trg_refresh_parsed_sections
  BEFORE INSERT OR UPDATE ON public.company_policies
  FOR EACH ROW EXECUTE FUNCTION public.refresh_parsed_sections();

DROP TRIGGER IF EXISTS trg_refresh_parsed_sections ON public.company_sops;
CREATE TRIGGER trg_refresh_parsed_sections
  BEFORE INSERT OR UPDATE ON public.company_sops
  FOR EACH ROW EXECUTE FUNCTION public.refresh_parsed_sections();

DROP TRIGGER IF EXISTS trg_refresh_parsed_sections ON public.company_safety;
CREATE TRIGGER trg_refresh_parsed_sections
  BEFORE INSERT OR UPDATE ON public.company_safety
  FOR EACH ROW EXECUTE FUNCTION public.refresh_parsed_sections();

DROP TRIGGER IF EXISTS trg_refresh_parsed_sections ON public.company_training
  ;
CREATE TRIGGER trg_refresh_parsed_sections
  BEFORE INSERT OR UPDATE ON public.company_training
  FOR EACH ROW EXECUTE FUNCTION public.refresh_parsed_sections();

DROP TRIGGER IF EXISTS trg_refresh_parsed_sections ON public.company_disciplinary;
CREATE TRIGGER trg_refresh_parsed_sections
  BEFORE INSERT OR UPDATE ON public.company_disciplinary
  FOR EACH ROW EXECUTE FUNCTION public.refresh_parsed_sections();

-- 5. Backfill function: re-parses every existing row in all 5 tables.
CREATE OR REPLACE FUNCTION public.backfill_parsed_sections()
RETURNS TABLE(table_name text, rows_updated bigint)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  n bigint;
BEGIN
  UPDATE public.company_policies
    SET parsed_sections = public.parse_document_sections(content);
  GET DIAGNOSTICS n = ROW_COUNT;
  table_name := 'company_policies'; rows_updated := n; RETURN NEXT;

  UPDATE public.company_sops
    SET parsed_sections = public.parse_document_sections(content);
  GET DIAGNOSTICS n = ROW_COUNT;
  table_name := 'company_sops'; rows_updated := n; RETURN NEXT;

  UPDATE public.company_safety
    SET parsed_sections = public.parse_document_sections(content);
  GET DIAGNOSTICS n = ROW_COUNT;
  table_name := 'company_safety'; rows_updated := n; RETURN NEXT;

  UPDATE public.company_training
    SET parsed_sections = public.parse_document_sections(content);
  GET DIAGNOSTICS n = ROW_COUNT;
  table_name := 'company_training'; rows_updated := n; RETURN NEXT;

  UPDATE public.company_disciplinary
    SET parsed_sections = public.parse_document_sections(content);
  GET DIAGNOSTICS n = ROW_COUNT;
  table_name := 'company_disciplinary'; rows_updated := n; RETURN NEXT;
END;
$$;

-- 6. Run the backfill once now
SELECT * FROM public.backfill_parsed_sections();
