-- Fix debug_client_therapist_matching function return type
-- Update to handle UUID therapist_id properly
DROP FUNCTION IF EXISTS public.debug_client_therapist_matching(text);

CREATE OR REPLACE FUNCTION public.debug_client_therapist_matching(p_therapist_id uuid DEFAULT NULL)
RETURNS TABLE(
  client_id uuid, 
  client_name text, 
  therapist_id uuid, 
  therapist_id_type text,
  assignment_status text
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
BEGIN
  RETURN QUERY
  SELECT 
    c.id AS client_id,
    CONCAT(COALESCE(c.client_first_name, ''), ' ', COALESCE(c.client_last_name, '')) AS client_name,
    c.client_assigned_therapist AS therapist_id,
    pg_typeof(c.client_assigned_therapist)::text AS therapist_id_type,
    CASE 
      WHEN c.client_assigned_therapist IS NULL THEN 'UNASSIGNED'
      WHEN EXISTS (SELECT 1 FROM clinicians WHERE id = c.client_assigned_therapist) THEN 'VALID_UUID'
      ELSE 'INVALID_ASSIGNMENT'
    END AS assignment_status
  FROM 
    clients c
  WHERE 
    -- If specific therapist provided, filter by that therapist
    (p_therapist_id IS NULL OR c.client_assigned_therapist = p_therapist_id)
    -- Show all assignments if no filter provided
  ORDER BY 
    client_name;
END;
$function$;

-- Add comment for documentation
COMMENT ON FUNCTION public.debug_client_therapist_matching IS 'Debug utility to audit client-therapist assignments. Shows assignment status and validates UUIDs. Call with specific therapist UUID or NULL to see all assignments.';