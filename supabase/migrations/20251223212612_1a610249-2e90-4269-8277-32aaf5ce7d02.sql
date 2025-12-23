-- Create a generic table for item-level quiz progress across all sections
-- This replaces the need for separate tables per section
CREATE TABLE public.section_item_progress (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  section_key TEXT NOT NULL,
  item_key TEXT NOT NULL,
  completed BOOLEAN NOT NULL DEFAULT false,
  completed_at TIMESTAMP WITH TIME ZONE,
  points_earned INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  CONSTRAINT unique_user_section_item UNIQUE (user_id, section_key, item_key)
);

-- Enable RLS
ALTER TABLE public.section_item_progress ENABLE ROW LEVEL SECURITY;

-- Create policies for user access
CREATE POLICY "Users can view their own item progress"
ON public.section_item_progress
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own item progress"
ON public.section_item_progress
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own item progress"
ON public.section_item_progress
FOR UPDATE
USING (auth.uid() = user_id);

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_section_item_progress_updated_at
BEFORE UPDATE ON public.section_item_progress
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();