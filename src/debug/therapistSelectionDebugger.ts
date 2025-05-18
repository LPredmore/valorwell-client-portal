import { supabase } from '@/integrations/supabase/client';

/**
 * Utility to debug the TherapistSelection page and verify it's working correctly
 * with the updated authentication system.
 */
export class TherapistSelectionDebugger {
  /**
   * Verify client state is being correctly retrieved from the database
   */
  public static async verifyClientState(userId: string | null): Promise<void> {
    if (!userId) {
      console.error('[TherapistSelectionDebugger] No user ID provided');
      return;
    }

    try {
      console.log(`[TherapistSelectionDebugger] Verifying client state for user ID: ${userId}`);
      
      const { data, error } = await supabase
        .from('clients')
        .select('client_state, client_age')
        .eq('id', userId)
        .single();
      
      if (error) {
        console.error('[TherapistSelectionDebugger] Error fetching client state:', error);
      } else if (data) {
        console.log('[TherapistSelectionDebugger] Client state from database:', data.client_state);
        console.log('[TherapistSelectionDebugger] Client age from database:', data.client_age);
      } else {
        console.warn('[TherapistSelectionDebugger] No client data found');
      }
    } catch (error) {
      console.error('[TherapistSelectionDebugger] Exception verifying client state:', error);
    }
  }

  /**
   * Verify therapist filtering by state is working correctly
   */
  public static async verifyTherapistFiltering(clientState: string | null): Promise<void> {
    if (!clientState) {
      console.warn('[TherapistSelectionDebugger] No client state provided for filtering verification');
      return;
    }

    try {
      console.log(`[TherapistSelectionDebugger] Verifying therapist filtering for state: ${clientState}`);
      
      // Get all active therapists
      const { data: allTherapists, error: allError } = await supabase
        .from('clinicians')
        .select('id, clinician_professional_name, clinician_licensed_states')
        .eq('clinician_status', 'Active');
      
      if (allError) {
        console.error('[TherapistSelectionDebugger] Error fetching therapists:', allError);
        return;
      }
      
      console.log(`[TherapistSelectionDebugger] Found ${allTherapists?.length || 0} total active therapists`);
      
      // Count therapists licensed in the client's state
      const clientStateNormalized = clientState.toLowerCase().trim();
      const matchingTherapists = allTherapists?.filter(therapist => 
        therapist.clinician_licensed_states && 
        therapist.clinician_licensed_states.some(state => {
          if (!state) return false;
          const stateNormalized = state.toLowerCase().trim();
          return stateNormalized.includes(clientStateNormalized) || clientStateNormalized.includes(stateNormalized);
        })
      );
      
      console.log(`[TherapistSelectionDebugger] Found ${matchingTherapists?.length || 0} therapists licensed in ${clientState}`);
      
      // Log the matching therapists
      if (matchingTherapists && matchingTherapists.length > 0) {
        matchingTherapists.forEach(therapist => {
          console.log(`[TherapistSelectionDebugger] Therapist ${therapist.clinician_professional_name} (${therapist.id}) is licensed in ${clientState}`);
        });
      }
    } catch (error) {
      console.error('[TherapistSelectionDebugger] Exception verifying therapist filtering:', error);
    }
  }

  /**
   * Verify the correct fields are being displayed
   */
  public static verifyTherapistFields(therapists: any[]): void {
    if (!therapists || therapists.length === 0) {
      console.warn('[TherapistSelectionDebugger] No therapists provided for field verification');
      return;
    }

    console.log(`[TherapistSelectionDebugger] Verifying fields for ${therapists.length} therapists`);
    
    // Check for required fields
    const requiredFields = [
      'clinician_professional_name',
      'clinician_type',
      'clinician_bio',
      'clinician_licensed_states',
      'clinician_image_url'
    ];
    
    therapists.forEach(therapist => {
      console.log(`[TherapistSelectionDebugger] Checking fields for therapist ${therapist.id}`);
      
      requiredFields.forEach(field => {
        if (therapist[field] === undefined) {
          console.error(`[TherapistSelectionDebugger] Missing required field: ${field} for therapist ${therapist.id}`);
        } else {
          console.log(`[TherapistSelectionDebugger] Field ${field} is present for therapist ${therapist.id}`);
        }
      });
    });
  }

  /**
   * Run all verification checks
   */
  public static async runAllChecks(userId: string | null, clientState: string | null, therapists: any[]): Promise<void> {
    console.log('[TherapistSelectionDebugger] Running all verification checks');
    
    await this.verifyClientState(userId);
    await this.verifyTherapistFiltering(clientState);
    this.verifyTherapistFields(therapists);
    
    console.log('[TherapistSelectionDebugger] All verification checks completed');
  }
}