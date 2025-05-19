
import { supabase, getCurrentUser, fetchClinicalDocuments, fetchDocumentAssignments } from '@/integrations/supabase/client';
import { fetchWithRetry } from './fetchUtils';
import { toast } from 'sonner';

/**
 * Enhanced version of fetchClinicalDocuments with retry logic
 */
export async function fetchClinicalDocumentsWithRetry(clientId: string) {
  return fetchWithRetry(
    () => fetchClinicalDocuments(clientId),
    {
      maxRetries: 3,
      retryDelay: 1000,
      onError: (error, retryCount) => {
        console.warn(`Error fetching clinical documents (attempt ${retryCount}/3):`, error);
      },
      onFinalError: (error) => {
        console.error('Failed to fetch clinical documents after multiple attempts:', error);
        toast.error('Failed to load documents after several attempts');
      }
    }
  );
}

/**
 * Enhanced version of fetchDocumentAssignments with retry logic
 */
export async function fetchDocumentAssignmentsWithRetry(clientId: string) {
  return fetchWithRetry(
    () => fetchDocumentAssignments(clientId),
    {
      maxRetries: 3,
      retryDelay: 1000,
      onError: (error, retryCount) => {
        console.warn(`Error fetching document assignments (attempt ${retryCount}/3):`, error);
      },
      onFinalError: (error) => {
        console.error('Failed to fetch document assignments after multiple attempts:', error);
        // We don't show a toast here as the component will handle the error display
      }
    }
  );
}

/**
 * Enhanced version of getCurrentUser with retry logic
 */
export async function getCurrentUserWithRetry() {
  return fetchWithRetry(
    () => getCurrentUser(),
    {
      maxRetries: 3,
      retryDelay: 1000,
      onError: (error, retryCount) => {
        console.warn(`Error fetching current user (attempt ${retryCount}/3):`, error);
      },
      onFinalError: (error) => {
        console.error('Failed to fetch current user after multiple attempts:', error);
        toast.error('Failed to verify your identity after several attempts');
      }
    }
  );
}

/**
 * Enhanced version of getDocumentDownloadURL with retry logic
 */
export async function getDocumentDownloadURLWithRetry(filePath: string) {
  if (!filePath) {
    console.error('Invalid file path provided');
    return null;
  }

  return fetchWithRetry(
    async () => {
      const { data, error } = await supabase.storage
        .from('clinical_documents')
        .createSignedUrl(filePath, 60 * 60); // URL valid for 1 hour

      if (error) {
        throw error;
      }

      if (!data?.signedUrl) {
        throw new Error('No signed URL returned from Storage API');
      }

      return data.signedUrl;
    },
    {
      maxRetries: 2, // Less retries for URL generation as it's less likely to succeed with retries
      retryDelay: 500,
    }
  );
}
