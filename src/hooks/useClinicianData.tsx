
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Clinician } from "@/types/client";

export const getClinicianById = async (clinicianId: string) => {
  try {
    const { data, error } = await supabase
      .from('clinicians')
      .select('*')
      .eq('id', clinicianId)
      .single();
      
    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error fetching clinician:', error);
    return null;
  }
};

export const getClinicianTimeZone = async (clinicianId: string): Promise<string> => {
  try {
    const { data, error } = await supabase
      .from('clinicians')
      .select('clinician_timezone')
      .eq('id', clinicianId)
      .single();
      
    if (error) {
      console.error('Error fetching clinician timezone:', error);
      return 'America/Chicago'; // Default to Central Time
    }
    
    // Return the timezone or a default if not set
    return data?.clinician_timezone || 'America/Chicago';
  } catch (error) {
    console.error('Error fetching clinician timezone:', error);
    return 'America/Chicago'; // Default to Central Time
  }
};

// Create and export the useClinicianData hook
export const useClinicianData = (clinicianId?: string) => {
  const [clinicianData, setClinicianData] = useState<Clinician | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const fetchClinicianData = async () => {
      if (!clinicianId) {
        setIsLoading(false);
        return;
      }

      try {
        setIsLoading(true);
        const data = await getClinicianById(clinicianId);
        
        if (data) {
          setClinicianData(data);
        }
        setIsLoading(false);
      } catch (err) {
        console.error('Error in useClinicianData:', err);
        setError(err instanceof Error ? err : new Error('Unknown error fetching clinician data'));
        setIsLoading(false);
      }
    };

    fetchClinicianData();
  }, [clinicianId]);

  return {
    clinicianData,
    isLoading,
    error
  };
};
