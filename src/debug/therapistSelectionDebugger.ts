import { supabase } from '@/integrations/supabase/client';

/**
 * Utility to debug the TherapistSelection page and verify it's working correctly
 * with the updated authentication system. Enhanced with network connectivity and
 * circuit breaker monitoring.
 */
export class TherapistSelectionDebugger {
  private static debugId = `debug-${Math.random().toString(36).substring(2, 9)}`;
  private static debugStartTime = Date.now();
  private static lastNetworkStatus: boolean = navigator.onLine;
  private static circuitBreakerState: 'open' | 'closed' = 'closed';

  /**
   * Verify client state is being correctly retrieved from the database
   */
  public static async verifyClientState(userId: string | null): Promise<void> {
    if (!userId) {
      console.error('[TherapistSelectionDebugger] No user ID provided');
      return;
    }

    try {
      console.log(`[TherapistSelectionDebugger] Verifying client state for user ID: ${userId}`);
      
      // First, check network connectivity
      const isOnline = navigator.onLine;
      console.log(`[TherapistSelectionDebugger] Network status: ${isOnline ? 'Online' : 'Offline'}`);
      
      if (!isOnline) {
        console.warn('[TherapistSelectionDebugger] Network appears to be offline, database check may fail');
      }
      
      // Create timeout for this operation
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);
      
      try {
        const { data, error } = await Promise.race([
          supabase
            .from('clients')
            .select('client_state, client_age')
            .eq('id', userId)
            .single(),
          new Promise<{data: null, error: any}>((_, reject) => {
            setTimeout(() => reject({
              data: null,
              error: { message: 'Query timed out after 5 seconds' }
            }), 5000);
          })
        ]);
        
        clearTimeout(timeoutId);
        
        if (error) {
          console.error('[TherapistSelectionDebugger] Error fetching client state:', error);
          this.circuitBreakerState = 'open';
          console.warn('[TherapistSelectionDebugger] Circuit breaker opened due to database error');
        } else if (data) {
          console.log('[TherapistSelectionDebugger] Client state from database:', data.client_state);
          console.log('[TherapistSelectionDebugger] Client age from database:', data.client_age);
          this.circuitBreakerState = 'closed';
        } else {
          console.warn('[TherapistSelectionDebugger] No client data found');
        }
      } catch (error) {
        console.error('[TherapistSelectionDebugger] Query timed out or was aborted:', error);
        this.circuitBreakerState = 'open';
        console.warn('[TherapistSelectionDebugger] Circuit breaker opened due to timeout');
      }
    } catch (error) {
      console.error('[TherapistSelectionDebugger] Exception verifying client state:', error);
      this.circuitBreakerState = 'open';
    }
  }

  /**
   * Verify therapist filtering by state is working correctly
   */
  public static async verifyTherapistFiltering(clientState: string | null): Promise<void> {
    if (!clientState) {
      console.warn('[TherapistSelectionDebugger] No client state provided for filtering verification');
      return;
    }

    try {
      console.log(`[TherapistSelectionDebugger] Verifying therapist filtering for state: ${clientState}`);
      
      // Check network connectivity
      const isOnline = navigator.onLine;
      console.log(`[TherapistSelectionDebugger] Network status: ${isOnline ? 'Online' : 'Offline'}`);
      
      if (!isOnline) {
        console.warn('[TherapistSelectionDebugger] Network appears to be offline, database check may fail');
        return;
      }
      
      // Set a timeout for the query
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 8000);
      
      try {
        // Get all active therapists
        const { data: allTherapists, error: allError } = await Promise.race([
          supabase
            .from('clinicians')
            .select('id, clinician_professional_name, clinician_licensed_states')
            .eq('clinician_status', 'Active'),
          new Promise<{data: null, error: {message: string}}>((_, reject) => {
            setTimeout(() => reject({
              data: null, 
              error: {message: 'Query timed out after 8 seconds'}
            }), 8000);
          })
        ]);
        
        clearTimeout(timeoutId);
        
        if (allError) {
          console.error('[TherapistSelectionDebugger] Error fetching therapists:', allError);
          this.circuitBreakerState = 'open';
          return;
        }
        
        console.log(`[TherapistSelectionDebugger] Found ${allTherapists?.length || 0} total active therapists`);
        
        // Count therapists licensed in the client's state
        const clientStateNormalized = clientState.toLowerCase().trim();
        const matchingTherapists = allTherapists?.filter(therapist => 
          therapist.clinician_licensed_states && 
          therapist.clinician_licensed_states.some(state => {
            if (!state) return false;
            const stateNormalized = state.toLowerCase().trim();
            return stateNormalized.includes(clientStateNormalized) || clientStateNormalized.includes(stateNormalized);
          })
        );
        
        console.log(`[TherapistSelectionDebugger] Found ${matchingTherapists?.length || 0} therapists licensed in ${clientState}`);
        
        // Log the matching therapists
        if (matchingTherapists && matchingTherapists.length > 0) {
          matchingTherapists.forEach(therapist => {
            console.log(`[TherapistSelectionDebugger] Therapist ${therapist.clinician_professional_name} (${therapist.id}) is licensed in ${clientState}`);
          });
          this.circuitBreakerState = 'closed';
        }
      } catch (error) {
        console.error('[TherapistSelectionDebugger] Query timed out or was aborted:', error);
        this.circuitBreakerState = 'open';
      }
    } catch (error) {
      console.error('[TherapistSelectionDebugger] Exception verifying therapist filtering:', error);
      this.circuitBreakerState = 'open';
    }
  }

  /**
   * Reset the circuit breaker state
   */
  public static resetCircuitBreaker(): void {
    console.log('[TherapistSelectionDebugger] Manually resetting circuit breaker state to closed');
    this.circuitBreakerState = 'closed';
  }

  /**
   * Get the current circuit breaker state
   */
  public static getCircuitBreakerState(): 'open' | 'closed' {
    return this.circuitBreakerState;
  }

  /**
   * Verify the correct fields are being displayed
   */
  public static verifyTherapistFields(therapists: any[]): void {
    if (!therapists || therapists.length === 0) {
      console.warn('[TherapistSelectionDebugger] No therapists provided for field verification');
      return;
    }

    console.log(`[TherapistSelectionDebugger] Verifying fields for ${therapists.length} therapists`);
    
    // Check for required fields
    const requiredFields = [
      'clinician_professional_name',
      'clinician_type',
      'clinician_bio',
      'clinician_licensed_states',
      'clinician_image_url'
    ];
    
    therapists.forEach(therapist => {
      console.log(`[TherapistSelectionDebugger] Checking fields for therapist ${therapist.id}`);
      
      requiredFields.forEach(field => {
        if (therapist[field] === undefined) {
          console.error(`[TherapistSelectionDebugger] Missing required field: ${field} for therapist ${therapist.id}`);
        } else {
          console.log(`[TherapistSelectionDebugger] Field ${field} is present for therapist ${therapist.id}`);
        }
      });
    });
  }

  /**
   * Check database connectivity
   */
  public static async checkDatabaseConnectivity(): Promise<boolean> {
    try {
      console.log('[TherapistSelectionDebugger] Testing database connectivity');
      
      // Simple connectivity check query with timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);
      
      try {
        const startTime = performance.now();
        const { data, error } = await Promise.race([
          supabase.from('clients').select('count()', { count: 'exact', head: true }),
          new Promise<{data: null, error: any}>((_, reject) => {
            setTimeout(() => reject({
              data: null,
              error: { message: 'Database connectivity test timed out after 5 seconds' }
            }), 5000);
          })
        ]);
        
        const endTime = performance.now();
        clearTimeout(timeoutId);
        
        const responseTime = endTime - startTime;
        console.log(`[TherapistSelectionDebugger] Database response time: ${responseTime.toFixed(2)}ms`);
        
        if (error) {
          console.error('[TherapistSelectionDebugger] Database connectivity test failed:', error);
          return false;
        }
        
        console.log('[TherapistSelectionDebugger] Database connectivity test successful');
        return true;
      } catch (error) {
        console.error('[TherapistSelectionDebugger] Database connectivity test timed out or aborted:', error);
        return false;
      }
    } catch (error) {
      console.error('[TherapistSelectionDebugger] Exception testing database connectivity:', error);
      return false;
    }
  }

  /**
   * Monitor network status changes
   */
  public static monitorNetworkStatus(): void {
    const currentStatus = navigator.onLine;
    
    if (currentStatus !== this.lastNetworkStatus) {
      console.log(`[TherapistSelectionDebugger] Network status changed: ${currentStatus ? 'Online' : 'Offline'}`);
      this.lastNetworkStatus = currentStatus;
      
      // Reset circuit breaker when network comes back online
      if (currentStatus) {
        this.resetCircuitBreaker();
      }
    }
    
    // Setup listeners if not already set
    if (!window.onstorage) {
      window.addEventListener('online', () => {
        console.log('[TherapistSelectionDebugger] Network came online');
        this.lastNetworkStatus = true;
        this.resetCircuitBreaker(); // Reset circuit breaker when network comes online
      });
      
      window.addEventListener('offline', () => {
        console.log('[TherapistSelectionDebugger] Network went offline');
        this.lastNetworkStatus = false;
      });
    }
  }
  
  /**
   * Performance monitoring for render times
   */
  public static logRenderTime(componentName: string): void {
    const now = Date.now();
    const elapsed = now - this.debugStartTime;
    console.log(`[TherapistSelectionDebugger] ${componentName} rendered - Time since debug start: ${elapsed}ms`);
  }

  /**
   * Run all verification checks
   */
  public static async runAllChecks(userId: string | null, clientState: string | null, therapists: any[]): Promise<void> {
    console.log('[TherapistSelectionDebugger] Running all verification checks');
    console.log(`[TherapistSelectionDebugger] Debug session ID: ${this.debugId}`);
    
    // Reset circuit breaker at the start of checks
    this.resetCircuitBreaker();
    
    // Monitor network status
    this.monitorNetworkStatus();
    
    // First check connectivity
    const isConnected = await this.checkDatabaseConnectivity();
    if (!isConnected) {
      console.error('[TherapistSelectionDebugger] Database connectivity check failed, skipping further checks');
      this.circuitBreakerState = 'open';
      return;
    }
    
    await this.verifyClientState(userId);
    await this.verifyTherapistFiltering(clientState);
    
    if (therapists && therapists.length > 0) {
      this.verifyTherapistFields(therapists);
      this.logRenderTime('TherapistSelection with data');
      this.circuitBreakerState = 'closed'; // Successful data load indicates system is working
    } else {
      console.warn('[TherapistSelectionDebugger] No therapists data provided for field verification');
    }
    
    console.log('[TherapistSelectionDebugger] All verification checks completed');
    console.log('[TherapistSelectionDebugger] Circuit breaker state:', this.circuitBreakerState);
  }
}
