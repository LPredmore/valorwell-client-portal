
-- First, drop the existing trigger and function
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user();

-- Create the new handle_new_user function with proper logging
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = ''
AS $$
DECLARE
  v_role text;
  v_first_name text;
  v_last_name text;
  v_phone text;
  v_state text;
  v_temp_password text;
  v_preferred_name text;
  v_client_status text;
BEGIN
  -- Extract the role from user metadata with fallback to 'client' if missing
  v_role := COALESCE(NEW.raw_user_meta_data->>'role', 'client');
  
  -- Extract other common fields with null handling
  v_first_name := NEW.raw_user_meta_data->>'first_name';
  v_last_name := NEW.raw_user_meta_data->>'last_name';
  v_preferred_name := NEW.raw_user_meta_data->>'preferred_name';
  v_phone := NEW.raw_user_meta_data->>'phone';
  v_state := NEW.raw_user_meta_data->>'state';
  v_temp_password := NEW.raw_user_meta_data->>'temp_password';
  v_client_status := COALESCE(NEW.raw_user_meta_data->>'client_status', 'New'); -- Default to 'New' if not specified
  
  -- If role is missing or invalid, set it to 'client' and update user metadata
  IF v_role IS NULL OR v_role NOT IN ('admin', 'clinician', 'client') THEN
    -- Log the issue
    INSERT INTO public.migration_logs (
      migration_name,
      description,
      details
    ) VALUES (
      'handle_new_user_trigger',
      'User created with missing or invalid role, defaulting to client',
      jsonb_build_object(
        'user_id', NEW.id,
        'email', NEW.email,
        'provided_role', v_role,
        'assigned_role', 'client',
        'raw_metadata', NEW.raw_user_meta_data
      )
    );
    
    -- Set default role to client
    v_role := 'client';
    
    -- Update user metadata to include the role
    UPDATE auth.users
    SET raw_user_meta_data =
      CASE
        WHEN raw_user_meta_data IS NULL THEN jsonb_build_object('role', 'client')
        ELSE raw_user_meta_data || jsonb_build_object('role', 'client')
      END
    WHERE id = NEW.id;
  END IF;
  
  -- Handle role-specific logic
  IF v_role = 'admin' THEN
    -- For admin role, insert into admins table
    INSERT INTO public.admins (
      id,
      admin_email,
      admin_first_name,
      admin_last_name,
      admin_phone
    )
    VALUES (
      NEW.id,
      NEW.email,
      NEW.raw_user_meta_data->>'first_name',
      NEW.raw_user_meta_data->>'last_name',
      NEW.raw_user_meta_data->>'phone'
    );
    
    -- Log successful admin creation
    INSERT INTO public.migration_logs (
      migration_name, 
      description, 
      details
    ) VALUES (
      'handle_new_user_trigger',
      'Admin user created successfully',
      jsonb_build_object(
        'user_id', NEW.id,
        'email', NEW.email
      )
    );
    
  ELSIF v_role = 'clinician' THEN
    -- For clinician role, insert into clinicians table
    INSERT INTO public.clinicians (
      id,
      clinician_email,
      clinician_first_name,
      clinician_last_name,
      clinician_phone,
      clinician_status
    )
    VALUES (
      NEW.id,
      NEW.email,
      NEW.raw_user_meta_data->>'first_name',
      NEW.raw_user_meta_data->>'last_name',
      NEW.raw_user_meta_data->>'phone',
      'New'
    );
    
    -- Log successful clinician creation
    INSERT INTO public.migration_logs (
      migration_name, 
      description, 
      details
    ) VALUES (
      'handle_new_user_trigger',
      'Clinician user created successfully',
      jsonb_build_object(
        'user_id', NEW.id,
        'email', NEW.email
      )
    );
    
  ELSIF v_role = 'client' THEN
    -- For client role, insert into clients table with error handling
    BEGIN
      INSERT INTO public.clients (
        id,
        client_email,
        client_first_name,
        client_last_name,
        client_preferred_name,
        client_phone,
        role,
        client_state,
        client_status,
        client_temppassword
      )
      VALUES (
        NEW.id,
        NEW.email,
        v_first_name,
        v_last_name,
        v_preferred_name,
        v_phone,
        'client'::app_role,
        'client'::public.app_role,
        v_state,
        v_client_status, -- Use the client_status variable
        v_temp_password
      );
    EXCEPTION WHEN OTHERS THEN
      -- Log the error but don't fail the trigger
      INSERT INTO public.migration_logs (
        migration_name,
        description,
        details
      ) VALUES (
        'handle_new_user_trigger',
        'Error inserting client record',
        jsonb_build_object(
          'user_id', NEW.id,
          'email', NEW.email,
          'error', SQLERRM
        )
      );
    END;
    
    -- Log successful client creation
    INSERT INTO public.migration_logs (
      migration_name, 
      description, 
