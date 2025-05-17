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
    const { data, error } = await supabase
      .from('document_assignments')
      .select('*')
      .eq('client_id', clientId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching document assignments:', error);
      return { data: null, error };
    }

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

// Function to create video room (placeholder for getOrCreateVideoRoom function)
export const getOrCreateVideoRoom = async (appointmentId: string): Promise<{ success: boolean; url?: string; error?: any }> => {
  try {
    // This is a placeholder implementation - you'll need to implement the actual logic
    // based on your video conferencing requirements
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
