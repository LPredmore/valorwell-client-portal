import { supabase } from '@/integrations/supabase/client';
import { DebugUtils } from '@/utils/debugUtils';

// Constants for circuit breaker - matching the ones in useTherapistSelection
const CIRCUIT_BREAKER_STORAGE_KEY = 'therapist_selection_circuit_breaker';
const CIRCUIT_BREAKER_RESET_EVENT = 'therapist_selection_circuit_breaker_reset';
const CIRCUIT_BREAKER_OPEN_EVENT = 'therapist_selection_circuit_breaker_open';
const CIRCUIT_BREAKER_CLEANUP_EVENT = 'therapist_selection_circuit_breaker_cleanup';

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
  private static cleanupEventAttached = false;
  private static loggingEnabled = true;
  private static logHistory: Array<{
    timestamp: number;
    message: string;
    data?: any;
    stack?: string;
  }> = [];

  /**
   * Initialize the debugger and set up global event listeners
   */
  public static initialize(): void {
    this.logWithTimestamp('Initializing debugger');
    
    // Add a cleanup listener for page unload/navigation
    if (!this.cleanupEventAttached) {
      window.addEventListener('beforeunload', () => this.cleanupCircuitBreakerState());
      window.addEventListener('pagehide', () => this.cleanupCircuitBreakerState());
      
      // Listen for reset events from other instances
      window.addEventListener(CIRCUIT_BREAKER_RESET_EVENT, (event) => {
        this.logWithTimestamp('Received reset event from another component', {
          sourceComponent: (event as CustomEvent)?.detail?.source || 'unknown',
          reason: (event as CustomEvent)?.detail?.reason || 'unknown'
        });
        this.circuitBreakerState = 'closed';
      });
      
      // Listen for cleanup events
      window.addEventListener(CIRCUIT_BREAKER_CLEANUP_EVENT, (event) => {
        this.logWithTimestamp('Received cleanup event', {
          sourceComponent: (event as CustomEvent)?.detail?.source || 'unknown'
        });
        this.cleanupCircuitBreakerState();
      });
      
      this.cleanupEventAttached = true;
    }
    
    // Check if circuit breaker is stuck in 'open' state
    try {
      const storedState = sessionStorage.getItem(CIRCUIT_BREAKER_STORAGE_KEY);
      const timestamp = sessionStorage.getItem(`${CIRCUIT_BREAKER_STORAGE_KEY}_timestamp`);
      
      if (storedState === 'open') {
        // Check if it's been open for more than 5 minutes
        if (timestamp && (Date.now() - parseInt(timestamp)) > 300000) {
          this.logWithTimestamp('Circuit breaker stuck open for >5 minutes, resetting', {
            openSince: new Date(parseInt(timestamp)).toISOString()
          });
          this.resetCircuitBreaker('auto-reset-stale-state');
        } else {
          this.logWithTimestamp('Circuit breaker found in open state', {
            openSince: timestamp ? new Date(parseInt(timestamp)).toISOString() : 'unknown'
          });
          this.circuitBreakerState = 'open';
        }
      }
    } catch (err) {
      // Ignore storage errors and use the current in-memory state
      this.logWithTimestamp('Error checking stored circuit breaker state', { error: err });
    }
  }

  /**
   * Cleanup resources and event listeners when component unmounts
   */
  public static cleanup(): void {
    this.logWithTimestamp('Cleaning up TherapistSelectionDebugger resources');
    
    try {
      // Clean up event listeners
      window.removeEventListener('beforeunload', () => this.cleanupCircuitBreakerState());
      window.removeEventListener('pagehide', () => this.cleanupCircuitBreakerState());
      
      // Clean up circuit breaker state if appropriate
      this.cleanupCircuitBreakerState();
      
      // Reset internal state
      this.cleanupEventAttached = false;
      this.logHistory = [];
      
      this.logWithTimestamp('TherapistSelectionDebugger cleanup complete');
    } catch (err) {
      console.error('Error during TherapistSelectionDebugger cleanup:', err);
    }
  }

  /**
   * Log with timestamp and optional stack trace
   */
  private static logWithTimestamp(message: string, data?: any, captureStack: boolean = false): void {
    if (!this.loggingEnabled) return;
    
    const timestamp = Date.now();
    const elapsedTime = timestamp - this.debugStartTime;
    const formattedTime = new Date().toISOString();
    
    let stack: string | undefined;
    if (captureStack) {
      try {
        throw new Error('Stack trace capture');
      } catch (e) {
        stack = e.stack?.split('\n').slice(2).join('\n');
      }
    }
    
    // Add to log history
    this.logHistory.push({
      timestamp,
      message,
      data,
      stack
    });
    
    // Keep log history manageable
    if (this.logHistory.length > 100) {
      this.logHistory.shift();
    }
    
    // Output formatted log
    const logMessage = `[TherapistSelectionDebugger] [${formattedTime}] (+${elapsedTime}ms) ${message}`;
    
    if (data) {
      console.log(logMessage, data);
    } else {
      console.log(logMessage);
    }
    
    if (stack) {
      console.log(`[TherapistSelectionDebugger] Stack trace:\n${stack}`);
    }
    
    // Use DebugUtils for special formatting if available
    try {
      DebugUtils.log('TherapistSelectionDebugger', message, data);
    } catch (e) {
      // Ignore error if DebugUtils is unavailable
    }
  }

  /**
   * Verify client state is being correctly retrieved from the database
   */
  public static async verifyClientState(userId: string | null): Promise<void> {
    if (!userId) {
      this.logWithTimestamp('No user ID provided', null, true);
      return;
    }

    try {
      this.logWithTimestamp(`Verifying client state for user ID: ${userId}`);
      
      // Check network connectivity
      const isOnline = navigator.onLine;
      this.logWithTimestamp(`Network status: ${isOnline ? 'Online' : 'Offline'}`);
      
      if (!isOnline) {
        this.logWithTimestamp('Network appears to be offline, database check may fail', null, true);
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
          this.logWithTimestamp('Error fetching client state', { error, userId }, true);
          this.setCircuitBreakerOpen('database-error');
          this.logWithTimestamp('Circuit breaker opened due to database error');
        } else if (data) {
          this.logWithTimestamp('Client state from database', data);
          this.setCircuitBreakerClosed('successful-client-query');
        } else {
          this.logWithTimestamp('No client data found', { userId }, true);
        }
      } catch (error) {
        this.logWithTimestamp('Query timed out or was aborted', { error, userId }, true);
        this.setCircuitBreakerOpen('database-timeout');
        this.logWithTimestamp('Circuit breaker opened due to timeout');
      }
    } catch (error) {
      this.logWithTimestamp('Exception verifying client state', { error, userId }, true);
      this.setCircuitBreakerOpen('unexpected-error');
    }
  }

  /**
   * Set circuit breaker to open state and synchronize across components
   */
  private static setCircuitBreakerOpen(reason: string): void {
    this.logWithTimestamp(`Setting circuit breaker state to open. Reason: ${reason}`, null, true);
    this.circuitBreakerState = 'open';
    
    try {
      // Store in sessionStorage for persistence with timestamp
      sessionStorage.setItem(CIRCUIT_BREAKER_STORAGE_KEY, 'open');
      sessionStorage.setItem(`${CIRCUIT_BREAKER_STORAGE_KEY}_timestamp`, Date.now().toString());
      sessionStorage.setItem(`${CIRCUIT_BREAKER_STORAGE_KEY}_reason`, reason);
      
      // Dispatch event to notify other components (especially useTherapistSelection)
      window.dispatchEvent(
        new CustomEvent(CIRCUIT_BREAKER_OPEN_EVENT, {
          detail: {
            source: 'TherapistSelectionDebugger',
            reason: reason,
            timestamp: Date.now()
          }
        })
      );
    } catch (err) {
      this.logWithTimestamp('Error storing circuit breaker state', { error: err });
    }
  }

  /**
   * Set circuit breaker to closed state and synchronize across components
   */
  private static setCircuitBreakerClosed(reason: string): void {
    this.logWithTimestamp(`Setting circuit breaker state to closed. Reason: ${reason}`);
    this.circuitBreakerState = 'closed';
    
    try {
      // Remove from sessionStorage including timestamp
      sessionStorage.removeItem(CIRCUIT_BREAKER_STORAGE_KEY);
      sessionStorage.removeItem(`${CIRCUIT_BREAKER_STORAGE_KEY}_timestamp`);
      sessionStorage.removeItem(`${CIRCUIT_BREAKER_STORAGE_KEY}_reason`);
    } catch (err) {
      this.logWithTimestamp('Error removing circuit breaker state', { error: err });
    }
  }

  /**
   * Reset the circuit breaker state
   */
  public static resetCircuitBreaker(reason: string = 'manual-reset'): void {
    this.logWithTimestamp(`Resetting circuit breaker state to closed. Reason: ${reason}`, null, true);
    this.circuitBreakerState = 'closed';
    
    try {
      // Clear from sessionStorage including timestamp
      sessionStorage.removeItem(CIRCUIT_BREAKER_STORAGE_KEY);
      sessionStorage.removeItem(`${CIRCUIT_BREAKER_STORAGE_KEY}_timestamp`);
      sessionStorage.removeItem(`${CIRCUIT_BREAKER_STORAGE_KEY}_reason`);
      
      // Dispatch event to notify other components (especially useTherapistSelection)
      window.dispatchEvent(
        new CustomEvent(CIRCUIT_BREAKER_RESET_EVENT, {
          detail: {
            source: 'TherapistSelectionDebugger',
            reason: reason,
            timestamp: Date.now()
          }
        })
      );
      
      this.logWithTimestamp('Circuit breaker reset event dispatched');
    } catch (err) {
      this.logWithTimestamp('Error during circuit breaker reset', { error: err }, true);
    }
  }

  /**
   * Clean up circuit breaker state as part of unmounting or navigation
   */
  private static cleanupCircuitBreakerState(): void {
    this.logWithTimestamp('Cleaning up circuit breaker state');
    
    try {
      // Only clean up if the circuit breaker is in closed state or has been open too long
      const storedState = sessionStorage.getItem(CIRCUIT_BREAKER_STORAGE_KEY);
      const timestamp = sessionStorage.getItem(`${CIRCUIT_BREAKER_STORAGE_KEY}_timestamp`);
      const reason = sessionStorage.getItem(`${CIRCUIT_BREAKER_STORAGE_KEY}_reason`) || 'unknown';
      
      this.logWithTimestamp('Circuit breaker cleanup check', { 
        storedState, 
        inMemoryState: this.circuitBreakerState,
        timestamp: timestamp ? new Date(parseInt(timestamp)).toISOString() : null,
        reason
      });
      
      if (this.circuitBreakerState === 'closed' || 
          (storedState === 'open' && timestamp && (Date.now() - parseInt(timestamp)) > 30000)) {
        sessionStorage.removeItem(CIRCUIT_BREAKER_STORAGE_KEY);
        sessionStorage.removeItem(`${CIRCUIT_BREAKER_STORAGE_KEY}_timestamp`);
        sessionStorage.removeItem(`${CIRCUIT_BREAKER_STORAGE_KEY}_reason`);
        
        // Notify other components
        window.dispatchEvent(
          new CustomEvent(CIRCUIT_BREAKER_CLEANUP_EVENT, {
            detail: {
              source: 'TherapistSelectionDebugger',
              timestamp: Date.now()
            }
          })
        );
        this.logWithTimestamp('Circuit breaker state cleaned up');
      }
    } catch (err) {
      this.logWithTimestamp('Error during circuit breaker cleanup', { error: err }, true);
    }
  }

  /**
   * Get the current circuit breaker state
   */
  public static getCircuitBreakerState(): 'open' | 'closed' {
    // Always check sessionStorage first to ensure synchronization with useTherapistSelection
    try {
      const storedState = sessionStorage.getItem(CIRCUIT_BREAKER_STORAGE_KEY);
      const timestamp = sessionStorage.getItem(`${CIRCUIT_BREAKER_STORAGE_KEY}_timestamp`);
      const reason = sessionStorage.getItem(`${CIRCUIT_BREAKER_STORAGE_KEY}_reason`);
      
      if (storedState === 'open') {
        if (this.circuitBreakerState !== 'open') {
          this.logWithTimestamp('Circuit breaker state mismatch detected - storage: open, memory: closed', {
            reason,
            timestamp: timestamp ? new Date(parseInt(timestamp)).toISOString() : null
          });
        }
        this.circuitBreakerState = 'open';
      }
    } catch (err) {
      // Ignore storage errors and use the current in-memory state
    }
    
    return this.circuitBreakerState;
  }

  /**
   * Get detailed circuit breaker state information for debugging
   */
  public static getCircuitBreakerDetails(): {
    state: 'open' | 'closed',
    openSince?: string,
    reason?: string,
    timeSinceOpened?: number
  } {
    try {
      const state = this.getCircuitBreakerState();
      const timestamp = sessionStorage.getItem(`${CIRCUIT_BREAKER_STORAGE_KEY}_timestamp`);
      const reason = sessionStorage.getItem(`${CIRCUIT_BREAKER_STORAGE_KEY}_reason`) || 'unknown';
      
      if (state === 'open' && timestamp) {
        const openTime = parseInt(timestamp);
        const timeSinceOpened = Date.now() - openTime;
        return {
          state,
          openSince: new Date(openTime).toISOString(),
          reason,
          timeSinceOpened
        };
      }
      
      return { state };
    } catch (err) {
      this.logWithTimestamp('Error retrieving circuit breaker details', { error: err });
      return { state: this.circuitBreakerState };
    }
  }

  /**
   * Verify the correct fields are being displayed
   */
  public static verifyTherapistFields(therapists: any[]): void {
    if (!therapists || therapists.length === 0) {
      this.logWithTimestamp('No therapists provided for field verification');
      return;
    }

    this.logWithTimestamp(`Verifying fields for ${therapists.length} therapists`);
    
    // Check for required fields
    const requiredFields = [
      'clinician_professional_name',
      'clinician_type',
      'clinician_bio',
      'clinician_licensed_states',
      'clinician_image_url'
    ];
    
    therapists.forEach(therapist => {
      this.logWithTimestamp(`Checking fields for therapist ${therapist.id}`);
      
      requiredFields.forEach(field => {
        if (therapist[field] === undefined) {
          this.logWithTimestamp(`Missing required field: ${field} for therapist ${therapist.id}`, null, true);
        } else {
          this.logWithTimestamp(`Field ${field} is present for therapist ${therapist.id}`);
        }
      });
    });
  }

  /**
   * Run all verification checks
   */
  public static async runAllChecks(userId: string | null, clientState: string | null, therapists: any[]): Promise<void> {
    this.logWithTimestamp('Running all verification checks');
    this.logWithTimestamp(`Debug session ID: ${this.debugId}`);
    
    // Make sure the debugger is initialized
    this.initialize();
    
    // Reset circuit breaker at the start of checks
    this.resetCircuitBreaker('start-verification');
    
    // Monitor network status
    this.monitorNetworkStatus();
    
    await this.verifyClientState(userId);
    
    if (therapists && therapists.length > 0) {
      this.verifyTherapistFields(therapists);
      this.logRenderTime('TherapistSelection with data');
      this.setCircuitBreakerClosed('successful-data-load'); // Successful data load indicates system is working
    } else {
      this.logWithTimestamp('No therapists data provided for field verification');
    }
    
    this.logWithTimestamp('All verification checks completed');
    
    // Log complete circuit breaker state with details
    const cbDetails = this.getCircuitBreakerDetails();
    this.logWithTimestamp('Circuit breaker state', cbDetails);
  }

  /**
   * Monitor network status changes
   */
  public static monitorNetworkStatus(): void {
    const currentStatus = navigator.onLine;
    
    if (currentStatus !== this.lastNetworkStatus) {
      this.logWithTimestamp(`Network status changed: ${currentStatus ? 'Online' : 'Offline'}`);
      this.lastNetworkStatus = currentStatus;
      
      // Reset circuit breaker when network comes back online
      if (currentStatus) {
        this.resetCircuitBreaker('network-restored');
      }
    }
  }
  
  /**
   * Performance monitoring for render times
   */
  public static logRenderTime(componentName: string): void {
    const now = Date.now();
    const elapsed = now - this.debugStartTime;
    this.logWithTimestamp(`${componentName} rendered - Time since debug start: ${elapsed}ms`);
  }
  
  /**
   * Export log history for debugging
   */
  public static exportLogs(): Array<{timestamp: number, message: string, data?: any, stack?: string}> {
    return this.logHistory;
  }
}

// Initialize the debugger when the file is loaded
TherapistSelectionDebugger.initialize();
