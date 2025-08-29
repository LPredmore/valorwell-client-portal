import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { calculateAge } from '@/utils/dateUtils';

interface UseTherapistAvailabilityCheckProps {
  clientState?: string;
  clientDateOfBirth?: string;
  clientChampva?: string;
}

export const useTherapistAvailabilityCheck = ({
  clientState,
  clientDateOfBirth,
  clientChampva
}: UseTherapistAvailabilityCheckProps) => {
  const [hasAvailableTherapists, setHasAvailableTherapists] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkAvailability = async () => {
      if (!clientState || !clientDateOfBirth) {
        setHasAvailableTherapists(false);
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        
        // Query active clinicians who are accepting new clients - matching useSimpleTherapistSelection
        const { data, error } = await supabase
          .from('clinicians')
          .select('id, clinician_licensed_states, clinician_min_client_age')
          .eq('clinician_status', 'Active')
          .eq('clinician_accepting_new_clients', 'Yes');
        
        if (error) {
          console.error('Error checking therapist availability:', error);
          setHasAvailableTherapists(false);
          return;
        }
        
        // Apply the same filtering logic as useSimpleTherapistSelection
        let filteredTherapists = data || [];
        
        // State filtering - exact same logic
        if (clientState && filteredTherapists.length > 0) {
          filteredTherapists = filteredTherapists.filter(therapist => 
            therapist.clinician_licensed_states && 
            therapist.clinician_licensed_states.some(state => 
              state.toLowerCase() === clientState.toLowerCase()
            )
          );
        }
        
        // Age filtering - exact same logic
        if (clientDateOfBirth && filteredTherapists.length > 0) {
          const clientAge = calculateAge(clientDateOfBirth);
          
          if (clientAge !== null && !isNaN(clientAge)) {
            filteredTherapists = filteredTherapists.filter(therapist => 
              !therapist.clinician_min_client_age || 
              clientAge >= therapist.clinician_min_client_age
            );
          }
        }
        
        // CHAMPVA filtering - exact same logic
        if (filteredTherapists.length > 0) {
          const hasChampva = clientChampva && clientChampva.trim() !== '';
          
          if (!hasChampva) {
            filteredTherapists = [];
          }
        }
        
        setHasAvailableTherapists(filteredTherapists.length > 0);
      } catch (error) {
        console.error('Error in therapist availability check:', error);
        setHasAvailableTherapists(false);
      } finally {
        setLoading(false);
      }
    };

    checkAvailability();
  }, [clientState, clientDateOfBirth, clientChampva]);

  return { hasAvailableTherapists, loading };
};