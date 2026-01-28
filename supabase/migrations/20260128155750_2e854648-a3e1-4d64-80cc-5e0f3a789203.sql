-- Add unique constraint on section_item_progress for upsert to work correctly
ALTER TABLE public.section_item_progress 
ADD CONSTRAINT section_item_progress_user_section_item_unique 
UNIQUE (user_id, section_key, item_key);