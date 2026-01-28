-- Fix handle_new_user to create org and set user as admin on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  new_org_id uuid;
  company_name_value text;
BEGIN
  -- Get company name from metadata
  company_name_value := NEW.raw_user_meta_data ->> 'company_name';
  
  -- Create profile
  INSERT INTO public.profiles (user_id, full_name, email, preferred_language, company_name, country)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data ->> 'full_name', ''),
    NEW.email,
    COALESCE(NEW.raw_user_meta_data ->> 'preferred_language', 'en'),
    company_name_value,
    NEW.raw_user_meta_data ->> 'country'
  );
  
  -- Create points_balance for new user
  INSERT INTO public.points_balance (user_id, total_points, redeemed_points)
  VALUES (NEW.id, 0, 0)
  ON CONFLICT (user_id) DO NOTHING;
  
  -- If company name provided, create organization and make user admin
  IF company_name_value IS NOT NULL AND company_name_value != '' THEN
    -- Create the organization
    INSERT INTO public.orgs (name)
    VALUES (company_name_value)
    RETURNING id INTO new_org_id;
    
    -- Add user as org admin
    INSERT INTO public.org_users (org_id, user_id, role, is_active)
    VALUES (new_org_id, NEW.id, 'admin', true);
    
    -- Grant admin role in user_roles table
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'admin')
    ON CONFLICT (user_id, role) DO NOTHING;
  ELSE
    -- No company name, just create employee role
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'employee')
    ON CONFLICT (user_id, role) DO NOTHING;
  END IF;
  
  RETURN NEW;
END;
$function$;