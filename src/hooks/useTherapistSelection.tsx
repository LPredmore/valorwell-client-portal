import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { ClinicianQueryDebugger } from '@/debug/clinicianQueryDebugger';
import { useToast } from '@/hooks/use-toast';
import { ClientDetails } from '@/types/client';
import { toast } from 'sonner';

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
  
  // Log initial hook parameters for debugging
  console.log(`[useTherapistSelection] Hook initialized with clientState: ${clientState}, clientAge: ${clientAge}, enableFiltering: ${enableFiltering}`);
  
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
      return response.ok;
    } catch (error) {
      console.log('[useTherapistSelection] Network connectivity check failed:', error);
      return false;
    }
  };
  
  // Reset circuit breaker after cooldown period
  const resetCircuitBreaker = useCallback(() => {
    if (circuitResetTimerRef.current) {
      window.clearTimeout(circuitResetTimerRef.current);
    }
    
    // Reset after 30 seconds
    circuitResetTimerRef.current = window.setTimeout(() => {
      console.log('[useTherapistSelection] Circuit breaker reset');
      setCircuitOpen(false);
      retryCountRef.current = 0;
    }, 30000);
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
      setErrorMessage('Too many failed attempts. Please try again later.');
      setLoading(false);
      return;
    }
    
    // Check retry count
    if (retryCountRef.current >= MAX_RETRY_ATTEMPTS) {
      console.log(`[useTherapistSelection] Maximum retry attempts (${MAX_RETRY_ATTEMPTS}) reached`);
      setCircuitOpen(true);
      resetCircuitBreaker();
      setErrorMessage('Maximum retry attempts reached. Please try again later.');
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
    }
    
    // Check network connectivity before making request
    const isConnected = await checkNetworkConnectivity();
    if (!isConnected) {
      console.log('[useTherapistSelection] Network connectivity check failed');
      setErrorMessage('Network connectivity issue. Please check your internet connection.');
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
      // Strategy 1: Use the debug wrapper with the normal query
      console.log('[useTherapistSelection] Strategy 1: Using debug wrapper with normal query');
      
      // Race between the actual query and the timeout
      const result = await Promise.race([
        ClinicianQueryDebugger.debugQuery<Therapist>(
          'clinicians',
          (query) => query
            .select('id, clinician_first_name, clinician_last_name, clinician_professional_name, clinician_type, clinician_bio, clinician_licensed_states, clinician_min_client_age, clinician_image_url')
            .eq('clinician_status', 'Active')
        ),
        timeoutPromise
      ]);
      
      therapistData = result.data || [];
      fetchError = result.error;
      
      // If Strategy 1 fails with a specific error about clinician_title, try Strategy 2
      if (fetchError && fetchError.message && fetchError.message.includes('clinician_title')) {
        console.log('[useTherapistSelection] Strategy 1 failed with clinician_title error. Trying Strategy 2...');
        
        // Strategy 2: Use the compatibility view
        const compatResult = await Promise.race([
          ClinicianQueryDebugger.debugQuery<Therapist>(
            'clinicians_compatibility_view',
            (query) => query
              .select('id, clinician_first_name, clinician_last_name, clinician_professional_name, clinician_type, clinician_bio, clinician_licensed_states, clinician_min_client_age, clinician_image_url')
              .eq('clinician_status', 'Active')
          ),
          timeoutPromise
        ]);
        
        if (!compatResult.error) {
          console.log('[useTherapistSelection] Strategy 2 succeeded using compatibility view');
          therapistData = compatResult.data || [];
          fetchError = null;
        } else {
          console.log('[useTherapistSelection] Strategy 2 also failed. Trying Strategy 3...');
          
          // Strategy 3: Try without status filter (in case the enum is causing issues)
          const noStatusResult = await Promise.race([
            ClinicianQueryDebugger.debugQuery<Therapist>(
              'clinicians',
              (query) => query
                .select('id, clinician_first_name, clinician_last_name, clinician_professional_name, clinician_type, clinician_bio, clinician_licensed_states, clinician_min_client_age, clinician_image_url')
            ),
            timeoutPromise
          ]);
          
          if (!noStatusResult.error) {
            console.log('[useTherapistSelection] Strategy 3 succeeded (no status filter)');
            // Filter active status in-memory since we couldn't do it in the query
            therapistData = (noStatusResult.data || [])
              .filter(t => t && (t as any).clinician_status === 'Active');
            fetchError = null;
          } else {
            console.log('[useTherapistSelection] Strategy 3 also failed. Trying Strategy 4 (direct query)...');
            
            // Strategy 4: Direct query as a last resort
            const directResult = await Promise.race([
              supabase
                .from('clinicians')
                .select('id, clinician_first_name, clinician_last_name, clinician_professional_name, clinician_type, clinician_bio, clinician_licensed_states, clinician_min_client_age, clinician_image_url'),
              timeoutPromise
            ]);
            
            if (!directResult.error) {
              console.log('[useTherapistSelection] Strategy 4 succeeded (direct query)');
              therapistData = directResult.data || [];
              fetchError = null;
            } else {
              fetchError = directResult.error;
            }
          }
        }
      }
      
      // Process the data - map fields if needed
      if (therapistData.length > 0) {
        // Check if we need to map clinician_title to clinician_type
        const needsFieldMapping = therapistData[0] && (therapistData[0] as any).clinician_title !== undefined && therapistData[0].clinician_type === undefined;
        
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
      if (!abortControllerRef.current?.signal.aborted) {
        setLoading(false);
        setAttemptCount(prev => prev + 1);
        console.log('[useTherapistSelection] Fetch completed, loading set to false');
      }
    }
  }, [clientState, clientAge, enableFiltering, resetCircuitBreaker, circuitOpen, toast]);
  
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
    setCircuitOpen(false);
    retryCountRef.current = 0;
    setAttemptCount(prev => prev + 1);
  }, []);
  
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
  }, [therapists, toast]);
  
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
  
  // Cleanup function to abort in-flight requests and clear timers
  useEffect(() => {
    return () => {
      // Abort any in-flight requests when component unmounts
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      
      // Clear any circuit breaker timers
      if (circuitResetTimerRef.current) {
        window.clearTimeout(circuitResetTimerRef.current);
      }
    };
  }, []);
  
  // Fetch therapists when component mounts or when deps change
  useEffect(() => {
    console.log('[useTherapistSelection] useEffect triggered - calling fetchTherapists()');
    fetchTherapists();
  }, [fetchTherapists]);
  
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
