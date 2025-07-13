
import { createClient } from '@supabase/supabase-js';

// Get Supabase configuration from multiple sources
const getSupabaseConfig = () => {
  // First check for runtime configuration (from micro-frontend host)
  const runtimeConfig = (window as any).__VALORWELL_SUPABASE_CONFIG__;
  if (runtimeConfig) {
    return {
      url: runtimeConfig.url,
      key: runtimeConfig.key
    };
  }

  // Then check environment variables
  const envUrl = import.meta.env.VITE_SUPABASE_URL;
  const envKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
  if (envUrl && envKey) {
    return {
      url: envUrl,
      key: envKey
    };
  }

  // Fallback to hardcoded values for development
  return {
    url: 'https://gqlkritspnhjxfejvgfg.supabase.co',
    key: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdxbGtyaXRzcG5oanhmZWp2Z2ZnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDI3NjQ0NDUsImV4cCI6MjA1ODM0MDQ0NX0.BtnTfcjvHI55_fs_zor9ffQ9Aclg28RSfvgZrWpMuYs'
  };
};

const { url: supabaseUrl, key: supabaseKey } = getSupabaseConfig();

// Create Supabase client
export const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    storage: localStorage
  }
});

export type DocumentAssignment = {
  id: string;
  client_id: string;
  document_name: string;
  status: string;
  assigned_by: string;
  created_at: string;
  updated_at: string;
};

// Constants for storage management
export const CLINICAL_DOCUMENTS_BUCKET = 'clinical_documents';

// Function to update document status
export const updateDocumentStatus = async (id: string, status: string): Promise<{ success: boolean; error?: any }> => {
  try {
    const { error } = await supabase
      .from('document_assignments')
      .update({ status, updated_at: new Date().toISOString() })
      .eq('id', id);

    if (error) {
      console.error('Error updating document status:', error);
      return { success: false, error };
    }

    return { success: true };
  } catch (error) {
    console.error('Exception while updating document status:', error);
    return { success: false, error };
  }
};

// Function to fetch document assignments for a client
export const fetchDocumentAssignments = async (clientId: string): Promise<{ data: DocumentAssignment[] | null; error: any }> => {
  try {
    console.log('Fetching document assignments for client:', clientId);
    
    const { data, error } = await supabase
      .from('document_assignments')
      .select('*')
      .eq('client_id', clientId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching document assignments:', error);
      return { data: null, error };
    }

    console.log('Fetched document assignments:', data);
    return { data: data as DocumentAssignment[], error: null };
  } catch (error) {
    console.error('Exception while fetching document assignments:', error);
    return { data: null, error };
  }
};

// Function to get current user
export const getCurrentUser = async () => {
  try {
    const { data, error } = await supabase.auth.getUser();
    if (error) {
      console.error('Error getting current user:', error);
      return { user: null, error };
    }
    return { user: data.user, error: null };
  } catch (error) {
    console.error('Exception while getting current user:', error);
    return { user: null, error };
  }
};

// Function to create video room - updated to use the create-daily-room edge function
export const getOrCreateVideoRoom = async (appointmentId: string): Promise<{ success: boolean; url?: string; error?: any }> => {
  try {
    console.log(`Creating video room for appointment: ${appointmentId}`);
    
    // Check if the appointment already has a video room URL
    const { data: appointmentData, error: appointmentError } = await supabase
      .from('appointments')
      .select('video_room_url')
      .eq('id', appointmentId)
      .single();
    
    if (appointmentError) {
      console.error('Error checking appointment for video room URL:', appointmentError);
      return { success: false, error: appointmentError };
    }
    
    // If the appointment already has a video room URL, return it
    if (appointmentData?.video_room_url) {
      console.log('Found existing video room URL:', appointmentData.video_room_url);
      return { success: true, url: appointmentData.video_room_url };
    }
    
    // Call the edge function to create a Daily.co room
    console.log('Calling create-daily-room edge function');
    const { data, error } = await supabase.functions.invoke('create-daily-room', {
      body: { appointmentId }
    });
    
    if (error) {
      console.error('Error creating video room via edge function:', error);
      return { success: false, error };
    }
    
    if (!data?.url) {
      console.error('No URL returned from create-daily-room function');
      return { success: false, error: 'No URL returned from video room creation' };
    }
    
    // Save the video room URL to the appointment
    const { error: updateError } = await supabase
      .from('appointments')
      .update({ video_room_url: data.url })
      .eq('id', appointmentId);
    
    if (updateError) {
      console.error('Error updating appointment with video room URL:', updateError);
      // We'll still return success since the room was created
    }
    
    console.log('Successfully created and stored video room URL:', data.url);
    return { success: true, url: data.url };
  } catch (error) {
    console.error('Exception in getOrCreateVideoRoom:', error);
    return { success: false, error };
  }
};

// Function to fetch clinical documents for a client
export const fetchClinicalDocuments = async (clientId: string): Promise<any[]> => {
  try {
    console.log('Fetching clinical documents for client:', clientId);
    
    const { data, error } = await supabase
      .from('clinical_documents')
      .select('*')
      .eq('client_id', clientId)
      .order('document_date', { ascending: false });

    if (error) {
      console.error('Error fetching clinical documents:', error);
      return [];
    }
    
    if (!data || data.length === 0) {
      console.log('No clinical documents found for client:', clientId);
      return [];
    }

    console.log(`Fetched ${data.length} clinical documents:`, data);
    return data;
  } catch (error) {
    console.error('Error fetching clinical documents:', error);
    return [];
  }
};

// Function to get document download URL
export const getDocumentDownloadURL = async (filePath: string): Promise<string | null> => {
  try {
    if (!filePath) {
      console.error('Invalid file path provided to getDocumentDownloadURL:', filePath);
      return null;
    }
    
    console.log(`Getting download URL for file path: ${filePath} from bucket: ${CLINICAL_DOCUMENTS_BUCKET}`);
    
    // Use the constant bucket name
    const { data, error } = await supabase.storage
      .from(CLINICAL_DOCUMENTS_BUCKET)
      .createSignedUrl(filePath, 60 * 60); // URL valid for 1 hour

    if (error) {
      console.error(`Error getting document URL from ${CLINICAL_DOCUMENTS_BUCKET}:`, error);
      return null;
    }

    if (!data?.signedUrl) {
      console.error('No signed URL returned from Storage API');
      return null;
    }

    console.log('Successfully generated signed URL for document');
    return data.signedUrl;
  } catch (error) {
    console.error('Error generating document URL:', error);
    return null;
  }
};

// Helper functions for date formatting
export const formatDateForDB = (date: Date | string): string => {
  if (!date) return '';
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toISOString().split('T')[0]; // YYYY-MM-DD
};

export const parseDateString = (dateStr: string): Date => {
  if (!dateStr) return new Date();
  return new Date(dateStr);
};

// Function to get client by user ID
export const getClientByUserId = async (userId: string) => {
  try {
    const { data, error } = await supabase
      .from('clients')
      .select('*')
      .eq('id', userId)
      .single();

    if (error) {
      console.error('Error fetching client data:', error);
      return { client: null, error };
    }

    return { client: data, error: null };
  } catch (error) {
    console.error('Exception while fetching client data:', error);
    return { client: null, error };
  }
};

// Function to update client profile
export const updateClientProfile = async (clientId: string, profileData: any) => {
  try {
    const { data, error } = await supabase
      .from('clients')
      .update(profileData)
      .eq('id', clientId)
      .select();

    if (error) {
      console.error('Error updating client profile:', error);
      return { success: false, error };
    }

    return { success: true, data };
  } catch (error) {
    console.error('Exception while updating client profile:', error);
    return { success: false, error };
  }
};

// Function to save PHQ-9 assessment synchronously (immediate save, no AI generation)
export const savePHQ9AssessmentSync = async (assessmentData: any) => {
  try {
    console.log('Saving PHQ-9 assessment data (sync):', assessmentData);
    
    const { data, error } = await supabase
      .from('phq9_assessments')
      .insert(assessmentData)
      .select();

    if (error) {
      console.error('Error saving PHQ-9 assessment:', error);
      return { success: false, error };
    }
    
    const savedAssessment = data[0];
    console.log('PHQ-9 assessment saved successfully (sync):', savedAssessment);

    return { success: true, data: savedAssessment };
  } catch (error) {
    console.error('Exception while saving PHQ-9 assessment:', error);
    return { success: false, error };
  }
};

// Function to generate PHQ-9 narrative asynchronously (background processing)
export const generatePHQ9NarrativeAsync = async (assessmentId: string, assessmentData: any) => {
  try {
    console.log('Starting background PHQ-9 narrative generation for assessment:', assessmentId);
    
    const { data: narrativeData, error: narrativeError } = await supabase.functions.invoke(
      'generate-phq9-narrative',
      {
        body: { assessmentData }
      }
    );

    if (narrativeError) {
      console.error('Error generating PHQ-9 narrative (async):', narrativeError);
      return { success: false, error: narrativeError };
    } 
    
    if (narrativeData?.success && narrativeData?.narrative) {
      console.log('Generated PHQ-9 narrative (async):', narrativeData.narrative);
      
      // Update the assessment record with the generated narrative
      const { error: updateError } = await supabase
        .from('phq9_assessments')
        .update({ phq9_narrative: narrativeData.narrative })
        .eq('id', assessmentId);

      if (updateError) {
        console.error('Error updating PHQ-9 assessment with narrative (async):', updateError);
        return { success: false, error: updateError };
      } else {
        console.log('PHQ-9 assessment updated with narrative successfully (async)');
        return { success: true, data: { narrative: narrativeData.narrative } };
      }
    }

    return { success: false, error: 'No narrative generated' };
  } catch (error) {
    console.error('Exception in PHQ-9 narrative generation (async):', error);
    return { success: false, error };
  }
};

// Legacy function for backward compatibility (now uses the new separated flow)
export const savePHQ9Assessment = async (assessmentData: any) => {
  try {
    // Save the assessment synchronously first
    const saveResult = await savePHQ9AssessmentSync(assessmentData);
    
    if (!saveResult.success) {
      return saveResult;
    }

    // Generate narrative asynchronously in background (fire and forget)
    const assessmentId = saveResult.data.id;
    generatePHQ9NarrativeAsync(assessmentId, assessmentData).catch(error => {
      console.error('Background narrative generation failed:', error);
      // This doesn't affect the main flow
    });

    return saveResult;
  } catch (error) {
    console.error('Exception while saving PHQ-9 assessment:', error);
    return { success: false, error };
  }
};

// New function to check if an assessment already exists for an appointment
export const checkPHQ9AssessmentExists = async (appointmentId: string): Promise<{ exists: boolean; error: any }> => {
  try {
    if (!appointmentId) {
      return { exists: false, error: 'No appointment ID provided' };
    }
    
    console.log('Checking if PHQ9 assessment exists for appointment:', appointmentId);
    
    const { data, error } = await supabase
      .from('phq9_assessments')
      .select('id')
      .eq('appointment_id', appointmentId)
      .single();

    if (error && error.code !== 'PGRST116') { // PGRST116 is "No rows returned" error
      console.error('Error checking PHQ9 assessment:', error);
      return { exists: false, error };
    }

    const exists = !!data;
    console.log('PHQ9 assessment exists:', exists);
    
    return { exists, error: null };
  } catch (error) {
    console.error('Exception while checking PHQ9 assessment:', error);
    return { exists: false, error };
  }
};

// CPT Code type definition
export type CPTCode = {
  id?: string;
  code: string;
  name: string;
  description?: string;
  fee: number;
  status?: string;
  clinical_type?: string;
  created_at?: string;
  updated_at?: string;
};

// CPT Code functions
export const fetchCPTCodes = async (): Promise<CPTCode[]> => {
  try {
    const { data, error } = await supabase
      .from('cpt_codes')
      .select('*')
      .order('code');

    if (error) {
      console.error('Error fetching CPT codes:', error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error('Error in fetchCPTCodes:', error);
    return [];
  }
};

export const addCPTCode = async (code: CPTCode): Promise<{ success: boolean; data?: CPTCode; error?: any }> => {
  try {
    const { data, error } = await supabase
      .from('cpt_codes')
      .insert(code)
      .select();

    if (error) {
      return { success: false, error };
    }

    return { success: true, data: data[0] };
  } catch (error) {
    console.error('Error in addCPTCode:', error);
    return { success: false, error };
  }
};

export const updateCPTCode = async (id: string, updates: Partial<CPTCode>): Promise<{ success: boolean; data?: CPTCode; error?: any }> => {
  try {
    const { data, error } = await supabase
      .from('cpt_codes')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select();

    if (error) {
      return { success: false, error };
    }

    return { success: true, data: data[0] };
  } catch (error) {
    console.error('Error in updateCPTCode:', error);
    return { success: false, error };
  }
};

export const deleteCPTCode = async (id: string): Promise<{ success: boolean; error?: any }> => {
  try {
    const { error } = await supabase
      .from('cpt_codes')
      .delete()
      .eq('id', id);

    if (error) {
      return { success: false, error };
    }

    return { success: true };
  } catch (error) {
    console.error('Error in deleteCPTCode:', error);
    return { success: false, error };
  }
};

// Practice Info type and functions
export type PracticeInfo = {
  id?: string;
  practice_name?: string;
  practice_address1?: string;
  practice_address2?: string;
  practice_city?: string;
  practice_state?: string;
  practice_zip?: string;
  practice_npi?: string;
  practice_taxid?: string;
  practice_taxonomy?: string;
};

export const fetchPracticeInfo = async (): Promise<{ data: PracticeInfo | null; error: any }> => {
  try {
    const { data, error } = await supabase
      .from('practiceinfo')
      .select('*')
      .limit(1)
      .single();

    if (error && error.code !== 'PGRST116') { // PGRST116 is "no rows returned" which just means no practice info yet
      console.error('Error fetching practice info:', error);
      return { data: null, error };
    }

    return { data: data || null, error: null };
  } catch (error) {
    console.error('Exception while fetching practice info:', error);
    return { data: null, error };
  }
};

export const updatePracticeInfo = async (practiceData: PracticeInfo): Promise<{ success: boolean; data?: PracticeInfo; error?: any }> => {
  try {
    let result;

    // Check if we already have a practice info record
    const { data: existingData } = await fetchPracticeInfo();

    if (existingData?.id) {
      // Update existing record
      const { data, error } = await supabase
        .from('practiceinfo')
        .update({
          ...practiceData,
          updated_at: new Date().toISOString()
        })
        .eq('id', existingData.id)
        .select();

      result = { data, error };
    } else {
      // Insert new record
      const { data, error } = await supabase
        .from('practiceinfo')
        .insert({
          ...practiceData,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .select();

      result = { data, error };
    }

    if (result.error) {
      console.error('Error updating practice info:', result.error);
      return { success: false, error: result.error };
    }

    return { success: true, data: Array.isArray(result.data) ? result.data[0] : result.data };
  } catch (error) {
    console.error('Exception while updating practice info:', error);
    return { success: false, error };
  }
};

// Function for creating users (placeholder for now)
export const createUser = async (userData: any): Promise<{ success: boolean; data?: any; error?: any }> => {
  // This would typically call a Supabase Edge Function to create a user
  console.warn('createUser is not fully implemented - would call an Edge Function');
  return { success: false, error: 'Not implemented' };
};

// Function to save document submission
export const saveDocumentSubmission = async (documentData: any): Promise<{ success: boolean; data?: any; error?: any }> => {
  try {
    console.log('Saving document submission:', documentData);
    
    // Validate document data to ensure it has the required fields
    if (!documentData.client_id || !documentData.document_type || !documentData.file_path) {
      console.error('Document submission missing required fields:', documentData);
      return { 
        success: false, 
        error: 'Missing required document data (client_id, document_type, or file_path)' 
      };
    }
    
    const { data, error } = await supabase
      .from('clinical_documents')
      .insert(documentData)
      .select();

    if (error) {
      console.error('Error saving document submission:', error);
      return { success: false, error };
    }

    return { success: true, data: data[0] };
  } catch (error) {
    console.error('Exception while saving document submission:', error);
    return { success: false, error };
  }
};

// New function to fetch client history with related data
export async function fetchClientHistoryData(clientId: string) {
  try {
    // Fetch the main client history record
    const { data: historyData, error: historyError } = await supabase
      .from('client_history')
      .select('*')
      .eq('client_id', clientId)
      .single();
    
    if (historyError) {
      console.error('Error fetching client history:', historyError);
      return { success: false, error: historyError, data: null };
    }
    
    if (!historyData) {
      return { success: false, error: { message: 'No client history found' }, data: null };
    }
    
    // Fetch related data
    const historyId = historyData.id;
    
    // Fetch family members
    const { data: familyData, error: familyError } = await supabase
      .from('client_history_family')
      .select('*')
      .eq('history_id', historyId);
      
    if (familyError) {
      console.error('Error fetching family data:', familyError);
    }
    
    // Fetch household members
    const { data: householdData, error: householdError } = await supabase
      .from('client_history_household')
      .select('*')
      .eq('history_id', historyId);
      
    if (householdError) {
      console.error('Error fetching household data:', householdError);
    }
    
    // Fetch spouse info
    const { data: spouseData, error: spouseError } = await supabase
      .from('client_history_spouses')
      .select('*')
      .eq('history_id', historyId);
      
    if (spouseError) {
      console.error('Error fetching spouse data:', spouseError);
    }
    
    // Fetch treatments
    const { data: treatmentsData, error: treatmentsError } = await supabase
      .from('client_history_treatments')
      .select('*')
      .eq('history_id', historyId);
      
    if (treatmentsError) {
      console.error('Error fetching treatments data:', treatmentsError);
    }
    
    // Fetch medications
    const { data: medicationsData, error: medicationsError } = await supabase
      .from('client_history_medications')
      .select('*')
      .eq('history_id', historyId);
      
    if (medicationsError) {
      console.error('Error fetching medications data:', medicationsError);
    }
    
    // Also fetch current spouse if available
    const { data: currentSpouseData, error: currentSpouseError } = await supabase
      .from('client_history_current_spouse')
      .select('*')
      .eq('history_id', historyId);
      
    if (currentSpouseError) {
      console.error('Error fetching current spouse data:', currentSpouseError);
    }
    
    // Create a complete data object with all related information
    const completeData = {
      main: historyData,
      family: familyData || [],
      household: householdData || [],
      spouses: spouseData || [],
      treatments: treatmentsData || [],
      medications: medicationsData || [],
      currentSpouse: currentSpouseData && currentSpouseData.length > 0 ? currentSpouseData[0] : null
    };
    
    return { success: true, data: completeData, error: null };
  } catch (error: any) {
    console.error('Exception fetching client history data:', error);
    return { success: false, error, data: null };
  }
}
