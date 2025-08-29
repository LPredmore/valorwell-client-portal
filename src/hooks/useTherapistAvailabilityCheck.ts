import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { calculateAge } from '@/utils/dateUtils';

interface UseTherapistAvailabilityCheckProps {
  clientState?: string;
  clientDateOfBirth?: string;
  clientChampva?: boolean;
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
        
        // Calculate client age
        const clientAge = calculateAge(clientDateOfBirth);
        const isMinor = clientAge < 18;

        // Build the query with same logic as useSimpleTherapistSelection
        let query = supabase
          .from('clinicians')
          .select('id')
          .eq('clinician_status', 'active')
          .eq('clinician_is_accepting_new_clients', true)
          .contains('clinician_licensed_states', [clientState]);

        // Add age-based filtering
        if (isMinor) {
          query = query.eq('clinician_accepts_children', true);
        } else {
          query = query.eq('clinician_accepts_adults', true);
        }

        // Add CHAMPVA filtering
        if (clientChampva) {
          query = query.eq('clinician_accepts_champva', true);
        }

        const { data, error } = await query.limit(1);

        if (error) {
          console.error('Error checking therapist availability:', error);
          setHasAvailableTherapists(false);
        } else {
          setHasAvailableTherapists(data && data.length > 0);
        }
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