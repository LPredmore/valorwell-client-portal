import { createClient } from '@supabase/supabase-js';

// Get Supabase URL and anon key from environment
const supabaseUrl = 'https://gqlkritspnhjxfejvgfg.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdxbGtyaXRzcG5oanhmZWp2Z2ZnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDI3NjQ0NDUsImV4cCI6MjA1ODM0MDQ0NX0.BtnTfcjvHI55_fs_zor9ffQ9Aclg28RSfvgZrWpMuYs';

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

// Function to create video room (placeholder)
export const getOrCreateVideoRoom = async (appointmentId: string): Promise<{ success: boolean; url?: string; error?: any }> => {
  try {
    // This is a placeholder implementation
    console.log(`Creating video room for appointment: ${appointmentId}`);
    
    // Simulate API call to create room
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // Return mock URL for now
    return { 
      success: true, 
      url: `https://video.example.com/room/${appointmentId}` 
    };
  } catch (error) {
    console.error('Error creating video room:', error);
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

    console.log('Fetched clinical documents:', data);
    return data || [];
  } catch (error) {
    console.error('Error fetching clinical documents:', error);
    return [];
  }
};

// Function to get document download URL
export const getDocumentDownloadURL = async (filePath: string): Promise<string | null> => {
  try {
    const { data, error } = await supabase.storage
      .from('documents')
      .createSignedUrl(filePath, 60 * 60); // URL valid for 1 hour

    if (error) {
      console.error('Error getting document URL:', error);
      return null;
    }

    return data?.signedUrl || null;
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

// Function to save PHQ-9 assessment
export const savePHQ9Assessment = async (assessmentData: any) => {
  try {
    const { data, error } = await supabase
      .from('phq9_assessments')
      .insert(assessmentData)
      .select();

    if (error) {
      console.error('Error saving PHQ-9 assessment:', error);
      return { success: false, error };
    }

    return { success: true, data: data[0] };
  } catch (error) {
    console.error('Exception while saving PHQ-9 assessment:', error);
    return { success: false, error };
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
