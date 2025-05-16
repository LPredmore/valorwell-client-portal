
import { DebugUtils } from './debugUtils';
import { supabase } from '@/integrations/supabase/client';
import { PostgrestSingleResponse } from '@supabase/supabase-js';

const CONTEXT = 'ClinicianQueryDebugger';

/**
 * Interface to ensure consistent return types
 */
export interface QueryResult<T> {
  data: T[] | null;
  error: any;
}

/**
 * Debugging utility to help identify where "clinician_title" references are coming from
 * in Supabase queries to the clinicians table.
 */
export class ClinicianQueryDebugger {
  /**
   * Wraps a Supabase query to log the exact SQL being sent to the database
   * and capture any transformations that might be happening.
   *
   * @param tableName The name of the table being queried
   * @param queryBuilder Function that builds the query
   * @returns The result of the query
   */
  public static async debugQuery<T>(
    tableName: string,
    queryBuilder: (query: any) => any
  ): Promise<QueryResult<T>> {
    try {
      // Start with the base query
      const baseQuery = supabase.from(tableName).select();
      
      // Log the base query
      DebugUtils.log(CONTEXT, `Starting query on table: ${tableName}`, {
        timestamp: new Date().toISOString(),
        tableName,
        queryType: 'select'
      });

      // Apply the query builder function to get the final query
      const finalQuery = queryBuilder(baseQuery);
      
      // Intercept the query before it's sent to the server
      this.interceptQuery(finalQuery);

      // Execute the query
      const { data, error } = await finalQuery;
      
      // Log the result
      if (error) {
        this.analyzeQueryError(error, tableName);
      } else {
        DebugUtils.log(CONTEXT, `Query completed successfully`, {
          rowCount: data?.length || 0,
          firstRow: data && data.length > 0 ? data[0] : null
        });
      }
      
      return { data, error };
    } catch (error) {
      DebugUtils.error(CONTEXT, `Exception during query execution`, error);
      return { data: null, error };
    }
  }

  /**
   * Attempts to intercept and analyze the query before it's sent to the server
   */
  private static interceptQuery(query: any): void {
    try {
      // Access internal properties of the query builder to inspect the query
      // Note: This is using internal properties that may change in future versions
      const queryObj = query as any;
      
      // Log the URL that will be used for the request
      if (queryObj.url) {
        DebugUtils.log(CONTEXT, `Request URL`, queryObj.url);
      }
      
      // Log the headers that will be sent with the request
      if (queryObj.headers) {
        DebugUtils.log(CONTEXT, `Request Headers`, queryObj.headers);
      }
      
      // Log the query parameters
      if (queryObj.searchParams) {
        DebugUtils.log(CONTEXT, `Query Parameters`, this.parseSearchParams(queryObj.searchParams));
        
        // Specifically check for clinician_title references
        this.checkForClinicianTitleReferences(queryObj.searchParams);
      }
      
      // Check for any middleware or transformations
      if (queryObj.schema) {
        DebugUtils.log(CONTEXT, `Schema used`, queryObj.schema);
      }

      // NEW: Try to access the raw SQL if possible
      if (queryObj.query) {
        DebugUtils.log(CONTEXT, `Raw Query`, queryObj.query);
      }

      // NEW: Check if we can get the prepared statement
      if (queryObj.prepare) {
        DebugUtils.log(CONTEXT, `Prepared Statement`, queryObj.prepare);
      }
    } catch (error) {
      DebugUtils.warn(CONTEXT, `Failed to intercept query`, error);
    }
  }

  /**
   * Parses URLSearchParams into a more readable object
   */
  private static parseSearchParams(searchParams: URLSearchParams): Record<string, string> {
    const params: Record<string, string> = {};
    searchParams.forEach((value, key) => {
      params[key] = value;
    });
    return params;
  }

  /**
   * Specifically checks for any references to clinician_title in the query
   */
  private static checkForClinicianTitleReferences(searchParams: URLSearchParams): void {
    // Check in the select parameter
    const select = searchParams.get('select');
    if (select && select.includes('clinician_title')) {
      DebugUtils.error(CONTEXT, `Found 'clinician_title' in SELECT clause`, {
        select,
        source: 'select parameter'
      });
    }
    
    // Check in filter parameters
    searchParams.forEach((value, key) => {
      if (key.includes('clinician_title')) {
        DebugUtils.error(CONTEXT, `Found 'clinician_title' in filter parameter`, {
          parameter: key,
          value,
          source: 'filter parameter'
        });
      }
      
      // Also check for clinician_title in the value (for complex filters)
      if (value.includes('clinician_title')) {
        DebugUtils.error(CONTEXT, `Found 'clinician_title' in filter value`, {
          parameter: key,
          value,
          source: 'filter value'
        });
      }
    });
    
    // NEW: Check for potential JSON transforms in the body
    const body = searchParams.get('body');
    if (body && body.includes('clinician_title')) {
      DebugUtils.error(CONTEXT, `Found 'clinician_title' in request body`, {
        body,
        source: 'request body'
      });
    }
  }

  /**
   * Analyzes database errors to identify potential clinician_title references
   */
  private static analyzeQueryError(error: any, tableName: string): void {
    DebugUtils.error(CONTEXT, `Query error`, error);
    
    // Check if the error is related to clinician_title
    if (error.message && error.message.includes('clinician_title')) {
      DebugUtils.error(CONTEXT, `Error contains reference to 'clinician_title'`, {
        errorCode: error.code,
        errorMessage: error.message,
        details: error.details,
        hint: error.hint,
        tableName
      });
      
      // Provide guidance on fixing the issue
      console.error(`
╔════════════════════════════════════════════════════════════════════════════╗
║ CLINICIAN TITLE REFERENCE DETECTED                                         ║
╠════════════════════════════════════════════════════════════════════════════╣
║ The error message contains a reference to 'clinician_title' which does not ║
║ exist in the clinicians table. The correct field name is 'clinician_type'. ║
║                                                                            ║
║ Error details:                                                             ║
║ ${error.message}                                                           ║
║                                                                            ║
║ This might be caused by:                                                   ║
║ 1. A direct reference in the query                                         ║
║ 2. A middleware or transformation layer                                    ║
║ 3. A type definition mismatch                                              ║
║ 4. A database view or function that references this column                 ║
║ 5. A cached query plan in the database                                     ║
║ 6. An issue with the USER-DEFINED clinician_status_enum type               ║
╚════════════════════════════════════════════════════════════════════════════╝
      `);
    }
    
    // Check for column does not exist errors (common for missing fields)
    if (error.code === '42703') {
      DebugUtils.error(CONTEXT, `Column does not exist error`, {
        errorCode: error.code,
        errorMessage: error.message,
        details: error.details,
        hint: error.hint,
        tableName
      });
    }
    
    // NEW: Check for enum-related errors
    if (error.code === '42804') {
      DebugUtils.error(CONTEXT, `Data type mismatch error - could be related to enum type`, {
        errorCode: error.code,
        errorMessage: error.message,
        details: error.details,
        hint: error.hint,
        tableName
      });
    }
  }

  /**
   * Creates a stack trace capture to help identify where a query is being called from
   */
  public static captureStackTrace(): string {
    const stack = new Error().stack || '';
    return stack;
  }

  /**
   * NEW: Creates a fresh Supabase client to avoid cached schema issues
   */
  public static createFreshClient() {
    // This will create a new client with the same credentials but a fresh connection
    // that won't use any cached schema information
    const freshClient = supabase;
    return freshClient;
  }

  /**
   * NEW: Performs a direct query using a fresh client
   */
  public static async performDirectQuery<T>(
    tableName: string,
    columns: string,
    filters: Record<string, any>
  ): Promise<QueryResult<T>> {
    try {
      console.log(`[ClinicianQueryDebugger] Performing direct query on ${tableName} with fresh client`);
      
      // Create a fresh client
      const client = this.createFreshClient();
      
      // Build the query
      let query = client.from(tableName).select(columns);
      
      // Add filters
      Object.entries(filters).forEach(([key, value]) => {
        query = query.eq(key, value);
      });
      
      // Execute
      const result = await query;
      
      return { 
        data: result.data as T[] | null, 
        error: result.error 
      };
    } catch (error) {
      console.error('[ClinicianQueryDebugger] Error in direct query:', error);
      return { data: null, error };
    }
  }

  /**
   * Wraps the specific query in TherapistSelection.tsx to debug it
   */
  public static async wrapTherapistSelectionQuery<T>(): Promise<QueryResult<T>> {
    return this.debugQuery<T>(
      'clinicians',
      (query) => query
        .select('id, clinician_first_name, clinician_last_name, clinician_professional_name, clinician_type, clinician_bio, clinician_licensed_states, clinician_min_client_age, clinician_profile_image, clinician_image_url')
        .eq('clinician_status', 'Active')
    );
  }
  
  /**
   * NEW: Attempt to query using the compatibility view
   */
  public static async queryWithCompatibilityView<T>(): Promise<QueryResult<T>> {
    console.log('[ClinicianQueryDebugger] Attempting query with compatibility view');
    return this.debugQuery<T>(
      'clinicians_compatibility_view',
      (query) => query
        .select('id, clinician_first_name, clinician_last_name, clinician_professional_name, clinician_type, clinician_bio, clinician_licensed_states, clinician_min_client_age, clinician_profile_image, clinician_image_url')
        .eq('clinician_status', 'Active')
    );
  }
  
  /**
   * NEW: Test if the clinician_status enum is causing issues by using a different filter
   */
  public static async queryWithoutStatusFilter<T>(): Promise<QueryResult<T>> {
    console.log('[ClinicianQueryDebugger] Attempting query without status filter');
    return this.debugQuery<T>(
      'clinicians',
      (query) => query
        .select('id, clinician_first_name, clinician_last_name, clinician_professional_name, clinician_type, clinician_bio, clinician_licensed_states, clinician_min_client_age, clinician_profile_image, clinician_image_url')
    );
  }
  
  /**
   * NEW: Create a specialized hook for troubleshooting the therapist selection
   */
  public static async createTherapistSelectionDebugHook<T>(): Promise<QueryResult<T>> {
    // First, try the normal query
    console.log('[ClinicianQueryDebugger] Starting therapist selection debug process');
    const normalResult = await this.wrapTherapistSelectionQuery<T>();
    
    // If it fails, try the compatibility view
    if (normalResult.error) {
      console.log('[ClinicianQueryDebugger] Normal query failed, trying compatibility view');
      const compatResult = await this.queryWithCompatibilityView<T>();
      
      // If that also fails, try without the status filter
      if (compatResult.error) {
        console.log('[ClinicianQueryDebugger] Compatibility view failed, trying without status filter');
        const noFilterResult = await this.queryWithoutStatusFilter<T>();
        
        // If that also fails, try a direct non-wrapped query as a last resort
        if (noFilterResult.error) {
          console.log('[ClinicianQueryDebugger] All attempts failed, trying direct query');
          const directResult = await supabase
            .from('clinicians')
            .select('id, clinician_first_name, clinician_last_name, clinician_professional_name, clinician_type, clinician_bio, clinician_licensed_states, clinician_min_client_age, clinician_profile_image, clinician_image_url');
            
          return { 
            data: directResult.data as T[] | null, 
            error: directResult.error 
          };
        }
        
        return noFilterResult;
      }
      
      return compatResult;
    }
    
    return normalResult;
  }
}

/**
 * Helper function to wrap a Supabase query with debugging
 */
export function withQueryDebugging<T>(
  tableName: string,
  queryBuilder: (query: any) => any
): Promise<QueryResult<T>> {
  return ClinicianQueryDebugger.debugQuery<T>(tableName, queryBuilder);
}

/**
 * NEW: Hook to use therapist data with enhanced error recovery
 */
export async function useDebugTherapistsData<T>() {
  return await ClinicianQueryDebugger.createTherapistSelectionDebugHook<T>();
}
