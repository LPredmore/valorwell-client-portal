
import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { ClinicianQueryDebugger } from '@/debug/clinicianQueryDebugger';
import { useToast } from '@/hooks/use-toast';
import { ClientDetails } from '@/types/client';
import { toast } from 'sonner';
import { TherapistSelectionDebugger } from '@/debug/therapistSelectionDebugger';

export interface Therapist {
  id: string;
  clinician_first_name: string | null;
  clinician_last_name: string | null;
  clinician_professional_name: string | null;
  clinician_type: string | null; 
  clinician_bio: string | null;
  clinician_bio_short?: string | null;
  clinician_licensed_states: string[] | null;
  clinician_min_client_age: number | null;
  clinician_image_url: string | null;
  // Keep this for backward compatibility
  clinician_profile_image?: string | null;
}

interface UseTherapistSelectionOptions {
  clientState: string | null;
  clientAge: number;
  enableFiltering?: boolean;
}

interface UseTherapistSelectionResult {
  therapists: Therapist[];
  allTherapists: Therapist[];
  loading: boolean;
  error: string | null;
  filteringApplied: boolean;
  retryFetch: () => void;
  selectTherapist: (therapistId: string) => Promise<boolean>;
  selectingTherapistId: string | null;
}

// Constants for circuit breaker and retries
const MAX_RETRY_ATTEMPTS = 3;
const INITIAL_RETRY_DELAY = 1000; // 1 second
const TIMEOUT_MS = 10000; // 10 seconds
const NETWORK_CHECK_URL = 'https://www.google.com/generate_204';
const CIRCUIT_BREAKER_RESET_TIME = 30000; // 30 seconds

// Use localStorage key to persist circuit breaker state across component renders
const CIRCUIT_BREAKER_STORAGE_KEY = 'therapist_selection_circuit_breaker';
const CIRCUIT_BREAKER_RESET_EVENT = 'therapist_selection_circuit_breaker_reset';
const CIRCUIT_BREAKER_OPEN_EVENT = 'therapist_selection_circuit_breaker_open';
const CIRCUIT_BREAKER_CLEANUP_EVENT = 'therapist_selection_circuit_breaker_cleanup';

/**
 * Enhanced logging function with stack trace capability
 */
function logWithStack(message: string, data?: any, captureStack: boolean = false): void {
  const timestamp = new Date().toISOString();
  let stack: string | undefined;
  
  if (captureStack) {
    try {
      throw new Error('Stack trace capture');
    } catch (e) {
      stack = e.stack?.split('\n').slice(2).join('\n');
    }
  }
  
  const logMessage = `[useTherapistSelection] [${timestamp}] ${message}`;
  
  if (data) {
    console.log(logMessage, data);
  } else {
    console.log(logMessage);
  }
  
  if (stack) {
    console.log(`[useTherapistSelection] Stack trace:\n${stack}`);
  }
}

/**
 * A specialized hook for loading therapist data with enhanced error recovery
 * to handle network issues and prevent infinite retry loops
 */
export const useTherapistSelection = ({
  clientState,
  clientAge,
  enableFiltering = true
}: UseTherapistSelectionOptions): UseTherapistSelectionResult => {
  const { toast } = useToast();
  
  const [loading, setLoading] = useState<boolean>(true);
  const [therapists, setTherapists] = useState<Therapist[]>([]);
  const [allTherapists, setAllTherapists] = useState<Therapist[]>([]);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [filteringApplied, setFilteringApplied] = useState<boolean>(false);
  const [selectingTherapistId, setSelectingTherapistId] = useState<string | null>(null);
  const [attemptCount, setAttemptCount] = useState<number>(0);
  
  // Circuit breaker state
  const [circuitOpen, setCircuitOpen] = useState<boolean>(false);
  const circuitResetTimerRef = useRef<number | null>(null);
  const retryCountRef = useRef<number>(0);
  const abortControllerRef = useRef<AbortController | null>(null);
  const mountedRef = useRef<boolean>(true);
  const instanceIdRef = useRef<string>(`instance-${Math.random().toString(36).substring(2, 9)}`);
  const operationStartTimeRef = useRef<number>(0);
  
  // Log initial hook parameters for debugging
  logWithStack(`Hook initialized with clientState: ${clientState}, clientAge: ${clientAge}, enableFiltering: ${enableFiltering}`);
  logWithStack(`Instance ID: ${instanceIdRef.current}`);
  
  // Handle circuit breaker events from TherapistSelectionDebugger
  useEffect(() => {
    // Handler for reset events
    const handleCircuitBreakerReset = (event: Event) => {
      const detail = (event as CustomEvent)?.detail || {};
      logWithStack('Received circuit breaker reset event', {
        source: detail.source || 'unknown',
        reason: detail.reason || 'unknown',
        timestamp: detail.timestamp ? new Date(detail.timestamp).toISOString() : 'unknown'
      });
      
      if (mountedRef.current) {
        setCircuitOpen(false);
        retryCountRef.current = 0;
        
        // Clear any pending auto-reset
        if (circuitResetTimerRef.current) {
          window.clearTimeout(circuitResetTimerRef.current);
          circuitResetTimerRef.current = null;
        }
      }
    };
    
    // Handler for open events
    const handleCircuitBreakerOpen = (event: Event) => {
      const detail = (event as CustomEvent)?.detail || {};
      logWithStack('Received circuit breaker open event', {
        source: detail.source || 'unknown',
        reason: detail.reason || 'unknown',
        timestamp: detail.timestamp ? new Date(detail.timestamp).toISOString() : 'unknown'
      }, true);
      
      if (mountedRef.current) {
        setCircuitOpen(true);
        resetCircuitBreaker(); // Start the reset timer
      }
    };
    
    // Handler for cleanup events
    const handleCircuitBreakerCleanup = (event: Event) => {
      const detail = (event as CustomEvent)?.detail || {};
      logWithStack('Received circuit breaker cleanup event', {
        source: detail.source || 'unknown',
        timestamp: detail.timestamp ? new Date(detail.timestamp).toISOString() : 'unknown'
      });
      
      if (mountedRef.current) {
        // Only clear if we're in a good state
        if (!circuitOpen || attemptCount > 3) {
          manualResetCircuitBreaker('cleanup-event');
        }
      }
    };
    
    // Add event listeners for circuit breaker events
    window.addEventListener(CIRCUIT_BREAKER_RESET_EVENT, handleCircuitBreakerReset);
    window.addEventListener(CIRCUIT_BREAKER_OPEN_EVENT, handleCircuitBreakerOpen);
    window.addEventListener(CIRCUIT_BREAKER_CLEANUP_EVENT, handleCircuitBreakerCleanup);
    
    return () => {
      // Remove event listeners when component unmounts
      window.removeEventListener(CIRCUIT_BREAKER_RESET_EVENT, handleCircuitBreakerReset);
      window.removeEventListener(CIRCUIT_BREAKER_OPEN_EVENT, handleCircuitBreakerOpen);
      window.removeEventListener(CIRCUIT_BREAKER_CLEANUP_EVENT, handleCircuitBreakerCleanup);
    };
  }, [attemptCount, circuitOpen]);
  
  // Get circuit breaker state from storage on mount
  useEffect(() => {
    try {
      const storedState = sessionStorage.getItem(CIRCUIT_BREAKER_STORAGE_KEY);
      const timestamp = sessionStorage.getItem(`${CIRCUIT_BREAKER_STORAGE_KEY}_timestamp`);
      const reason = sessionStorage.getItem(`${CIRCUIT_BREAKER_STORAGE_KEY}_reason`);
      
      if (storedState === 'open') {
        // Check if it's been too long since the circuit breaker was opened
        if (timestamp && (Date.now() - parseInt(timestamp)) > CIRCUIT_BREAKER_RESET_TIME * 1.5) {
          logWithStack('Circuit breaker has been open for too long, resetting', {
            openSince: timestamp ? new Date(parseInt(timestamp)).toISOString() : 'unknown',
            reason: reason || 'unknown',
            openDuration: timestamp ? `${(Date.now() - parseInt(timestamp))/1000} seconds` : 'unknown'
          }, true);
          
          setCircuitOpen(false);
          try {
            sessionStorage.removeItem(CIRCUIT_BREAKER_STORAGE_KEY);
            sessionStorage.removeItem(`${CIRCUIT_BREAKER_STORAGE_KEY}_timestamp`);
            sessionStorage.removeItem(`${CIRCUIT_BREAKER_STORAGE_KEY}_reason`);
          } catch (err) {
            logWithStack('Error clearing stale circuit breaker state', { error: err }, true);
          }
        } else {
          logWithStack('Loading circuit breaker state from storage: open', {
            openSince: timestamp ? new Date(parseInt(timestamp)).toISOString() : 'unknown',
            reason: reason || 'unknown'
          });
          
          setCircuitOpen(true);
          
          // Start reset timer
          resetCircuitBreaker();
        }
      } else {
        // Reset circuit breaker on fresh component mount
        logWithStack('Resetting circuit breaker state on component mount');
        setCircuitOpen(false);
        
        // Ensure storage is clear
        sessionStorage.removeItem(CIRCUIT_BREAKER_STORAGE_KEY);
        sessionStorage.removeItem(`${CIRCUIT_BREAKER_STORAGE_KEY}_timestamp`);
        sessionStorage.removeItem(`${CIRCUIT_BREAKER_STORAGE_KEY}_reason`);
        
        // Reset retry count
        retryCountRef.current = 0;
      }
    } catch (err) {
      // If storage access fails, just reset the circuit breaker
      logWithStack('Error accessing sessionStorage', { error: err }, true);
      setCircuitOpen(false);
      retryCountRef.current = 0;
    }
    
    // Check if the debugger has any circuit breaker state
    const debuggerCircuitState = TherapistSelectionDebugger.getCircuitBreakerState();
    if (debuggerCircuitState === 'open') {
      logWithStack('Debugger reported circuit breaker in open state', null, true);
      setCircuitOpen(true);
      resetCircuitBreaker(); // Start reset timer
    }
  }, []);
  
  // Persist circuit breaker state to storage when it changes
  useEffect(() => {
    try {
      if (circuitOpen) {
        logWithStack('Saving circuit breaker state to storage: open');
        sessionStorage.setItem(CIRCUIT_BREAKER_STORAGE_KEY, 'open');
        // Only set timestamp if it doesn't exist
        if (!sessionStorage.getItem(`${CIRCUIT_BREAKER_STORAGE_KEY}_timestamp`)) {
          sessionStorage.setItem(`${CIRCUIT_BREAKER_STORAGE_KEY}_timestamp`, Date.now().toString());
        }
        
        // Track reason if it doesn't exist
        if (!sessionStorage.getItem(`${CIRCUIT_BREAKER_STORAGE_KEY}_reason`)) {
          sessionStorage.setItem(`${CIRCUIT_BREAKER_STORAGE_KEY}_reason`, 'react-state-change');
        }
      } else {
        logWithStack('Removing circuit breaker state from storage');
        sessionStorage.removeItem(CIRCUIT_BREAKER_STORAGE_KEY);
        sessionStorage.removeItem(`${CIRCUIT_BREAKER_STORAGE_KEY}_timestamp`);
        sessionStorage.removeItem(`${CIRCUIT_BREAKER_STORAGE_KEY}_reason`);
      }
    } catch (err) {
      logWithStack('Error handling circuit breaker storage', { error: err }, true);
    }
  }, [circuitOpen]);
  
  // Check if network is connected
  const checkNetworkConnectivity = async (): Promise<boolean> => {
    const startTime = Date.now();
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);
      
      const response = await fetch(NETWORK_CHECK_URL, { 
        method: 'HEAD',
        mode: 'no-cors',
        signal: controller.signal 
      });
      
      clearTimeout(timeoutId);
      const duration = Date.now() - startTime;
      logWithStack('Network connectivity check', {
        result: response.ok ? 'Online' : 'Offline',
        duration: `${duration}ms`
      });
      return true; // If we get here, network is connected (even if response is not ok due to CORS)
    } catch (error) {
      const duration = Date.now() - startTime;
      logWithStack('Network connectivity check failed', { 
        error, 
        navigatorOnline: navigator.onLine,
        duration: `${duration}ms`
      }, true);
      return navigator.onLine; // Fallback to navigator.onLine
    }
  };
  
  // Reset circuit breaker after cooldown period
  const resetCircuitBreaker = useCallback(() => {
    if (circuitResetTimerRef.current) {
      window.clearTimeout(circuitResetTimerRef.current);
    }
    
    logWithStack('Setting circuit breaker reset timer');
    // Reset after defined reset time
    circuitResetTimerRef.current = window.setTimeout(() => {
      if (mountedRef.current) {
        logWithStack('Circuit breaker auto-reset after timeout', {
          resetTime: `${CIRCUIT_BREAKER_RESET_TIME/1000} seconds`
        }, true);
        
        setCircuitOpen(false);
        retryCountRef.current = 0;
        try {
          const reason = sessionStorage.getItem(`${CIRCUIT_BREAKER_STORAGE_KEY}_reason`);
          const timestamp = sessionStorage.getItem(`${CIRCUIT_BREAKER_STORAGE_KEY}_timestamp`);
          
          logWithStack('Auto-resetting circuit breaker from timer', {
            previousReason: reason || 'unknown',
            openSince: timestamp ? new Date(parseInt(timestamp)).toISOString() : 'unknown',
            openDuration: timestamp ? `${(Date.now() - parseInt(timestamp))/1000} seconds` : 'unknown'
          });
          
          sessionStorage.removeItem(CIRCUIT_BREAKER_STORAGE_KEY);
          sessionStorage.removeItem(`${CIRCUIT_BREAKER_STORAGE_KEY}_timestamp`);
          sessionStorage.removeItem(`${CIRCUIT_BREAKER_STORAGE_KEY}_reason`);
          
          // Notify TherapistSelectionDebugger of reset
          TherapistSelectionDebugger.resetCircuitBreaker('hook-timer-expiry');
        } catch (err) {
          logWithStack('Error during circuit breaker reset', { error: err }, true);
        }
      }
    }, CIRCUIT_BREAKER_RESET_TIME);
  }, []);

  // Function to manually reset the circuit breaker
  const manualResetCircuitBreaker = useCallback((reason: string = 'manual-reset') => {
    logWithStack(`Manual circuit breaker reset. Reason: ${reason}`, null, true);
    setCircuitOpen(false);
    retryCountRef.current = 0;
    
    // Also reset the debugger circuit breaker
    TherapistSelectionDebugger.resetCircuitBreaker(`hook-${reason}`);
    
    try {
      const previousReason = sessionStorage.getItem(`${CIRCUIT_BREAKER_STORAGE_KEY}_reason`);
      const timestamp = sessionStorage.getItem(`${CIRCUIT_BREAKER_STORAGE_KEY}_timestamp`);
      
      logWithStack('Removing circuit breaker from storage', {
        previousReason: previousReason || 'unknown',
        openSince: timestamp ? new Date(parseInt(timestamp)).toISOString() : 'unknown',
        openDuration: timestamp ? `${(Date.now() - parseInt(timestamp))/1000} seconds` : 'unknown'
      });
      
      sessionStorage.removeItem(CIRCUIT_BREAKER_STORAGE_KEY);
      sessionStorage.removeItem(`${CIRCUIT_BREAKER_STORAGE_KEY}_timestamp`);
      sessionStorage.removeItem(`${CIRCUIT_BREAKER_STORAGE_KEY}_reason`);
    } catch (err) {
      logWithStack('Error removing circuit breaker from storage', { error: err }, true);
    }
    
    // Cancel any pending auto-reset
    if (circuitResetTimerRef.current) {
      window.clearTimeout(circuitResetTimerRef.current);
      circuitResetTimerRef.current = null;
    }
  }, []);
  
  // Function to fetch therapists with multi-layered fallback strategies
  const fetchTherapists = useCallback(async () => {
    // Cancel any in-flight requests
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    
    // Create a new AbortController for this request
    abortControllerRef.current = new AbortController();
    
    // Check if circuit breaker is open
    if (circuitOpen) {
      logWithStack('Circuit breaker is open, not attempting fetch', null, true);
      setErrorMessage('Too many failed attempts. Please try again by clicking the refresh button.');
      setLoading(false);
      return;
    }
    
    // Check retry count
    if (retryCountRef.current >= MAX_RETRY_ATTEMPTS) {
      logWithStack(`Maximum retry attempts (${MAX_RETRY_ATTEMPTS}) reached`, { 
        retryCount: retryCountRef.current,
        maxRetries: MAX_RETRY_ATTEMPTS
      }, true);
      
      setCircuitOpen(true);
      resetCircuitBreaker();
      setErrorMessage('Maximum retry attempts reached. Please try again later by clicking the refresh button.');
      setLoading(false);
      return;
    }
    
    setLoading(true);
    setErrorMessage(null);
    setFilteringApplied(false);
    
    // Increment retry count
    retryCountRef.current++;
    
    // Calculate backoff delay based on retry count (exponential backoff)
    const backoffDelay = retryCountRef.current > 1 ? 
      INITIAL_RETRY_DELAY * Math.pow(2, retryCountRef.current - 1) : 
      0;
    
    logWithStack(`Fetching therapists (attempt ${retryCountRef.current}/${MAX_RETRY_ATTEMPTS})`, { 
      backoffDelay: `${backoffDelay}ms`,
      instanceId: instanceIdRef.current,
      timestamp: new Date().toISOString()
    });
    
    // Track operation start time
    operationStartTimeRef.current = Date.now();
    
    // Apply backoff delay if this is a retry
    if (backoffDelay > 0) {
      await new Promise(resolve => setTimeout(resolve, backoffDelay));
      
      // Check if component is still mounted after the delay
      if (!mountedRef.current) {
        logWithStack('Component unmounted during backoff, aborting fetch');
        return;
      }
    }
    
    // Check network connectivity before making request
    const isConnected = await checkNetworkConnectivity();
    if (!isConnected) {
      logWithStack('Network connectivity check failed', null, true);
      setErrorMessage('Network connectivity issue. Please check your internet connection and try again.');
      setLoading(false);
      return;
    }
    
    let therapistData: Therapist[] = [];
    let fetchError: any = null;
    
    // Create a timeout promise
    const timeoutPromise = new Promise<{data: null, error: any}>((_, reject) => {
      setTimeout(() => reject({
        data: null,
        error: { message: 'Request timed out. Please try again.' }
      }), TIMEOUT_MS);
    });
    
    try {
      // Strategy 1: Use case-insensitive comparison for clinician_status
      logWithStack('Strategy 1: Using case-insensitive query for clinician_status');
      
      // Race between the actual query and the timeout
      const strategyStartTime = Date.now();
      const result = await Promise.race([
        supabase
          .from('clinicians')
          .select('id, clinician_first_name, clinician_last_name, clinician_professional_name, clinician_type, clinician_bio, clinician_licensed_states, clinician_min_client_age, clinician_image_url')
          .or('clinician_status.eq.Active,clinician_status.eq.active,clinician_status.ilike.active'),
        timeoutPromise
      ]);
      
      const strategyDuration = Date.now() - strategyStartTime;
      
      therapistData = result.data || [];
      fetchError = result.error;
      
      logWithStack('Strategy 1 result', { 
        success: !result.error,
        error: result.error,
        resultCount: therapistData.length,
        duration: `${strategyDuration}ms`
      });
      
      // If Strategy 1 fails, try Strategy 2
      if (fetchError || therapistData.length === 0) {
        logWithStack('Strategy 1 failed or returned no results. Trying Strategy 2...', {
          error: fetchError,
          resultCount: therapistData.length
        }, true);
        
        // Strategy 2: Try without status filter (in case the enum is causing issues)
        const strategy2StartTime = Date.now();
        const noStatusResult = await Promise.race([
          supabase
            .from('clinicians')
            .select('id, clinician_first_name, clinician_last_name, clinician_professional_name, clinician_type, clinician_bio, clinician_licensed_states, clinician_min_client_age, clinician_image_url'),
          timeoutPromise
        ]);
        
        const strategy2Duration = Date.now() - strategy2StartTime;
        
        if (!noStatusResult.error && noStatusResult.data && noStatusResult.data.length > 0) {
          logWithStack('Strategy 2 succeeded (no status filter)', {
            rawResultCount: noStatusResult.data.length,
            duration: `${strategy2Duration}ms`
          });
          
          // Filter active status in-memory with case-insensitive comparison
          therapistData = noStatusResult.data.filter(t => {
            if (!t) return false;
            
            // Case-insensitive check for 'Active' or 'active'
            const status = ((t as any).clinician_status || '').toLowerCase();
            return status === 'active';
          });
          
          if (therapistData.length > 0) {
            logWithStack(`Found ${therapistData.length} active therapists after in-memory filtering`, {
              beforeFiltering: noStatusResult.data.length,
              afterFiltering: therapistData.length
            });
            fetchError = null;
          } else {
            logWithStack('No active therapists found after in-memory filtering', {
              totalTherapists: noStatusResult.data.length
            }, true);
            fetchError = { message: 'No active therapists found' };
          }
        } else {
          logWithStack('Strategy 2 also failed', {
            error: noStatusResult.error,
            duration: `${strategy2Duration}ms`
          }, true);
          fetchError = noStatusResult.error || { message: 'No therapists found' };
        }
      }
      
      // Process the data - map fields if needed
      if (therapistData.length > 0) {
        // Check if we need to map clinician_title to clinician_type
        const needsFieldMapping = therapistData[0] && 
          (therapistData[0] as any).clinician_title !== undefined && 
          therapistData[0].clinician_type === undefined;
        
        if (needsFieldMapping) {
          logWithStack('Mapping clinician_title to clinician_type');
          therapistData = therapistData.map(t => {
            const therapist = { ...t };
            therapist.clinician_type = (t as any).clinician_title;
            return therapist;
          });
        }
        
        // Map clinician_image_url to clinician_profile_image for backward compatibility
        therapistData = therapistData.map(t => {
          const therapist = { ...t };
          therapist.clinician_profile_image = t.clinician_image_url;
          return therapist;
        });
        
        logWithStack('Loaded therapists', {
          count: therapistData.length,
          totalDuration: `${Date.now() - operationStartTimeRef.current}ms`
        });
        
        // Snapshot of first therapist for debugging
        if (therapistData.length > 0) {
          logWithStack('First therapist data sample', {
            id: therapistData[0].id,
            name: therapistData[0].clinician_professional_name,
            licensedStates: therapistData[0].clinician_licensed_states
          });
        }
        
        // Reset retry count on success
        retryCountRef.current = 0;
        
        // Store all therapists for reference
        setAllTherapists(therapistData);
        
        // Apply filtering if enabled
        if (enableFiltering && (clientState || clientAge > 0)) {
          const filtered = filterTherapists(therapistData, clientState, clientAge);
          logWithStack(`Filtering applied`, {
            before: therapistData.length,
            after: filtered.length,
            clientState,
            clientAge
          });
          setTherapists(filtered);
          setFilteringApplied(true);
        } else {
          logWithStack('No filtering applied, showing all therapists');
          setTherapists(therapistData);
          setFilteringApplied(false);
        }
        
        setErrorMessage(null);
        
        // Close the circuit breaker on successful fetch
        manualResetCircuitBreaker('successful-data-fetch');
      } else if (fetchError) {
        logWithStack('All fetch strategies failed', { 
          error: fetchError,
          errorMessage: fetchError.message || 'Unknown error',
          totalDuration: `${Date.now() - operationStartTimeRef.current}ms`
        }, true);
        
        setErrorMessage(`Error loading therapists: ${fetchError.message || 'Unknown error'}`);
        setTherapists([]);
        setAllTherapists([]);
        
        toast({
          title: "Error Loading Therapists",
          description: `Database error: ${fetchError.message || 'Unknown error'}. Please try again.`,
          variant: "destructive"
        });
      } else {
        logWithStack('No therapists found, but no error either', null, true);
        setTherapists([]);
        setAllTherapists([]);
        // Reset retry count since this is a valid empty result
        retryCountRef.current = 0;
      }
    } catch (error: any) {
      const totalDuration = Date.now() - operationStartTimeRef.current;
      logWithStack('Unexpected error during fetch', { 
        error,
        errorMessage: error.message || 'Unknown error',
        errorType: error.name,
        totalDuration: `${totalDuration}ms`
      }, true);
      
      // Check if this was an abort error (user navigated away)
      if (error.name === 'AbortError') {
        logWithStack('Request was aborted');
        // Don't update state for aborted requests
        return;
      }
      
      setErrorMessage(`Unexpected error: ${error.message || 'Unknown error'}`);
      setTherapists([]);
      setAllTherapists([]);
      
      toast({
        title: "Error Loading Therapists",
        description: error.message || 'An unexpected error occurred. Please try again later.',
        variant: "destructive"
      });
    } finally {
      // Only set loading to false if the component is still mounted
      if (mountedRef.current && !abortControllerRef.current?.signal.aborted) {
        const totalDuration = Date.now() - operationStartTimeRef.current;
        logWithStack('Fetch completed', { 
          loading: false,
          totalDuration: `${totalDuration}ms`,
          therapistCount: therapistData.length,
          hasError: !!fetchError
        });
        
        setLoading(false);
        setAttemptCount(prev => prev + 1);
      }
    }
  }, [clientState, clientAge, enableFiltering, resetCircuitBreaker, circuitOpen, toast, manualResetCircuitBreaker]);
  
  // Filter therapists based on client state and age
  const filterTherapists = (therapistList: Therapist[], state: string | null, age: number): Therapist[] => {
    const startTime = Date.now();
    
    // Add defensive check for null therapist list
    if (!therapistList || therapistList.length === 0) {
      logWithStack('filterTherapists: Empty or null therapist list');
      return [];
    }
    
    logWithStack('filterTherapists: Starting filter operation', {
      therapistCount: therapistList.length,
      clientState: state,
      clientAge: age
    });
    
    const filteredList = therapistList.filter(therapist => {
      // Skip null therapist entries
      if (!therapist) return false;
      
      let matchesState = !state; // If client has no state, don't filter by state
      let matchesAge = true;
      
      // State Matching Logic
      if (state && therapist.clinician_licensed_states && therapist.clinician_licensed_states.length > 0) {
        const clientStateNormalized = state.toLowerCase().trim();
        
        matchesState = therapist.clinician_licensed_states.some(s => {
          if (!s) return false;
          const stateNormalized = s.toLowerCase().trim();
          const matches = stateNormalized.includes(clientStateNormalized) || clientStateNormalized.includes(stateNormalized);
          return matches;
        });
        
        if (!matchesState) {
          logWithStack(`Therapist ${therapist.id} licensed states don't match client state`, {
            clientState: state,
            therapistStates: therapist.clinician_licensed_states,
            therapistName: therapist.clinician_professional_name || `${therapist.clinician_first_name} ${therapist.clinician_last_name}`
          });
        }
      } else if (state && (!therapist.clinician_licensed_states || therapist.clinician_licensed_states.length === 0)) {
        logWithStack(`Therapist ${therapist.id} has no licensed states but client state is ${state}`);
        matchesState = false;
      }
      
      // Age Matching Logic
      if (age > 0 && therapist.clinician_min_client_age !== null) {
        matchesAge = age >= therapist.clinician_min_client_age;
        if (!matchesAge) {
          logWithStack(`Therapist ${therapist.id} requires min age ${therapist.clinician_min_client_age} but client age is ${age}`);
        }
      }
      
      return matchesState && matchesAge;
    });
    
    const duration = Date.now() - startTime;
    logWithStack('filterTherapists: Filter operation completed', {
      beforeCount: therapistList.length,
      afterCount: filteredList.length,
      duration: `${duration}ms`
    });
    
    return filteredList;
  };
  
  // Retry fetch function - increments attempt count to trigger the useEffect
  const retryFetch = useCallback(() => {
    logWithStack('Manual retry triggered', null, true);
    // Reset circuit breaker on manual retry
    manualResetCircuitBreaker('manual-retry');
    setAttemptCount(prev => prev + 1);
  }, [manualResetCircuitBreaker]);
  
  // Select therapist function
  const selectTherapist = useCallback(async (therapistId: string): Promise<boolean> => {
    const startTime = Date.now();
    try {
      setSelectingTherapistId(therapistId);
      logWithStack(`Selecting therapist with ID: ${therapistId}`);
      
      // Find the selected therapist to log details
      const selectedTherapist = therapists.find(t => t.id === therapistId);
      logWithStack('Selected therapist details', selectedTherapist);
      
      const userId = await getUserId();
      if (!userId) {
        logWithStack('Cannot select therapist - no authenticated user ID found', null, true);
        toast({
          title: "Authentication Required",
          description: "Please log in to select a therapist.",
          variant: "destructive"
        });
        return false;
      }
      
      logWithStack(`Updating client record for user ID: ${userId}`);
      
      // Check network connectivity before operation
      const isConnected = await checkNetworkConnectivity();
      if (!isConnected) {
        logWithStack('Network offline during therapist selection', null, true);
        toast({
          title: "Network Error",
          description: "You appear to be offline. Please check your internet connection and try again.",
          variant: "destructive"
        });
        return false;
      }
      
      // Create timeout for this operation
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 8000);
      
      const updateStartTime = Date.now();
      const { error } = await Promise.race([
        supabase
          .from('clients')
          .update({
            client_assigned_therapist: therapistId,
            client_status: 'Therapist Selected'
          })
          .eq('id', userId),
        new Promise<{error: {message: string}}>((_, reject) => {
          setTimeout(() => reject({
            error: {message: 'Update operation timed out. Please try again.'}
          }), 8000);
        })
      ]);
      
      clearTimeout(timeoutId);
      const updateDuration = Date.now() - updateStartTime;
        
      if (error) {
        logWithStack("Error selecting therapist", { 
          error, 
          duration: `${updateDuration}ms`
        }, true);
        
        toast({
          title: "Error",
          description: "Failed to select therapist. Please try again.",
          variant: "destructive"
        });
        return false;
      }
      
      // Find the therapist object safely
      const therapist = therapists.find(t => t && t.id === therapistId);
      
      // Handle display name with null safety
      let displayName = 'the selected therapist';
      if (therapist) {
        if (therapist.clinician_professional_name) {
          displayName = therapist.clinician_professional_name;
        } else {
          const firstName = therapist.clinician_first_name || '';
          const lastName = therapist.clinician_last_name || '';
          const fullName = `${firstName} ${lastName}`.trim();
          if (fullName) displayName = fullName;
        }
      }
      
      logWithStack(`Therapist selection successful`, { 
        therapistId, 
        therapistName: displayName,
        totalDuration: `${Date.now() - startTime}ms`
      });
        
      toast({
        title: "Therapist Selected!",
        description: `You have selected ${displayName}.`,
      });
      
      // Clean up circuit breaker on successful selection
      manualResetCircuitBreaker('successful-therapist-selection');
      
      return true;
    } catch (error: any) {
      logWithStack("Exception in selectTherapist", { 
        error, 
        duration: `${Date.now() - startTime}ms`
      }, true);
      
      toast({
        title: "Error",
        description: error.message || "An unexpected error occurred.",
        variant: "destructive"
      });
      return false;
    } finally {
      setSelectingTherapistId(null);
    }
  }, [therapists, toast, checkNetworkConnectivity, manualResetCircuitBreaker]);
  
  // Helper function to get the authenticated user ID
  const getUserId = async (): Promise<string | null> => {
    try {
      const startTime = Date.now();
      const { data: { user } } = await supabase.auth.getUser();
      logWithStack("getUser completed", { 
        userId: user?.id || null, 
        duration: `${Date.now() - startTime}ms`
      });
      return user?.id || null;
    } catch (error) {
      logWithStack("Error getting authenticated user", { error }, true);
      return null;
    }
  };
  
  // Set the mountedRef to false when component unmounts
  useEffect(() => {
    mountedRef.current = true;
    // Reset circuit breaker on component mount
    manualResetCircuitBreaker('component-mount');
    
    return () => {
      logWithStack(`Component unmounting (${instanceIdRef.current}), cleaning up resources`, null, true);
      mountedRef.current = false;
      
      // Abort any in-flight requests when component unmounts
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      
      // Clear any circuit breaker timers
      if (circuitResetTimerRef.current) {
        window.clearTimeout(circuitResetTimerRef.current);
        circuitResetTimerRef.current = null;
      }
      
      // Perform circuit breaker cleanup on successful operation or component unmount
      try {
        const storedState = sessionStorage.getItem(CIRCUIT_BREAKER_STORAGE_KEY);
        const reason = sessionStorage.getItem(`${CIRCUIT_BREAKER_STORAGE_KEY}_reason`);
        const timestamp = sessionStorage.getItem(`${CIRCUIT_BREAKER_STORAGE_KEY}_timestamp`);
        
        logWithStack('Component unmount circuit breaker cleanup check', {
          storedState,
          timestamp: timestamp ? new Date(parseInt(timestamp)).toISOString() : null,
          reason,
          therapistCount: therapists.length
        });
        
        if (!storedState || therapists.length > 0) {
          // If we have successful data or no circuit breaker state, clean up
          sessionStorage.removeItem(CIRCUIT_BREAKER_STORAGE_KEY);
          sessionStorage.removeItem(`${CIRCUIT_BREAKER_STORAGE_KEY}_timestamp`);
          sessionStorage.removeItem(`${CIRCUIT_BREAKER_STORAGE_KEY}_reason`);
          
          // Dispatch cleanup event for other components
          window.dispatchEvent(
            new CustomEvent(CIRCUIT_BREAKER_CLEANUP_EVENT, {
              detail: {
                source: 'useTherapistSelection-unmount',
                timestamp: Date.now()
              }
            })
          );
          logWithStack('Dispatched circuit breaker cleanup event on successful unmount');
        }
      } catch (err) {
        logWithStack('Error during unmount cleanup', { error: err }, true);
      }
    };
  }, [manualResetCircuitBreaker, therapists.length]);
  
  // Fetch therapists when component mounts or when deps change
  useEffect(() => {
    logWithStack('useEffect triggered - calling fetchTherapists()');
    
    if (mountedRef.current) {
      fetchTherapists();
    }
  }, [fetchTherapists, attemptCount]);
  
  return {
    therapists,
    allTherapists,
    loading,
    error: errorMessage,
    filteringApplied,
    retryFetch,
    selectTherapist,
    selectingTherapistId
  };
};
