
/**
 * Debug utility for the therapist selection component
 */
export class TherapistSelectionDebugger {
  private static circuitBreakerState: 'open' | 'closed' = 'closed';

  static initialize() {
    console.log('🔍 [DEBUG] [TherapistSelectionDebugger] Initializing debugger');
    this.circuitBreakerState = 'closed';
  }

  static cleanup() {
    console.log('🔍 [DEBUG] [TherapistSelectionDebugger] Cleaning up resources');
    this.circuitBreakerState = 'closed';
  }

  static resetCircuitBreaker(reason: string = 'manual-reset') {
    console.log(`🔍 [DEBUG] [TherapistSelectionDebugger] Circuit breaker reset. Reason: ${reason}`);
    this.circuitBreakerState = 'closed';
    
    // Dispatch a reset event for any listeners
    window.dispatchEvent(
      new CustomEvent('therapist_selection_circuit_breaker_reset', {
        detail: {
          source: 'TherapistSelectionDebugger',
          reason: reason,
          timestamp: Date.now()
        }
      })
    );
  }

  static getCircuitBreakerState(): 'open' | 'closed' {
    return this.circuitBreakerState;
  }

  static setCircuitBreakerOpen(reason: string = 'unknown') {
    console.log(`🔍 [DEBUG] [TherapistSelectionDebugger] Setting circuit breaker to OPEN. Reason: ${reason}`);
    this.circuitBreakerState = 'open';
    
    // Dispatch an open event for any listeners
    window.dispatchEvent(
      new CustomEvent('therapist_selection_circuit_breaker_open', {
        detail: {
          source: 'TherapistSelectionDebugger',
          reason: reason,
          timestamp: Date.now()
        }
      })
    );
  }
}
