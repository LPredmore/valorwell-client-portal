
import { supabase } from '@/integrations/supabase/client';

// Constants for circuit breaker - matching the ones in useTherapistSelection
const CIRCUIT_BREAKER_STORAGE_KEY = 'therapist_selection_circuit_breaker';
const CIRCUIT_BREAKER_RESET_EVENT = 'therapist_selection_circuit_breaker_reset';
const CIRCUIT_BREAKER_OPEN_EVENT = 'therapist_selection_circuit_breaker_open';

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
      
      // Check network connectivity
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
          this.setCircuitBreakerOpen();
          console.warn('[TherapistSelectionDebugger] Circuit breaker opened due to database error');
        } else if (data) {
          console.log('[TherapistSelectionDebugger] Client state from database:', data.client_state);
          console.log('[TherapistSelectionDebugger] Client age from database:', data.client_age);
          this.setCircuitBreakerClosed();
        } else {
          console.warn('[TherapistSelectionDebugger] No client data found');
        }
      } catch (error) {
        console.error('[TherapistSelectionDebugger] Query timed out or was aborted:', error);
        this.setCircuitBreakerOpen();
        console.warn('[TherapistSelectionDebugger] Circuit breaker opened due to timeout');
      }
    } catch (error) {
      console.error('[TherapistSelectionDebugger] Exception verifying client state:', error);
      this.setCircuitBreakerOpen();
    }
  }

  /**
   * Set circuit breaker to open state and synchronize across components
   */
  private static setCircuitBreakerOpen(): void {
    console.log('[TherapistSelectionDebugger] Setting circuit breaker state to open');
    this.circuitBreakerState = 'open';
    
    try {
      // Store in sessionStorage for persistence
      sessionStorage.setItem(CIRCUIT_BREAKER_STORAGE_KEY, 'open');
      
      // Dispatch event to notify other components (especially useTherapistSelection)
      window.dispatchEvent(new CustomEvent(CIRCUIT_BREAKER_OPEN_EVENT));
    } catch (err) {
      console.error('[TherapistSelectionDebugger] Error storing circuit breaker state:', err);
    }
  }

  /**
   * Set circuit breaker to closed state and synchronize across components
   */
  private static setCircuitBreakerClosed(): void {
    console.log('[TherapistSelectionDebugger] Setting circuit breaker state to closed');
    this.circuitBreakerState = 'closed';
    
    try {
      // Remove from sessionStorage
      sessionStorage.removeItem(CIRCUIT_BREAKER_STORAGE_KEY);
    } catch (err) {
      console.error('[TherapistSelectionDebugger] Error removing circuit breaker state:', err);
    }
  }

  /**
   * Reset the circuit breaker state
   */
  public static resetCircuitBreaker(): void {
    console.log('[TherapistSelectionDebugger] Manually resetting circuit breaker state to closed');
    this.circuitBreakerState = 'closed';
    
    try {
      // Clear from sessionStorage
      sessionStorage.removeItem(CIRCUIT_BREAKER_STORAGE_KEY);
      
      // Dispatch event to notify other components (especially useTherapistSelection)
      window.dispatchEvent(new CustomEvent(CIRCUIT_BREAKER_RESET_EVENT));
      
      console.log('[TherapistSelectionDebugger] Circuit breaker reset event dispatched');
    } catch (err) {
      console.error('[TherapistSelectionDebugger] Error during circuit breaker reset:', err);
    }
  }

  /**
   * Get the current circuit breaker state
   */
  public static getCircuitBreakerState(): 'open' | 'closed' {
    // Always check sessionStorage first to ensure synchronization with useTherapistSelection
    try {
      const storedState = sessionStorage.getItem(CIRCUIT_BREAKER_STORAGE_KEY);
      if (storedState === 'open') {
        this.circuitBreakerState = 'open';
      }
    } catch (err) {
      // Ignore storage errors and use the current in-memory state
    }
    
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
   * Run all verification checks
   */
  public static async runAllChecks(userId: string | null, clientState: string | null, therapists: any[]): Promise<void> {
    console.log('[TherapistSelectionDebugger] Running all verification checks');
    console.log(`[TherapistSelectionDebugger] Debug session ID: ${this.debugId}`);
    
    // Reset circuit breaker at the start of checks
    this.resetCircuitBreaker();
    
    // Monitor network status
    this.monitorNetworkStatus();
    
    await this.verifyClientState(userId);
    
    if (therapists && therapists.length > 0) {
      this.verifyTherapistFields(therapists);
      this.logRenderTime('TherapistSelection with data');
      this.setCircuitBreakerClosed(); // Successful data load indicates system is working
    } else {
      console.warn('[TherapistSelectionDebugger] No therapists data provided for field verification');
    }
    
    console.log('[TherapistSelectionDebugger] All verification checks completed');
    console.log('[TherapistSelectionDebugger] Circuit breaker state:', this.circuitBreakerState);
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
  }
  
  /**
   * Performance monitoring for render times
   */
  public static logRenderTime(componentName: string): void {
    const now = Date.now();
    const elapsed = now - this.debugStartTime;
    console.log(`[TherapistSelectionDebugger] ${componentName} rendered - Time since debug start: ${elapsed}ms`);
  }
}
