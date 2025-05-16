
# Clinician Query Debugger

This utility was created to help identify where the "clinician_title" reference is coming from in the TherapistSelection page.

## Background

The issue we're investigating is that queries to the `clinicians` table are failing with an error about a non-existent column called "clinician_title". However, the correct column name in the database is "clinician_type".

Based on our investigation:
- The TherapistSelection.tsx file correctly uses "clinician_type" in its query
- There are no direct references to "clinician_title" in the codebase except for a comment
- The Supabase client configuration doesn't have any query transformations
- The database schema confirms that "clinician_type" is the correct column name

## Latest Findings (2025-05-16)

After examining the complete database schema, we've confirmed:
- The column `clinician_type` exists (text data type)
- There is no `clinician_title` column in the clinicians table
- The `clinician_status` column is a USER-DEFINED enum type (clinician_status_enum)
- The compatibility view we created should handle any references to the non-existent column

The issue persists despite these findings, suggesting:
1. The migration script might not have been fully applied
2. There could be cached query plans in the database
3. There might be database objects (views, functions, triggers) still using the old column name
4. The Supabase client might be caching or transforming the query

## How the Debugging Utility Works

The `ClinicianQueryDebugger` class provides the following functionality:

1. **Query Interception**: Wraps Supabase queries to log the exact query being sent to the database
2. **Parameter Analysis**: Examines query parameters to detect any references to "clinician_title"
3. **Error Analysis**: Provides enhanced error reporting to identify where "clinician_title" references might be coming from
4. **Stack Trace Capture**: Records the call stack to help identify where queries are being initiated

## How to Use

The utility has been integrated into the TherapistSelection.tsx file. When the page loads and attempts to fetch therapists, the debugging utility will:

1. Log the exact query being sent to the database
2. Check for any references to "clinician_title" in the query parameters
3. Provide detailed error information if the query fails
4. Highlight any "clinician_title" references in error messages

## Possible Causes of the Issue

The most likely causes for the "clinician_title" reference are:

1. **Schema Mismatch**: The database schema might have changed, but some code or configuration still references the old column name
2. **Hidden Database Objects**: There might be views, functions, or triggers in the database that reference "clinician_title"
3. **Runtime Query Modification**: Something might be modifying the query at runtime, such as:
   - Middleware in the Supabase client
   - A plugin or extension
   - A type definition that's being used to generate the query

4. **PostgreSQL RLS Policies**: Row-level security policies might reference the non-existent column
5. **Database Migrations**: A failed or incomplete migration might have left references to the old column name
6. **Query Caching**: The database or client might be caching the query plan with the old column reference

## Next Steps

After running the application with this debugging utility:

1. Check the console logs for any references to "clinician_title"
2. If an error occurs, examine the detailed error information provided by the utility
3. Look for any middleware or transformations that might be modifying the query
4. Consider examining the database directly for views, functions, or triggers that might reference "clinician_title"
5. Check for any type definitions or generated code that might be using the wrong column name
6. Implement the enhanced error handling and fallback strategies in this update

## Additional Debugging Tips

If the utility doesn't immediately identify the source of the issue:

1. **Database Inspection**: Use a database client to directly inspect the schema, views, functions, and triggers
2. **Network Monitoring**: Use browser developer tools to monitor the network requests being made to the Supabase API
3. **Supabase Logs**: Check the Supabase logs for any errors or warnings related to the query
4. **Temporary Column Addition**: As a temporary workaround, consider adding a "clinician_title" column to the database that mirrors "clinician_type" to identify if the issue is with the query or something else
5. **Client Side Cache Busting**: Implement measures to refresh the Supabase client and clear any cached schema information
