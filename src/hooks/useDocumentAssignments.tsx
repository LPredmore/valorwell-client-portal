
import { useState, useCallback } from 'react';
import { fetchDocumentAssignmentsWithRetry } from '@/utils/enhancedFetching';
import { DocumentAssignment } from '@/integrations/supabase/client';
import { debounce } from '@/utils/fetchUtils';

export function useDocumentAssignments(clientId?: string) {
  const [assignments, setAssignments] = useState<DocumentAssignment[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  
  // Clear error state
  const clearError = () => setLoadError(null);

  // Main fetch function
  const fetchAssignments = useCallback(async (forceRefresh: boolean = false) => {
    if (!clientId) {
      console.log('No client ID provided, skipping assignments fetch');
      return { success: false, message: 'No client ID provided' };
    }
    
    if (isLoading && !forceRefresh) {
      console.log('Already loading assignments, skipping fetch');
      return { success: false, message: 'Already loading' };
    }
    
    // If there's an error and we're not forcing a refresh, don't fetch again
    if (loadError && !forceRefresh) {
      console.log('Previous error exists and no force refresh requested');
      return { success: false, message: 'Previous error exists' };
    }
    
    setIsLoading(true);
    clearError();
    
    try {
      console.log(`Fetching document assignments for client: ${clientId}`);
      const { data, error } = await fetchDocumentAssignmentsWithRetry(clientId);
      
      if (error) {
        throw error;
      }
      
      if (!data || data.length === 0) {
        console.log('No assignments found');
        setAssignments([]);
        return { success: true, message: 'No assignments found' };
      }

      console.log(`Fetched ${data.length} document assignments`);
      setAssignments(data);
      return { success: true, message: `Fetched ${data.length} assignments` };
    } catch (error) {
      console.error('Error in useDocumentAssignments hook:', error);
      setLoadError('Failed to load assignments. Please try again later.');
      return { success: false, message: 'Error fetching assignments' };
    } finally {
      setIsLoading(false);
    }
  }, [clientId, isLoading, loadError]);
  
  // Debounced version for when rapid calls might occur
  const debouncedFetchAssignments = useCallback(
    debounce(() => fetchAssignments(false), 500, 'fetchAssignments'),
    [fetchAssignments]
  );
  
  // Manual retry with error clearing
  const retryFetch = useCallback(() => {
    return fetchAssignments(true);
  }, [fetchAssignments]);
  
  return {
    assignments,
    isLoading,
    loadError,
    fetchAssignments,
    debouncedFetchAssignments,
    retryFetch,
    clearError
  };
}
