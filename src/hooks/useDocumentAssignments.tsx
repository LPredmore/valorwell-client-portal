
import { useState, useCallback } from 'react';
import { fetchDocumentAssignmentsWithRetry } from '@/utils/enhancedFetching';
import { DocumentAssignment } from '@/integrations/supabase/client';
import { debounce } from '@/utils/fetchUtils';

export function useDocumentAssignments(clientId?: string) {
  const [assignments, setAssignments] = useState<DocumentAssignment[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [fetchAttempts, setFetchAttempts] = useState<number>(0);
  const MAX_FETCH_ATTEMPTS = 3;
  
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
    
    // Reset attempts count on forced refresh
    if (forceRefresh) {
      setFetchAttempts(0);
    }
    
    // Check if exceeded max attempts
    if (fetchAttempts >= MAX_FETCH_ATTEMPTS && !forceRefresh) {
      console.log('Maximum fetch attempts reached. Use manual refresh to try again.');
      setLoadError('Unable to load after several attempts. Please try again later.');
      return { success: false, message: 'Max attempts reached' };
    }
    
    setIsLoading(true);
    clearError();
    
    try {
      console.log(`Fetching document assignments for client: ${clientId} (attempt ${fetchAttempts + 1})`);
      const { data, error } = await fetchDocumentAssignmentsWithRetry(clientId);
      
      if (error) {
        throw error;
      }
      
      if (!data || data.length === 0) {
        console.log('No assignments found');
        setAssignments([]);
        return { success: true, message: 'No assignments found' };
      }

      console.log(`Fetched ${data.length} document assignments successfully`);
      setAssignments(data);
      return { success: true, message: `Fetched ${data.length} assignments` };
    } catch (error) {
      console.error('Error in useDocumentAssignments hook:', error);
      
      // Increment attempts counter
      setFetchAttempts(prev => prev + 1);
      
      // Set user-friendly error message
      if (fetchAttempts + 1 >= MAX_FETCH_ATTEMPTS) {
        setLoadError('Failed to load assignments after multiple attempts. Please try again later.');
      } else {
        setLoadError('Failed to load assignments. Retry will happen automatically.');
      }
      
      return { success: false, message: 'Error fetching assignments' };
    } finally {
      setIsLoading(false);
    }
  }, [clientId, isLoading, loadError, fetchAttempts]);
  
  // Debounced version for when rapid calls might occur
  const debouncedFetchAssignments = useCallback(
    debounce(() => fetchAssignments(false), 500, 'fetchAssignments'),
    [fetchAssignments]
  );
  
  // Manual retry with error clearing and attempt reset
  const retryFetch = useCallback(() => {
    setFetchAttempts(0); // Reset attempts counter on manual retry
    return fetchAssignments(true);
  }, [fetchAssignments]);
  
  return {
    assignments,
    isLoading,
    loadError,
    fetchAssignments,
    debouncedFetchAssignments,
    retryFetch,
    clearError,
    fetchAttempts
  };
}
