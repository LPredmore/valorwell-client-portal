import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { ClinicianQueryDebugger } from '@/debug/clinicianQueryDebugger';
import { useToast } from '@/hooks/use-toast';
import { ClientDetails } from '@/types/client';

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

/**
 * A specialized hook for loading therapist data with enhanced error recovery
 * to handle the clinician_title/clinician_type schema mismatch issue
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
  
  // Log initial hook parameters for debugging
  console.log(`[useTherapistSelection] Hook initialized with clientState: ${clientState}, clientAge: ${clientAge}, enableFiltering: ${enableFiltering}`);
  
  // Function to fetch therapists with multi-layered fallback strategies
  const fetchTherapists = useCallback(async () => {
    setLoading(true);
    setErrorMessage(null);
    setFilteringApplied(false);
    
    console.log(`[useTherapistSelection] Fetching therapists (attempt ${attemptCount + 1})`);
    let therapistData: Therapist[] = [];
    let fetchError: any = null;
    
    try {
      // Strategy 1: Use the debug wrapper with the normal query - FIXED: removed clinician_profile_image
      console.log('[useTherapistSelection] Strategy 1: Using debug wrapper with normal query');
      const result = await ClinicianQueryDebugger.debugQuery<Therapist>(
        'clinicians',
        (query) => query
          .select('id, clinician_first_name, clinician_last_name, clinician_professional_name, clinician_type, clinician_bio, clinician_licensed_states, clinician_min_client_age, clinician_image_url')
          .eq('clinician_status', 'Active')
      );
      
      therapistData = result.data || [];
      fetchError = result.error;
      
      // If Strategy 1 fails with a specific error about clinician_title, try Strategy 2
      if (fetchError && fetchError.message && fetchError.message.includes('clinician_title')) {
        console.log('[useTherapistSelection] Strategy 1 failed with clinician_title error. Trying Strategy 2...');
        
        // Strategy 2: Use the compatibility view - FIXED: removed clinician_profile_image
        const compatResult = await ClinicianQueryDebugger.debugQuery<Therapist>(
          'clinicians_compatibility_view',
          (query) => query
            .select('id, clinician_first_name, clinician_last_name, clinician_professional_name, clinician_type, clinician_bio, clinician_licensed_states, clinician_min_client_age, clinician_image_url')
            .eq('clinician_status', 'Active')
        );
        
        if (!compatResult.error) {
          console.log('[useTherapistSelection] Strategy 2 succeeded using compatibility view');
          therapistData = compatResult.data || [];
          fetchError = null;
        } else {
          console.log('[useTherapistSelection] Strategy 2 also failed. Trying Strategy 3...');
          
          // Strategy 3: Try without status filter (in case the enum is causing issues) - FIXED: removed clinician_profile_image
          const noStatusResult = await ClinicianQueryDebugger.debugQuery<Therapist>(
            'clinicians',
            (query) => query
              .select('id, clinician_first_name, clinician_last_name, clinician_professional_name, clinician_type, clinician_bio, clinician_licensed_states, clinician_min_client_age, clinician_image_url')
          );
          
          if (!noStatusResult.error) {
            console.log('[useTherapistSelection] Strategy 3 succeeded (no status filter)');
            // Filter active status in-memory since we couldn't do it in the query
            therapistData = (noStatusResult.data || [])
              .filter(t => t && (t as any).clinician_status === 'Active');
            fetchError = null;
          } else {
            console.log('[useTherapistSelection] Strategy 3 also failed. Trying Strategy 4 (direct query)...');
            
            // Strategy 4: Direct query as a last resort - FIXED: removed clinician_profile_image
            const directResult = await supabase
              .from('clinicians')
              .select('id, clinician_first_name, clinician_last_name, clinician_professional_name, clinician_type, clinician_bio, clinician_licensed_states, clinician_min_client_age, clinician_image_url');
            
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
        
        // NEW: Map clinician_image_url to clinician_profile_image for backward compatibility
        therapistData = therapistData.map(t => {
          const therapist = { ...t };
          therapist.clinician_profile_image = t.clinician_image_url;
          return therapist;
        });
        
        console.log('[useTherapistSelection] Loaded', therapistData.length, 'therapists');
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
      }
    } catch (error: any) {
      console.error('[useTherapistSelection] Unexpected error:', error);
      setErrorMessage(`Unexpected error: ${error.message || 'Unknown error'}`);
      setTherapists([]);
      setAllTherapists([]);
      
      toast({
        title: "Error Loading Therapists",
        description: error.message || 'An unexpected error occurred. Please try again later.',
        variant: "destructive"
      });
    } finally {
      setLoading(false);
      setAttemptCount(prev => prev + 1);
      console.log('[useTherapistSelection] Fetch completed, loading set to false');
    }
  }, [clientState, clientAge, enableFiltering, attemptCount, toast]);
  
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
      const { error } = await supabase
        .from('clients')
        .update({
          client_assigned_therapist: therapistId,
          client_status: 'Therapist Selected'
        })
        .eq('id', userId);
        
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
