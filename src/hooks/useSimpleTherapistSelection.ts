
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface SimpleTherapist {
  id: string;
  clinician_first_name: string | null;
  clinician_last_name: string | null;
  clinician_professional_name: string | null;
  clinician_bio: string | null;
  clinician_image_url: string | null;
  clinician_licensed_states: string[] | null;
}

interface UseSimpleTherapistSelectionProps {
  clientState: string | null;
}

export const useSimpleTherapistSelection = ({ clientState }: UseSimpleTherapistSelectionProps) => {
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
        
        // Query active clinicians from the database
        const { data, error } = await supabase
          .from('clinicians')
          .select('id, clinician_first_name, clinician_last_name, clinician_professional_name, clinician_bio, clinician_image_url, clinician_licensed_states')
          .eq('clinician_status', 'Active');
        
        if (error) throw error;
        
        // Filter therapists by client state if provided
        let filteredTherapists = data || [];
        
        if (clientState && filteredTherapists.length > 0) {
          filteredTherapists = filteredTherapists.filter(therapist => 
            therapist.clinician_licensed_states && 
            therapist.clinician_licensed_states.some(state => 
              state.toLowerCase() === clientState.toLowerCase()
            )
          );
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
  }, [clientState]);

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
