-- Create table for tracking individual SOP quiz completions
CREATE TABLE public.sop_quiz_progress (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  sop_key TEXT NOT NULL,
  completed BOOLEAN NOT NULL DEFAULT false,
  completed_at TIMESTAMP WITH TIME ZONE,
  points_earned INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, sop_key)
);

-- Enable RLS
ALTER TABLE public.sop_quiz_progress ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view their own SOP progress"
ON public.sop_quiz_progress
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own SOP progress"
ON public.sop_quiz_progress
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own SOP progress"
ON public.sop_quiz_progress
FOR UPDATE
USING (auth.uid() = user_id);

-- Create trigger for updated_at
CREATE TRIGGER update_sop_quiz_progress_updated_at
BEFORE UPDATE ON public.sop_quiz_progress
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create index for faster lookups
CREATE INDEX idx_sop_quiz_progress_user_id ON public.sop_quiz_progress(user_id);