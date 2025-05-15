
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

/**
 * Assigns required documents to a client if they haven't been assigned already
 * 
 * @param clientId The client's ID
 * @param staffId The staff member's ID or system ID for automatic assignments
 * @returns Object with success status
 */
export const assignRequiredDocuments = async (
  clientId: string,
  staffId: string = 'system'
): Promise<{ success: boolean }> => {
  try {
    // Define the required documents
    const requiredDocuments = [
      { name: 'Informed Consent', type: 'informed_consent' },
      { name: 'Client History', type: 'client_history' }
    ];
    
    // First check which documents are already assigned
    const { data: existingAssignments, error: fetchError } = await supabase
      .from('document_assignments')
      .select('document_name')
      .eq('client_id', clientId);
      
    if (fetchError) {
      console.error('Error fetching existing document assignments:', fetchError);
      return { success: false };
    }
    
    // Create a set of already assigned document names for easy lookup
    const assignedDocNames = new Set(
      existingAssignments?.map(assignment => assignment.document_name) || []
    );
    
    // Filter out documents that are already assigned
    const documentsToAssign = requiredDocuments.filter(
      doc => !assignedDocNames.has(doc.name)
    );
    
    if (documentsToAssign.length === 0) {
      // All required documents are already assigned
      return { success: true };
    }
    
    // Prepare assignment data
    const assignmentData = documentsToAssign.map(doc => ({
      client_id: clientId,
      document_name: doc.name,
      document_type: doc.type,
      status: 'not_started',
      assigned_by: staffId,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }));
    
    // Insert new assignments
    const { error: insertError } = await supabase
      .from('document_assignments')
      .insert(assignmentData);
      
    if (insertError) {
      console.error('Error assigning required documents:', insertError);
      return { success: false };
    }
    
    return { success: true };
  } catch (error) {
    console.error('Error in assignRequiredDocuments:', error);
    return { success: false };
  }
};

/**
 * Checks if a client has completed all required documents
 * 
 * @param clientId The client's ID
 * @returns Object with completion status and missing documents
 */
export const checkRequiredDocumentsCompletion = async (
  clientId: string
): Promise<{ allCompleted: boolean, missingDocuments: string[] }> => {
  try {
    // Define the required documents
    const requiredDocuments = [
      'Informed Consent',
      'Client History'
    ];
    
    // Get all assignments for the client
    const { data: assignments, error: fetchError } = await supabase
      .from('document_assignments')
      .select('document_name, status')
      .eq('client_id', clientId)
      .in('document_name', requiredDocuments);
      
    if (fetchError) {
      console.error('Error fetching document assignments:', fetchError);
      return { allCompleted: false, missingDocuments: requiredDocuments };
    }
    
    // Create a map of document status
    const documentStatus = new Map();
    assignments?.forEach(assignment => {
      documentStatus.set(assignment.document_name, assignment.status);
    });
    
    // Check which documents are not completed
    const missingDocuments = requiredDocuments.filter(docName => {
      // Missing if either not assigned or not completed
      return !documentStatus.has(docName) || documentStatus.get(docName) !== 'completed';
    });
    
    return {
      allCompleted: missingDocuments.length === 0,
      missingDocuments
    };
  } catch (error) {
    console.error('Error in checkRequiredDocumentsCompletion:', error);
    return { allCompleted: false, missingDocuments: [] };
  }
};

/**
 * Hook component for automatically assigning required documents to the current user
 */
export const useAutoAssignDocuments = (userId: string | null) => {
  React.useEffect(() => {
    if (!userId) return;
    
    // Call the assign function when the component mounts
    assignRequiredDocuments(userId)
      .then(result => {
        if (!result.success) {
          console.warn('Failed to assign required documents automatically');
        }
      })
      .catch(err => {
        console.error('Error in useAutoAssignDocuments:', err);
      });
  }, [userId]);
};
