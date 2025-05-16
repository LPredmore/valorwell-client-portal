-- Migration to fix the "column clinicians.clinician_title does not exist" error
-- This migration ensures the clinicians table has the correct clinician_type column
-- and removes any references to the non-existent clinician_title column

-- First, let's check if clinician_type exists and create it if it doesn't
DO $$
BEGIN
    -- Check if clinician_type column exists
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'public'
        AND table_name = 'clinicians'
        AND column_name = 'clinician_type'
    ) THEN
        -- Add the clinician_type column if it doesn't exist
        ALTER TABLE public.clinicians ADD COLUMN clinician_type TEXT;
        
        -- Log the change
        INSERT INTO public.migration_logs (migration_name, description, status)
        VALUES ('20250515_fix_clinician_column_references', 'Added missing clinician_type column', 'SUCCESS');
    END IF;
END
$$;

-- Check for any views that might reference clinician_title and fix them
DO $$
DECLARE
    view_record RECORD;
    view_definition TEXT;
    updated_definition TEXT;
BEGIN
    FOR view_record IN 
        SELECT viewname 
        FROM pg_views 
        WHERE schemaname = 'public'
    LOOP
        -- Get the view definition
        SELECT pg_get_viewdef(view_record.viewname::regclass, true) INTO view_definition;
        
        -- Check if the view references clinician_title
        IF view_definition LIKE '%clinician_title%' THEN
            -- Replace clinician_title with clinician_type
            updated_definition := REPLACE(view_definition, 'clinician_title', 'clinician_type');
            
            -- Execute the updated view definition
            EXECUTE 'CREATE OR REPLACE VIEW ' || view_record.viewname || ' AS ' || updated_definition;
            
            -- Log the change
            INSERT INTO public.migration_logs (migration_name, description, status)
            VALUES ('20250515_fix_clinician_column_references', 'Updated view ' || view_record.viewname || ' to use clinician_type instead of clinician_title', 'SUCCESS');
        END IF;
    END LOOP;
END
$$;

-- Check for any RLS policies that might reference clinician_title and fix them
DO $$
DECLARE
    policy_record RECORD;
    policy_definition TEXT;
    updated_definition TEXT;
    table_name TEXT;
    policy_name TEXT;
BEGIN
    FOR policy_record IN 
        SELECT tablename, policyname, definition 
        FROM pg_policies 
        WHERE schemaname = 'public'
    LOOP
        -- Check if the policy references clinician_title
        IF policy_record.definition LIKE '%clinician_title%' THEN
            -- Replace clinician_title with clinician_type in the policy definition
            updated_definition := REPLACE(policy_record.definition, 'clinician_title', 'clinician_type');
            table_name := policy_record.tablename;
            policy_name := policy_record.policyname;
            
            -- Drop the existing policy
            EXECUTE 'DROP POLICY IF EXISTS ' || policy_name || ' ON ' || table_name;
            
            -- Create the updated policy
            -- Note: This is a simplified approach and might need adjustment based on the actual policy structure
            EXECUTE 'CREATE POLICY ' || policy_name || ' ON ' || table_name || ' USING (' || updated_definition || ')';
            
            -- Log the change
            INSERT INTO public.migration_logs (migration_name, description, status)
            VALUES ('20250515_fix_clinician_column_references', 'Updated RLS policy ' || policy_name || ' on table ' || table_name || ' to use clinician_type instead of clinician_title', 'SUCCESS');
        END IF;
    END LOOP;
END
$$;

-- Create a function to check for and fix any references to clinician_title in functions
CREATE OR REPLACE FUNCTION public.fix_clinician_title_references()
RETURNS TEXT AS $$
DECLARE
    func_record RECORD;
    func_definition TEXT;
    updated_definition TEXT;
    fixed_count INTEGER := 0;
BEGIN
    FOR func_record IN 
        SELECT proname, prosrc 
        FROM pg_proc 
        WHERE pronamespace = 'public'::regnamespace
        AND prosrc LIKE '%clinician_title%'
    LOOP
        -- Replace clinician_title with clinician_type in the function definition
        updated_definition := REPLACE(func_record.prosrc, 'clinician_title', 'clinician_type');
        
        -- Create or replace the function with the updated definition
        -- Note: This is a simplified approach and might need adjustment based on the actual function structure
        EXECUTE 'CREATE OR REPLACE FUNCTION public.' || func_record.proname || ' AS $func$ ' || updated_definition || ' $func$ LANGUAGE plpgsql';
        
        fixed_count := fixed_count + 1;
        
        -- Log the change
        INSERT INTO public.migration_logs (migration_name, description, status)
        VALUES ('20250515_fix_clinician_column_references', 'Updated function ' || func_record.proname || ' to use clinician_type instead of clinician_title', 'SUCCESS');
    END LOOP;
    
    RETURN 'Fixed ' || fixed_count || ' functions with clinician_title references';
END;
$$ LANGUAGE plpgsql;

-- Execute the function to fix references
SELECT public.fix_clinician_title_references();

-- Drop the temporary function
DROP FUNCTION IF EXISTS public.fix_clinician_title_references();

-- Create a fallback view that maps clinician_title to clinician_type
-- This provides backward compatibility for any code that might still reference clinician_title
CREATE OR REPLACE VIEW public.clinicians_compatibility_view AS
SELECT 
    c.*,
    c.clinician_type AS clinician_title  -- Map clinician_type to clinician_title for backward compatibility
FROM 
    public.clinicians c;

-- Log the creation of the compatibility view
INSERT INTO public.migration_logs (migration_name, description, status)
VALUES ('20250515_fix_clinician_column_references', 'Created clinicians_compatibility_view for backward compatibility', 'SUCCESS');

-- Add a comment to the clinicians table to document the correct column name
COMMENT ON COLUMN public.clinicians.clinician_type IS 'The type/title of the clinician. This is the correct column name to use, not clinician_title.';

-- Final log entry
INSERT INTO public.migration_logs (migration_name, description, status)
VALUES ('20250515_fix_clinician_column_references', 'Completed migration to fix clinician_title references', 'SUCCESS');