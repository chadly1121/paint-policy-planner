-- Create audit_logs table for tracking sensitive actions
CREATE TABLE public.audit_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  action TEXT NOT NULL,
  table_name TEXT,
  record_id UUID,
  old_data JSONB,
  new_data JSONB,
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- Only admins can view audit logs
CREATE POLICY "Admins can view all audit logs"
ON public.audit_logs
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

-- Create index for efficient querying
CREATE INDEX idx_audit_logs_user_id ON public.audit_logs(user_id);
CREATE INDEX idx_audit_logs_action ON public.audit_logs(action);
CREATE INDEX idx_audit_logs_created_at ON public.audit_logs(created_at DESC);

-- Function to log audit events (called from edge functions)
CREATE OR REPLACE FUNCTION public.log_audit_event(
  p_user_id UUID,
  p_action TEXT,
  p_table_name TEXT DEFAULT NULL,
  p_record_id UUID DEFAULT NULL,
  p_old_data JSONB DEFAULT NULL,
  p_new_data JSONB DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_log_id UUID;
BEGIN
  INSERT INTO public.audit_logs (user_id, action, table_name, record_id, old_data, new_data)
  VALUES (p_user_id, p_action, p_table_name, p_record_id, p_old_data, p_new_data)
  RETURNING id INTO v_log_id;
  
  RETURN v_log_id;
END;
$$;

-- Trigger function for quiz_attempts
CREATE OR REPLACE FUNCTION public.audit_quiz_attempt()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM public.log_audit_event(
    NEW.user_id,
    'quiz_submitted',
    'quiz_attempts',
    NEW.id,
    NULL,
    jsonb_build_object('section_key', NEW.section_key, 'score', NEW.score, 'passed', NEW.passed, 'points_earned', NEW.points_earned)
  );
  RETURN NEW;
END;
$$;

-- Trigger for quiz attempts
CREATE TRIGGER audit_quiz_attempts_insert
AFTER INSERT ON public.quiz_attempts
FOR EACH ROW
EXECUTE FUNCTION public.audit_quiz_attempt();

-- Trigger function for redemption requests
CREATE OR REPLACE FUNCTION public.audit_redemption_request()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    PERFORM public.log_audit_event(
      NEW.user_id,
      'redemption_requested',
      'redemption_requests',
      NEW.id,
      NULL,
      jsonb_build_object('points_requested', NEW.points_requested, 'status', NEW.status)
    );
  ELSIF TG_OP = 'UPDATE' AND OLD.status != NEW.status THEN
    PERFORM public.log_audit_event(
      COALESCE(NEW.processed_by, NEW.user_id),
      'redemption_' || NEW.status,
      'redemption_requests',
      NEW.id,
      jsonb_build_object('status', OLD.status),
      jsonb_build_object('status', NEW.status, 'admin_notes', NEW.admin_notes, 'processed_by', NEW.processed_by)
    );
  END IF;
  RETURN NEW;
END;
$$;

-- Triggers for redemption requests
CREATE TRIGGER audit_redemption_requests_insert
AFTER INSERT ON public.redemption_requests
FOR EACH ROW
EXECUTE FUNCTION public.audit_redemption_request();

CREATE TRIGGER audit_redemption_requests_update
AFTER UPDATE ON public.redemption_requests
FOR EACH ROW
EXECUTE FUNCTION public.audit_redemption_request();

-- Trigger function for section completion
CREATE OR REPLACE FUNCTION public.audit_section_completion()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'UPDATE' AND NEW.completed = true AND (OLD.completed = false OR OLD.completed IS NULL) THEN
    PERFORM public.log_audit_event(
      NEW.user_id,
      'section_completed',
      'section_progress',
      NEW.id,
      NULL,
      jsonb_build_object('section_key', NEW.section_key)
    );
  END IF;
  RETURN NEW;
END;
$$;

-- Trigger for section completion
CREATE TRIGGER audit_section_completion
AFTER UPDATE ON public.section_progress
FOR EACH ROW
EXECUTE FUNCTION public.audit_section_completion();