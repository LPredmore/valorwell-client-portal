import { DebugUtils } from './debugUtils';
import { supabase } from '@/integrations/supabase/client';

const CONTEXT = 'ClinicianQueryDebugger';

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
  ): Promise<{ data: T[] | null; error: any }> {
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
  }

  /**
   * Creates a stack trace capture to help identify where a query is being called from
   */
  public static captureStackTrace(): string {
    const stack = new Error().stack || '';
    return stack;
  }

  /**
   * Wraps the specific query in TherapistSelection.tsx to debug it
   */
  public static wrapTherapistSelectionQuery() {
    return this.debugQuery(
      'clinicians',
      (query) => query
        .select('id, clinician_first_name, clinician_last_name, clinician_professional_name, clinician_type, clinician_bio, clinician_bio_short, clinician_licensed_states, clinician_min_client_age, clinician_profile_image, clinician_image_url')
        .eq('clinician_status', 'Active')
    );
  }
}

/**
 * Helper function to wrap a Supabase query with debugging
 */
export function withQueryDebugging<T>(
  tableName: string,
  queryBuilder: (query: any) => any
): Promise<{ data: T[] | null; error: any }> {
  return ClinicianQueryDebugger.debugQuery(tableName, queryBuilder);
}