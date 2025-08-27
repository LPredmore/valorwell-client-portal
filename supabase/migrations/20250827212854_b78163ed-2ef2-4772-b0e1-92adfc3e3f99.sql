
-- Complete User Deletion Script
-- This will remove all traces of the specified test users from the database

-- Step 1: Get the user IDs for the emails we want to delete
WITH users_to_delete AS (
  SELECT id, email FROM auth.users 
  WHERE email IN (
    'predmoreluke+bob@gmail.com',
    'predmoreluke+zzz@gmail.com', 
    'info+boucher@valorwell.org',
    'predmoreluke@gmail.com',
    'predmoreluke+zzzz@gmail.com',
    'predmoreluke+testi@gmail.com',
    'predmoreluke+pop@gmail.com',
    'test@gmail.com',
    'predmore+bobby@gmail.com',
    'predmoreluke+bobby@gmail.com',
    'predmoreluke+phil@gmail.com',
    'predmoreluke+fake@gmail.com',
    'info+deeds@gmail.com',
    'predmoreluke+test1@gmail.com'
  )
)

-- Step 2: Delete from client_history child tables first (to respect foreign key constraints)
, deleted_history_families AS (
  DELETE FROM client_history_family 
  WHERE history_id IN (
    SELECT ch.id FROM client_history ch 
    WHERE ch.client_id IN (SELECT id FROM users_to_delete)
  )
  RETURNING history_id
)

, deleted_history_household AS (
  DELETE FROM client_history_household 
  WHERE history_id IN (
    SELECT ch.id FROM client_history ch 
    WHERE ch.client_id IN (SELECT id FROM users_to_delete)
  )
  RETURNING history_id
)

, deleted_history_medications AS (
  DELETE FROM client_history_medications 
  WHERE history_id IN (
    SELECT ch.id FROM client_history ch 
    WHERE ch.client_id IN (SELECT id FROM users_to_delete)
  )
  RETURNING history_id
)

, deleted_history_treatments AS (
  DELETE FROM client_history_treatments 
  WHERE history_id IN (
    SELECT ch.id FROM client_history ch 
    WHERE ch.client_id IN (SELECT id FROM users_to_delete)
  )
  RETURNING history_id
)

, deleted_history_spouses AS (
  DELETE FROM client_history_spouses 
  WHERE history_id IN (
    SELECT ch.id FROM client_history ch 
    WHERE ch.client_id IN (SELECT id FROM users_to_delete)
  )
  RETURNING history_id
)

, deleted_history_current_spouse AS (
  DELETE FROM client_history_current_spouse 
  WHERE history_id IN (
    SELECT ch.id FROM client_history ch 
    WHERE ch.client_id IN (SELECT id FROM users_to_delete)
  )
  RETURNING history_id
)

-- Step 3: Delete from document_assignments
, deleted_document_assignments AS (
  DELETE FROM document_assignments 
  WHERE client_id IN (SELECT id FROM users_to_delete)
  RETURNING id, client_id
)

-- Step 4: Delete from clinical_documents (and capture file paths for storage cleanup)
, deleted_clinical_documents AS (
  DELETE FROM clinical_documents 
  WHERE client_id IN (SELECT id FROM users_to_delete)
  RETURNING id, client_id, file_path
)

-- Step 5: Delete from client_history main table
, deleted_client_history AS (
  DELETE FROM client_history 
  WHERE client_id IN (SELECT id FROM users_to_delete)
  RETURNING id, client_id
)

-- Step 6: Delete from appointments
, deleted_appointments AS (
  DELETE FROM appointments 
  WHERE client_id IN (SELECT id FROM users_to_delete)
  RETURNING id, client_id
)

-- Step 7: Delete from clients table
, deleted_clients AS (
  DELETE FROM clients 
  WHERE id IN (SELECT id FROM users_to_delete)
  RETURNING id, client_email
)

-- Step 8: Delete from auth.users (using admin function)
, deleted_auth_users AS (
  SELECT id, email FROM users_to_delete
)

-- Final summary query
SELECT 
  'Deletion Summary' as operation,
  COUNT(DISTINCT dc.id) as deleted_clients,
  COUNT(DISTINCT da.id) as deleted_appointments,
  COUNT(DISTINCT dch.id) as deleted_client_histories,
  COUNT(DISTINCT dcd.id) as deleted_clinical_documents,
  COUNT(DISTINCT dda.id) as deleted_document_assignments,
  COUNT(DISTINCT dhf.history_id) as deleted_family_records,
  COUNT(DISTINCT dhh.history_id) as deleted_household_records,
  COUNT(DISTINCT dhm.history_id) as deleted_medication_records,
  COUNT(DISTINCT dht.history_id) as deleted_treatment_records,
  COUNT(DISTINCT dhs.history_id) as deleted_spouse_records,
  COUNT(DISTINCT dhcs.history_id) as deleted_current_spouse_records,
  array_agg(DISTINCT dau.email) as auth_users_to_delete_manually
FROM deleted_clients dc
FULL OUTER JOIN deleted_appointments da ON dc.id = da.client_id
FULL OUTER JOIN deleted_client_history dch ON dc.id = dch.client_id  
FULL OUTER JOIN deleted_clinical_documents dcd ON dc.id = dcd.client_id
FULL OUTER JOIN deleted_document_assignments dda ON dc.id = dda.client_id
FULL OUTER JOIN deleted_history_families dhf ON dch.id = dhf.history_id
FULL OUTER JOIN deleted_history_household dhh ON dch.id = dhh.history_id
FULL OUTER JOIN deleted_history_medications dhm ON dch.id = dhm.history_id
FULL OUTER JOIN deleted_history_treatments dht ON dch.id = dht.history_id
FULL OUTER JOIN deleted_history_spouses dhs ON dch.id = dhs.history_id
FULL OUTER JOIN deleted_history_current_spouse dhcs ON dch.id = dhcs.history_id
FULL OUTER JOIN deleted_auth_users dau ON dc.id = dau.id;

-- Note: Auth users need to be deleted separately using the delete-user edge function
-- because we cannot directly delete from auth.users in SQL
