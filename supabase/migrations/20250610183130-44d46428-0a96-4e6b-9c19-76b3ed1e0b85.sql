
-- Audit and correct user data inconsistencies

-- 1. Identify users missing from role-specific tables but exist in auth.users
WITH user_audit AS (
  SELECT 
    u.id,
    u.email,
    u.raw_user_meta_data->>'role' as meta_role,
    CASE 
      WHEN a.id IS NOT NULL THEN 'admin'
      WHEN cl.id IS NOT NULL THEN 'clinician'
      WHEN c.id IS NOT NULL THEN 'client'
      ELSE 'missing'
    END AS role_table_status
  FROM auth.users u
  LEFT JOIN public.admins a ON u.id = a.id
  LEFT JOIN public.clinicians cl ON u.id = cl.id
  LEFT JOIN public.clients c ON u.id = c.id
)
SELECT * INTO TEMP TABLE users_to_fix 
FROM user_audit
WHERE role_table_status = 'missing' 
   OR (meta_role IS NOT NULL AND meta_role != role_table_status)
   OR meta_role IS NULL;

-- Log the audit results
INSERT INTO public.migration_logs (migration_name, description, details)
VALUES (
  '20250508_audit_correct_user_data',
  'User data audit completed',
  jsonb_build_object(
    'users_missing_from_role_tables', (SELECT COUNT(*) FROM users_to_fix WHERE role_table_status = 'missing'),
    'users_with_mismatched_roles', (SELECT COUNT(*) FROM users_to_fix WHERE meta_role IS NOT NULL AND meta_role != role_table_status),
    'users_with_missing_meta_role', (SELECT COUNT(*) FROM users_to_fix WHERE meta_role IS NULL)
  )
);

-- 2. Fix metadata for users who exist in role tables but have incorrect metadata
-- Update admins
UPDATE auth.users u
SET raw_user_meta_data = 
  CASE 
    WHEN raw_user_meta_data IS NULL THEN jsonb_build_object('role', 'admin')
    ELSE raw_user_meta_data || jsonb_build_object('role', 'admin')
  END
FROM public.admins a
WHERE u.id = a.id 
  AND (u.raw_user_meta_data->>'role' IS NULL OR u.raw_user_meta_data->>'role' != 'admin')
  AND NOT EXISTS (SELECT 1 FROM public.clinicians c WHERE c.id = u.id)
  AND NOT EXISTS (SELECT 1 FROM public.clients cl WHERE cl.id = u.id);

-- Update clinicians
UPDATE auth.users u
SET raw_user_meta_data = 
  CASE 
    WHEN raw_user_meta_data IS NULL THEN jsonb_build_object('role', 'clinician')
    ELSE raw_user_meta_data || jsonb_build_object('role', 'clinician')
  END
FROM public.clinicians c
WHERE u.id = c.id 
  AND (u.raw_user_meta_data->>'role' IS NULL OR u.raw_user_meta_data->>'role' != 'clinician')
  AND NOT EXISTS (SELECT 1 FROM public.admins a WHERE a.id = u.id)
  AND NOT EXISTS (SELECT 1 FROM public.clients cl WHERE cl.id = u.id);

-- Update clients
UPDATE auth.users u
SET raw_user_meta_data = 
  CASE 
    WHEN raw_user_meta_data IS NULL THEN jsonb_build_object('role', 'client')
    ELSE raw_user_meta_data || jsonb_build_object('role', 'client')
  END
FROM public.clients cl
WHERE u.id = cl.id 
  AND (u.raw_user_meta_data->>'role' IS NULL OR u.raw_user_meta_data->>'role' != 'client')
  AND NOT EXISTS (SELECT 1 FROM public.admins a WHERE a.id = u.id)
  AND NOT EXISTS (SELECT 1 FROM public.clinicians c WHERE c.id = u.id);

-- 3. Fix users who exist in auth.users but not in any role table
-- We'll add them to the appropriate table based on their metadata role
-- First, let's handle users with valid metadata roles but missing from role tables
DO $$
DECLARE
  user_rec RECORD;
BEGIN
  -- For users with 'admin' role in metadata but missing from admins table
  FOR user_rec IN 
    SELECT u.id, u.email, u.raw_user_meta_data->>'first_name' as first_name, u.raw_user_meta_data->>'last_name' as last_name, u.raw_user_meta_data->>'phone' as phone
    FROM auth.users u
    WHERE u.raw_user_meta_data->>'role' = 'admin'
    AND NOT EXISTS (SELECT 1 FROM public.admins a WHERE a.id = u.id)
  LOOP
    INSERT INTO public.admins (
      id, 
      admin_email, 
      admin_first_name, 
      admin_last_name, 
      admin_phone, 
      admin_status
    )
    VALUES (
      user_rec.id,
      user_rec.email,
      user_rec.first_name,
      user_rec.last_name,
      user_rec.phone,
      'Active'
    );
  END LOOP;

  -- For users with 'clinician' role in metadata but missing from clinicians table
  FOR user_rec IN 
    SELECT u.id, u.email, u.raw_user_meta_data->>'first_name' as first_name, u.raw_user_meta_data->>'last_name' as last_name, u.raw_user_meta_data->>'phone' as phone
    FROM auth.users u
    WHERE u.raw_user_meta_data->>'role' = 'clinician'
    AND NOT EXISTS (SELECT 1 FROM public.clinicians c WHERE c.id = u.id)
  LOOP
    INSERT INTO public.clinicians (
      id, 
      clinician_email, 
      clinician_first_name, 
      clinician_last_name, 
      clinician_phone, 
      clinician_status
    )
    VALUES (
      user_rec.id,
      user_rec.email,
      user_rec.first_name,
      user_rec.last_name,
      user_rec.phone,
      'New'
    );
  END LOOP;

  -- For users with 'client' role in metadata but missing from clients table
  FOR user_rec IN
    SELECT u.id, u.email, u.raw_user_meta_data->>'first_name' as first_name, u.raw_user_meta_data->>'last_name' as last_name, u.raw_user_meta_data->>'phone' as phone, u.raw_user_meta_data->>'state' as state, u.raw_user_meta_data->>'temp_password' as temp_password
    FROM auth.users u
    WHERE u.raw_user_meta_data->>'role' = 'client'
    AND NOT EXISTS (SELECT 1 FROM public.clients cl WHERE cl.id = u.id)
  LOOP
    -- First check if app_role enum type exists and has 'client' value
    BEGIN
      INSERT INTO public.clients (
        id,
        client_email,
        client_first_name,
        client_last_name,
        client_phone,
        role,
        client_state,
        client_status,
        client_temppassword
      )
      VALUES (
        user_rec.id,
        user_rec.email,
        user_rec.first_name,
        user_rec.last_name,
        user_rec.phone,
        'client'::app_role,
        user_rec.state,
        'New',
        user_rec.temp_password
      );
    EXCEPTION WHEN OTHERS THEN
      -- Log the error
      INSERT INTO public.migration_logs (migration_name, description, details)
      VALUES (
        '20250508_audit_correct_user_data',
        'Error inserting client record',
        jsonb_build_object(
          'user_id', user_rec.id,
          'email', user_rec.email,
          'error', SQLERRM
        )
      );
    END;
  END LOOP;
  
  -- For users without a valid role, log them but don't insert
  -- Users without roles are logged to migration_logs for manual review
  FOR user_rec IN
    SELECT u.id, u.email, u.raw_user_meta_data
    FROM auth.users u
    WHERE (u.raw_user_meta_data->>'role' IS NULL OR u.raw_user_meta_data->>'role' NOT IN ('admin', 'clinician', 'client'))
    AND NOT EXISTS (SELECT 1 FROM public.admins a WHERE a.id = u.id)
    AND NOT EXISTS (SELECT 1 FROM public.clinicians c WHERE c.id = u.id)
    AND NOT EXISTS (SELECT 1 FROM public.clients cl WHERE cl.id = u.id)
  LOOP
    -- Log users without valid roles
    INSERT INTO public.migration_logs (migration_name, description, details)
    VALUES (
      '20250508_audit_correct_user_data',
      'User found without valid role and not in any role table',
      jsonb_build_object(
        'user_id', user_rec.id,
        'email', user_rec.email,
        'raw_metadata', user_rec.raw_user_meta_data
      )
    );
    
    -- Default to client role if no valid role is found
    BEGIN
      -- Update user metadata to set a default role
      UPDATE auth.users
      SET raw_user_meta_data =
        CASE
          WHEN raw_user_meta_data IS NULL THEN jsonb_build_object('role', 'client')
          ELSE raw_user_meta_data || jsonb_build_object('role', 'client')
        END
      WHERE id = user_rec.id;
      
      -- Insert into clients table with default values
      INSERT INTO public.clients (
        id,
        client_email,
        client_first_name,
        client_last_name,
        client_phone,
        role,
        client_status
      )
      VALUES (
        user_rec.id,
        user_rec.email,
        user_rec.raw_user_meta_data->>'first_name',
        user_rec.raw_user_meta_data->>'last_name',
        user_rec.raw_user_meta_data->>'phone',
        'client'::app_role,
        'New'
      );
    EXCEPTION WHEN OTHERS THEN
      -- Log the error but continue processing
      INSERT INTO public.migration_logs (migration_name, description, details)
      VALUES (
        '20250508_audit_correct_user_data',
        'Error setting default role for user',
        jsonb_build_object(
          'user_id', user_rec.id,
          'email', user_rec.email,
          'error', SQLERRM
        )
      );
    END;
  END LOOP;
END$$;

-- Log completion of the audit and correction process
INSERT INTO public.migration_logs (migration_name, description, details)
VALUES (
  '20250508_audit_correct_user_data',
  'User data correction completed',
  jsonb_build_object('action', 'correct_user_data')
);
