
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { calculateAge } from '@/utils/dateUtils';

export interface SimpleTherapist {
  id: string;
  clinician_first_name: string | null;
  clinician_last_name: string | null;
  clinician_professional_name: string | null;
  clinician_bio: string | null;
  clinician_email: string | null;
  clinician_image_url: string | null;
  clinician_licensed_states: string[] | null;
  clinician_accepting_new_clients: "Yes" | "No" | null;
  clinician_min_client_age: number | null;
}

interface UseSimpleTherapistSelectionProps {
  clientState: string | null;
  clientDateOfBirth: string | Date | null;
}

export const useSimpleTherapistSelection = ({ clientState, clientDateOfBirth }: UseSimpleTherapistSelectionProps) => {
  const [therapists, setTherapists] = useState<SimpleTherapist[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedTherapistId, setSelectedTherapistId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // Fetch therapists from Supabase
  useEffect(() => {
    const fetchTherapists = async () => {
      try {
        setLoading(true);
        setError(null);
        
        // Query active clinicians who are accepting new clients
        const { data, error } = await supabase
          .from('clinicians')
          .select(`
            id, 
            clinician_first_name, 
            clinician_last_name, 
            clinician_professional_name, 
            clinician_bio, 
            clinician_email,
            clinician_image_url, 
            clinician_licensed_states,
            clinician_accepting_new_clients,
            clinician_min_client_age
          `)
          .eq('clinician_status', 'Active')
          .eq('clinician_accepting_new_clients', 'Yes');
        
        if (error) throw error;
        
        // Enhanced filtering with proper null handling
        let filteredTherapists = data || [];
        
        // State filtering (existing logic)
        if (clientState && filteredTherapists.length > 0) {
          filteredTherapists = filteredTherapists.filter(therapist => 
            therapist.clinician_licensed_states && 
            therapist.clinician_licensed_states.some(state => 
              state.toLowerCase() === clientState.toLowerCase()
            )
          );
        }
        
        // NEW: Age filtering with comprehensive null safety
        if (clientDateOfBirth && filteredTherapists.length > 0) {
          const clientAge = calculateAge(clientDateOfBirth);
          
          // Only filter if age calculation succeeded
          if (clientAge !== null && !isNaN(clientAge)) {
            filteredTherapists = filteredTherapists.filter(therapist => 
              // Include therapist if they have no minimum age requirement
              // OR if client meets the minimum age requirement
              !therapist.clinician_min_client_age || 
              clientAge >= therapist.clinician_min_client_age
            );
          }
        }
        
        setTherapists(filteredTherapists);
      } catch (err) {
        console.error('Error fetching therapists:', err);
        setError('Unable to load therapists. Please try again later.');
      } finally {
        setLoading(false);
      }
    };

    fetchTherapists();
  }, [clientState, clientDateOfBirth]);

  // Select a therapist
  const selectTherapist = async (therapistId: string): Promise<boolean> => {
    try {
      setIsSubmitting(true);
      
      // Get the current authenticated user ID
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error("You must be logged in to select a therapist");
        return false;
      }
      
      // Update the client's assigned therapist
      const { error } = await supabase
        .from('clients')
        .update({
          client_assigned_therapist: therapistId,
          client_status: 'Therapist Selected'
        })
        .eq('id', user.id);
      
      if (error) {
        throw error;
      }
      
      // Find the therapist name for the success message
      const therapist = therapists.find(t => t.id === therapistId);
      const therapistName = therapist?.clinician_professional_name || 
        `${therapist?.clinician_first_name || ''} ${therapist?.clinician_last_name || ''}`.trim() || 
        'selected therapist';
      
      toast.success(`You have selected ${therapistName}.`);
      return true;
    } catch (err) {
      console.error('Error selecting therapist:', err);
      toast.error("Failed to select therapist. Please try again.");
      return false;
    } finally {
      setIsSubmitting(false);
    }
  };

  return {
    therapists,
    loading,
    error,
    selectedTherapistId,
    setSelectedTherapistId,
    selectTherapist,
    isSubmitting
  };
};
