
-- Clean up existing client timezone data to use proper IANA identifiers
UPDATE clients 
SET client_time_zone = CASE 
  WHEN client_time_zone ILIKE '%eastern%' OR client_time_zone ILIKE '%est%' THEN 'America/New_York'
  WHEN client_time_zone ILIKE '%central%' OR client_time_zone ILIKE '%cst%' THEN 'America/Chicago'
  WHEN client_time_zone ILIKE '%mountain%' OR client_time_zone ILIKE '%mst%' THEN 'America/Denver'
  WHEN client_time_zone ILIKE '%pacific%' OR client_time_zone ILIKE '%pst%' THEN 'America/Los_Angeles'
  WHEN client_time_zone ILIKE '%alaska%' OR client_time_zone ILIKE '%akst%' THEN 'America/Anchorage'
  WHEN client_time_zone ILIKE '%hawaii%' OR client_time_zone ILIKE '%hst%' THEN 'Pacific/Honolulu'
  WHEN client_time_zone ILIKE '%atlantic%' OR client_time_zone ILIKE '%ast%' THEN 'America/Puerto_Rico'
  ELSE client_time_zone
END
WHERE client_time_zone IS NOT NULL 
  AND client_time_zone NOT IN (
    'America/New_York', 'America/Chicago', 'America/Denver', 'America/Los_Angeles',
    'America/Anchorage', 'Pacific/Honolulu', 'America/Puerto_Rico', 
    'Europe/London', 'Europe/Paris', 'Europe/Athens', 'Asia/Dubai',
    'Asia/Kolkata', 'Asia/Tokyo', 'Australia/Sydney', 'America/Phoenix'
  );
