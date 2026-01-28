-- Add video_url column to sops table
ALTER TABLE public.sops ADD COLUMN video_url text;

-- Add comment for documentation
COMMENT ON COLUMN public.sops.video_url IS 'Optional YouTube or Vimeo URL for embedded video content';