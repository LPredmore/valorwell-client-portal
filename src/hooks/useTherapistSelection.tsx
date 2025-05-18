
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
  
  // Log initial hook parameters for debugging
  console.log(`[useTherapistSelection] Hook initialized with clientState: ${clientState}, clientAge: ${clientAge}, enableFiltering: ${enableFiltering}`);
  
  // Handle circuit breaker events from TherapistSelectionDebugger
  useEffect(() => {
    // Handler for reset events
    const handleCircuitBreakerReset = () => {
      console.log('[useTherapistSelection] Received circuit breaker reset event');
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
    const handleCircuitBreakerOpen = () => {
      console.log('[useTherapistSelection] Received circuit breaker open event');
      if (mountedRef.current) {
        setCircuitOpen(true);
        resetCircuitBreaker(); // Start the reset timer
      }
    };
    
    // Add event listeners for circuit breaker events
    window.addEventListener(CIRCUIT_BREAKER_RESET_EVENT, handleCircuitBreakerReset);
    window.addEventListener(CIRCUIT_BREAKER_OPEN_EVENT, handleCircuitBreakerOpen);
    
    return () => {
      // Remove event listeners when component unmounts
      window.removeEventListener(CIRCUIT_BREAKER_RESET_EVENT, handleCircuitBreakerReset);
      window.removeEventListener(CIRCUIT_BREAKER_OPEN_EVENT, handleCircuitBreakerOpen);
    };
  }, []);
  
  // Get circuit breaker state from storage on mount
  useEffect(() => {
    try {
      const storedState = sessionStorage.getItem(CIRCUIT_BREAKER_STORAGE_KEY);
      if (storedState === 'open') {
        console.log('[useTherapistSelection] Loading circuit breaker state from storage: open');
        setCircuitOpen(true);
        
        // Start reset timer
        resetCircuitBreaker();
      } else {
        // Reset circuit breaker on fresh component mount
        console.log('[useTherapistSelection] Resetting circuit breaker state on component mount');
        setCircuitOpen(false);
        
        // Ensure storage is clear
        sessionStorage.removeItem(CIRCUIT_BREAKER_STORAGE_KEY);
        
        // Reset retry count
        retryCountRef.current = 0;
      }
    } catch (err) {
      // If storage access fails, just reset the circuit breaker
      setCircuitOpen(false);
      retryCountRef.current = 0;
    }
    
    // Check if the debugger has any circuit breaker state
    const debuggerCircuitState = TherapistSelectionDebugger.getCircuitBreakerState();
    if (debuggerCircuitState === 'open') {
      console.warn('[useTherapistSelection] Debugger reported circuit breaker in open state');
      setCircuitOpen(true);
      resetCircuitBreaker(); // Start reset timer
    }
  }, []);
  
  // Persist circuit breaker state to storage when it changes
  useEffect(() => {
    try {
      if (circuitOpen) {
        console.log('[useTherapistSelection] Saving circuit breaker state to storage: open');
        sessionStorage.setItem(CIRCUIT_BREAKER_STORAGE_KEY, 'open');
      } else {
        console.log('[useTherapistSelection] Removing circuit breaker state from storage');
        sessionStorage.removeItem(CIRCUIT_BREAKER_STORAGE_KEY);
      }
    } catch (err) {
      console.error('[useTherapistSelection] Error handling circuit breaker storage:', err);
    }
  }, [circuitOpen]);
  
  // Check if network is connected
  const checkNetworkConnectivity = async (): Promise<boolean> => {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);
      
      const response = await fetch(NETWORK_CHECK_URL, { 
        method: 'HEAD',
        mode: 'no-cors',
        signal: controller.signal 
      });
      
      clearTimeout(timeoutId);
      console.log('[useTherapistSelection] Network connectivity check:', response.ok ? 'Online' : 'Offline');
      return true; // If we get here, network is connected (even if response is not ok due to CORS)
    } catch (error) {
      console.log('[useTherapistSelection] Network connectivity check failed:', error);
      return navigator.onLine; // Fallback to navigator.onLine
    }
  };
  
  // Reset circuit breaker after cooldown period
  const resetCircuitBreaker = useCallback(() => {
    if (circuitResetTimerRef.current) {
      window.clearTimeout(circuitResetTimerRef.current);
    }
    
    console.log('[useTherapistSelection] Setting circuit breaker reset timer');
    // Reset after defined reset time
    circuitResetTimerRef.current = window.setTimeout(() => {
      if (mountedRef.current) {
        console.log('[useTherapistSelection] Circuit breaker auto-reset after timeout');
        setCircuitOpen(false);
        retryCountRef.current = 0;
        try {
          sessionStorage.removeItem(CIRCUIT_BREAKER_STORAGE_KEY);
          
          // Notify TherapistSelectionDebugger of reset
          TherapistSelectionDebugger.resetCircuitBreaker();
        } catch (err) {
          console.error('[useTherapistSelection] Error during circuit breaker reset:', err);
        }
      }
    }, CIRCUIT_BREAKER_RESET_TIME);
  }, []);

  // Function to manually reset the circuit breaker
  const manualResetCircuitBreaker = useCallback(() => {
    console.log('[useTherapistSelection] Manual circuit breaker reset');
    setCircuitOpen(false);
    retryCountRef.current = 0;
    
    // Also reset the debugger circuit breaker
    TherapistSelectionDebugger.resetCircuitBreaker();
    
    try {
      sessionStorage.removeItem(CIRCUIT_BREAKER_STORAGE_KEY);
    } catch (err) {
      console.error('[useTherapistSelection] Error removing circuit breaker from storage:', err);
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
      console.log('[useTherapistSelection] Circuit breaker is open, not attempting fetch');
      setErrorMessage('Too many failed attempts. Please try again by clicking the refresh button.');
      setLoading(false);
      return;
    }
    
    // Check retry count
    if (retryCountRef.current >= MAX_RETRY_ATTEMPTS) {
      console.log(`[useTherapistSelection] Maximum retry attempts (${MAX_RETRY_ATTEMPTS}) reached`);
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
    
    console.log(`[useTherapistSelection] Fetching therapists (attempt ${retryCountRef.current}/${MAX_RETRY_ATTEMPTS}), backoff: ${backoffDelay}ms`);
    
    // Apply backoff delay if this is a retry
    if (backoffDelay > 0) {
      await new Promise(resolve => setTimeout(resolve, backoffDelay));
      
      // Check if component is still mounted after the delay
      if (!mountedRef.current) {
        console.log('[useTherapistSelection] Component unmounted during backoff, aborting fetch');
        return;
      }
    }
    
    // Check network connectivity before making request
    const isConnected = await checkNetworkConnectivity();
    if (!isConnected) {
      console.log('[useTherapistSelection] Network connectivity check failed');
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
      console.log('[useTherapistSelection] Strategy 1: Using case-insensitive query for clinician_status');
      
      // Race between the actual query and the timeout
      const result = await Promise.race([
        supabase
          .from('clinicians')
          .select('id, clinician_first_name, clinician_last_name, clinician_professional_name, clinician_type, clinician_bio, clinician_licensed_states, clinician_min_client_age, clinician_image_url')
          .or('clinician_status.eq.Active,clinician_status.eq.active,clinician_status.ilike.active'),
        timeoutPromise
      ]);
      
      therapistData = result.data || [];
      fetchError = result.error;
      
      // If Strategy 1 fails, try Strategy 2
      if (fetchError || therapistData.length === 0) {
        console.log('[useTherapistSelection] Strategy 1 failed or returned no results. Trying Strategy 2...');
        
        // Strategy 2: Try without status filter (in case the enum is causing issues)
        const noStatusResult = await Promise.race([
          supabase
            .from('clinicians')
            .select('id, clinician_first_name, clinician_last_name, clinician_professional_name, clinician_type, clinician_bio, clinician_licensed_states, clinician_min_client_age, clinician_image_url'),
          timeoutPromise
        ]);
        
        if (!noStatusResult.error && noStatusResult.data && noStatusResult.data.length > 0) {
          console.log('[useTherapistSelection] Strategy 2 succeeded (no status filter)');
          
          // Filter active status in-memory with case-insensitive comparison
          therapistData = noStatusResult.data.filter(t => {
            if (!t) return false;
            
            // Case-insensitive check for 'Active' or 'active'
            const status = ((t as any).clinician_status || '').toLowerCase();
            return status === 'active';
          });
          
          if (therapistData.length > 0) {
            console.log(`[useTherapistSelection] Found ${therapistData.length} active therapists after in-memory filtering`);
            fetchError = null;
          } else {
            console.log('[useTherapistSelection] No active therapists found after in-memory filtering');
            fetchError = { message: 'No active therapists found' };
          }
        } else {
          console.log('[useTherapistSelection] Strategy 2 also failed. Error:', noStatusResult.error);
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
          console.log('[useTherapistSelection] Mapping clinician_title to clinician_type');
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
        
        console.log('[useTherapistSelection] Loaded', therapistData.length, 'therapists');
        
        // Reset retry count on success
        retryCountRef.current = 0;
        
        // Store all therapists for reference
        setAllTherapists(therapistData);
        
        // Apply filtering if enabled
        if (enableFiltering && (clientState || clientAge > 0)) {
          const filtered = filterTherapists(therapistData, clientState, clientAge);
          console.log(`[useTherapistSelection] Filtering applied: ${filtered.length} therapists match criteria (from ${therapistData.length} total)`);
          setTherapists(filtered);
          setFilteringApplied(true);
        } else {
          console.log('[useTherapistSelection] No filtering applied, showing all therapists');
          setTherapists(therapistData);
          setFilteringApplied(false);
        }
        
        setErrorMessage(null);
        
        // Close the circuit breaker on successful fetch
        manualResetCircuitBreaker();
      } else if (fetchError) {
        console.error('[useTherapistSelection] All fetch strategies failed:', fetchError);
        setErrorMessage(`Error loading therapists: ${fetchError.message || 'Unknown error'}`);
        setTherapists([]);
        setAllTherapists([]);
        
        toast({
          title: "Error Loading Therapists",
          description: `Database error: ${fetchError.message || 'Unknown error'}. Please try again.`,
          variant: "destructive"
        });
      } else {
        console.log('[useTherapistSelection] No therapists found, but no error either');
        setTherapists([]);
        setAllTherapists([]);
        // Reset retry count since this is a valid empty result
        retryCountRef.current = 0;
      }
    } catch (error: any) {
      console.error('[useTherapistSelection] Unexpected error:', error);
      
      // Check if this was an abort error (user navigated away)
      if (error.name === 'AbortError') {
        console.log('[useTherapistSelection] Request was aborted');
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
        setLoading(false);
        setAttemptCount(prev => prev + 1);
        console.log('[useTherapistSelection] Fetch completed, loading set to false');
      }
    }
  }, [clientState, clientAge, enableFiltering, resetCircuitBreaker, circuitOpen, toast, manualResetCircuitBreaker]);
  
  // Filter therapists based on client state and age
  const filterTherapists = (therapistList: Therapist[], state: string | null, age: number): Therapist[] => {
    // Add defensive check for null therapist list
    if (!therapistList || therapistList.length === 0) {
      console.log('[useTherapistSelection] filterTherapists: Empty or null therapist list');
      return [];
    }
    
    console.log('[useTherapistSelection] filterTherapists: Starting with', therapistList.length, 'therapists');
    console.log('[useTherapistSelection] filterTherapists: Filtering by state:', state, 'and age:', age);
    
    const filteredList = therapistList.filter(therapist => {
      // Skip null therapist entries
      if (!therapist) return false;
      
      let matchesState = !state; // If client has no state, don't filter by state
      let matchesAge = true;
      
      // State Matching Logic
      if (state && therapist.clinician_licensed_states && therapist.clinician_licensed_states.length > 0) {
        const clientStateNormalized = state.toLowerCase().trim();
        console.log(`[useTherapistSelection] Checking therapist ${therapist.id} licensed states:`, therapist.clinician_licensed_states);
        
        matchesState = therapist.clinician_licensed_states.some(s => {
          if (!s) return false;
          const stateNormalized = s.toLowerCase().trim();
          const matches = stateNormalized.includes(clientStateNormalized) || clientStateNormalized.includes(stateNormalized);
          if (matches) {
            console.log(`[useTherapistSelection] Therapist ${therapist.id} matches state ${state} with licensed state ${s}`);
          }
          return matches;
        });
      } else if (state && (!therapist.clinician_licensed_states || therapist.clinician_licensed_states.length === 0)) {
        console.log(`[useTherapistSelection] Therapist ${therapist.id} has no licensed states but client state is ${state}`);
        matchesState = false;
      }
      
      // Age Matching Logic
      if (age > 0 && therapist.clinician_min_client_age !== null) {
        matchesAge = age >= therapist.clinician_min_client_age;
        if (!matchesAge) {
          console.log(`[useTherapistSelection] Therapist ${therapist.id} requires min age ${therapist.clinician_min_client_age} but client age is ${age}`);
        }
      }
      
      const isMatch = matchesState && matchesAge;
      if (!isMatch) {
        console.log(`[useTherapistSelection] Therapist ${therapist.id} filtered out: matchesState=${matchesState}, matchesAge=${matchesAge}`);
      }
      
      return isMatch;
    });
    
    console.log('[useTherapistSelection] filterTherapists: Filtered to', filteredList.length, 'therapists');
    return filteredList;
  };
  
  // Retry fetch function - increments attempt count to trigger the useEffect
  const retryFetch = useCallback(() => {
    console.log('[useTherapistSelection] Manual retry triggered');
    // Reset circuit breaker on manual retry
    manualResetCircuitBreaker();
    setAttemptCount(prev => prev + 1);
  }, [manualResetCircuitBreaker]);
  
  // Select therapist function
  const selectTherapist = useCallback(async (therapistId: string): Promise<boolean> => {
    try {
      setSelectingTherapistId(therapistId);
      console.log(`[useTherapistSelection] Selecting therapist with ID: ${therapistId}`);
      
      // Find the selected therapist to log details
      const selectedTherapist = therapists.find(t => t.id === therapistId);
      console.log('[useTherapistSelection] Selected therapist details:', selectedTherapist);
      
      const userId = await getUserId();
      if (!userId) {
        console.error('[useTherapistSelection] Cannot select therapist - no authenticated user ID found');
        toast({
          title: "Authentication Required",
          description: "Please log in to select a therapist.",
          variant: "destructive"
        });
        return false;
      }
      
      console.log(`[useTherapistSelection] Updating client record for user ID: ${userId}`);
      
      // Check network connectivity before operation
      const isConnected = await checkNetworkConnectivity();
      if (!isConnected) {
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
        
      if (error) {
        console.error("[useTherapistSelection] Error selecting therapist:", error);
        toast({
          title: "Error",
          description: "Failed to select therapist. Please try again.",
          variant: "destructive"
        });
        return false;
      }
      
      // Find the therapist object safely
      const therapist = therapists.find(t => t && t.id === therapistId);
      console.log(`[useTherapistSelection] Therapist selected:`, therapist);
      
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
        
      toast({
        title: "Therapist Selected!",
        description: `You have selected ${displayName}.`,
      });
      
      console.log(`[useTherapistSelection] Selection successful for ${displayName}`);
      return true;
    } catch (error: any) {
      console.error("Exception in selectTherapist:", error);
      toast({
        title: "Error",
        description: error.message || "An unexpected error occurred.",
        variant: "destructive"
      });
      return false;
    } finally {
      setSelectingTherapistId(null);
    }
  }, [therapists, toast, checkNetworkConnectivity]);
  
  // Helper function to get the authenticated user ID
  const getUserId = async (): Promise<string | null> => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      return user?.id || null;
    } catch (error) {
      console.error("Error getting authenticated user:", error);
      return null;
    }
  };
  
  // Set the mountedRef to false when component unmounts
  useEffect(() => {
    mountedRef.current = true;
    // Reset circuit breaker on component mount
    manualResetCircuitBreaker();
    
    return () => {
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
      
      console.log('[useTherapistSelection] Component unmounted, cleaned up resources');
    };
  }, [manualResetCircuitBreaker]);
  
  // Fetch therapists when component mounts or when deps change
  useEffect(() => {
    console.log('[useTherapistSelection] useEffect triggered - calling fetchTherapists()');
    
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
