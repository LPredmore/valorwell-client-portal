
import { useState, useCallback } from 'react';
import { fetchClinicalDocumentsWithRetry } from '@/utils/enhancedFetching';
import { debounce } from '@/utils/fetchUtils';

export interface Document {
  id: string;
  document_title: string;
  document_type: string;
  document_date: string;
  file_path: string;
  created_at: string;
}

export function useDocuments(clientId?: string) {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  
  // Clear error state
  const clearError = () => setLoadError(null);

  // Main fetch function
  const fetchDocuments = useCallback(async (forceRefresh: boolean = false) => {
    if (!clientId) {
      console.log('No client ID provided, skipping document fetch');
      return { success: false, message: 'No client ID provided' };
    }
    
    if (isLoading && !forceRefresh) {
      console.log('Already loading documents, skipping fetch');
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
      console.log(`Fetching clinical documents for client: ${clientId}`);
      const documents = await fetchClinicalDocumentsWithRetry(clientId);
      
      if (!documents || documents.length === 0) {
        console.log('No documents found');
        setDocuments([]);
        return { success: true, message: 'No documents found' };
      }

      console.log(`Fetched ${documents.length} clinical documents`);
      setDocuments(documents);
      return { success: true, message: `Fetched ${documents.length} documents` };
    } catch (error) {
      console.error('Error in useDocuments hook:', error);
      setLoadError('Failed to load documents. Please try again later.');
      return { success: false, message: 'Error fetching documents' };
    } finally {
      setIsLoading(false);
    }
  }, [clientId, isLoading, loadError]);
  
  // Debounced version for when rapid calls might occur
  const debouncedFetchDocuments = useCallback(
    debounce(() => fetchDocuments(false), 500, 'fetchDocuments'),
    [fetchDocuments]
  );
  
  // Manual retry with error clearing
  const retryFetch = useCallback(() => {
    return fetchDocuments(true);
  }, [fetchDocuments]);
  
  return {
    documents,
    isLoading,
    loadError,
    fetchDocuments,
    debouncedFetchDocuments,
    retryFetch,
    clearError
  };
}
