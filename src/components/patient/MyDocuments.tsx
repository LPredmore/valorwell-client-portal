
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from '@/components/ui/table';
import { Calendar, Eye, FileText, Loader2, RefreshCw } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { getCurrentUser, fetchClientHistoryData } from '@/integrations/supabase/client';
import { useDocuments } from '@/hooks/useDocuments';
import { getDocumentDownloadURLWithRetry } from '@/utils/enhancedFetching';
import ClientHistoryViewDialog from './ClientHistoryViewDialog';

type MyDocumentsProps = {
  clientId?: string;
  excludedTypes?: string[];
};

const MyDocuments: React.FC<MyDocumentsProps> = ({ clientId, excludedTypes = [] }) => {
  const [userId, setUserId] = useState<string | undefined>(clientId);
  const [userLoading, setUserLoading] = useState<boolean>(!clientId);
  const [userError, setUserError] = useState<string | null>(null);
  const [isHistoryDialogOpen, setIsHistoryDialogOpen] = useState(false);
  const [historyData, setHistoryData] = useState<any>(null);
  const [isHistoryLoading, setIsHistoryLoading] = useState(false);
  
  const { 
    documents, 
    isLoading: docsLoading, 
    loadError: docsError, 
    fetchDocuments, 
    retryFetch 
  } = useDocuments(userId);

  // Filter documents based on excludedTypes
  const filteredDocuments = excludedTypes.length > 0
    ? documents.filter(doc => !excludedTypes.includes(doc.document_type))
    : documents;

  // Only fetch current user if no clientId is provided - only run ONCE
  useEffect(() => {
    if (!clientId && !userId) {
      const fetchCurrentUser = async () => {
        setUserLoading(true);
        setUserError(null);
        
        try {
          const { user, error } = await getCurrentUser();
          
          if (error || !user) {
            console.error('Error getting current user:', error);
            setUserError('Could not verify your identity. Please try again.');
            return;
          }
          
          setUserId(user.id);
        } catch (error) {
          console.error('Exception getting current user:', error);
          setUserError('Could not verify your identity. Please try again.');
        } finally {
          setUserLoading(false);
        }
      };
      
      fetchCurrentUser();
    }
  }, [clientId, userId]);

  // Fetch documents once we have a user ID - only run ONCE when userId changes
  useEffect(() => {
    if (userId) {
      console.log(`Initial document fetch for user ${userId}`);
      fetchDocuments(false);
    }
  }, [userId]); // Only depend on userId, NOT fetchDocuments

  const handleViewDocument = async (document: any) => {
    try {
      // For Client History documents, use the special dialog instead of PDF
      if (document.document_type === 'client_history') {
        await fetchClientHistoryForm(document.client_id);
        return;
      }
      
      // For other document types, use the regular PDF viewer
      if (!document.file_path) {
        toast.error("Document path is missing");
        return;
      }
      
      console.log('Getting document URL for file path:', document.file_path);
      const url = await getDocumentDownloadURLWithRetry(document.file_path);
      
      if (url) {
        console.log('Opening document URL');
        window.open(url, '_blank');
      } else {
        toast.error("Could not retrieve document URL");
      }
    } catch (error) {
      console.error('Error viewing document:', error);
      toast.error("Failed to open document");
    }
  };
  
  const fetchClientHistoryForm = async (clientId: string) => {
    try {
      setIsHistoryLoading(true);
      
      const { success, data, error } = await fetchClientHistoryData(clientId);
      
      if (success && data) {
        setHistoryData(data);
        setIsHistoryDialogOpen(true);
      } else {
        console.error('Error fetching client history:', error);
        toast.error("Could not load client history data");
      }
    } catch (error) {
      console.error('Exception fetching client history:', error);
      toast.error("Failed to load client history");
    } finally {
      setIsHistoryLoading(false);
    }
  };

  const handleRefresh = () => {
    console.log('Manual document refresh requested');
    if (userId) {
      retryFetch();
    } else if (!clientId) {
      setUserLoading(true);
      setUserError(null);
      // Re-fetch current user and documents
      getCurrentUser().then(({ user, error }) => {
        if (error || !user) {
          setUserError('Could not verify your identity. Please try again.');
          setUserLoading(false);
          return;
        }
        setUserId(user.id);
        setUserLoading(false);
      });
    }
  };

  const isLoading = userLoading || docsLoading;
  const errorMessage = userError || docsError;

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Completed Documents</CardTitle>
            <CardDescription>View and download your completed documents</CardDescription>
          </div>
          <Button 
            variant="ghost" 
            size="icon"
            onClick={handleRefresh}
            disabled={isLoading}
            title="Refresh documents"
          >
            <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
          </Button>
        </CardHeader>
        <CardContent className="space-y-4">
          {isLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-valorwell-600" />
            </div>
          ) : errorMessage ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <FileText className="h-12 w-12 text-amber-400 mb-3" />
              <h3 className="text-lg font-medium text-amber-700">Error loading documents</h3>
              <p className="text-sm text-gray-500 mt-1 mb-4">{errorMessage}</p>
              <Button onClick={handleRefresh} variant="outline">
                <RefreshCw className="h-4 w-4 mr-2" />
                Retry
              </Button>
            </div>
          ) : filteredDocuments.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <FileText className="h-12 w-12 text-gray-300 mb-3" />
              <h3 className="text-lg font-medium">No documents available</h3>
              <p className="text-sm text-gray-500 mt-1">
                {excludedTypes.length > 0 
                  ? "You haven't completed any documents yet" 
                  : "Your therapist will add documents here"}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Title</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredDocuments.map((doc) => (
                    <TableRow key={doc.id}>
                      <TableCell className="font-medium">{doc.document_title}</TableCell>
                      <TableCell>{formatDocumentType(doc.document_type)}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Calendar className="h-4 w-4 text-gray-500" />
                          {format(new Date(doc.document_date), 'MMM d, yyyy')}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleViewDocument(doc)}
                        >
                          <Eye className="h-4 w-4 mr-1" />
                          View
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
      
      <ClientHistoryViewDialog 
        isOpen={isHistoryDialogOpen}
        onClose={() => setIsHistoryDialogOpen(false)}
        data={historyData}
        isLoading={isHistoryLoading}
      />
    </>
  );
};

// Helper function to format document types for display
const formatDocumentType = (type: string): string => {
  const typeMap: Record<string, string> = {
    'informed_consent': 'Informed Consent',
    'client_history': 'Client History',
    'treatment_plan': 'Treatment Plan',
    'session_note': 'Session Note',
    'phq9': 'PHQ-9 Assessment',
    'gad7': 'GAD-7 Assessment',
  };
  
  return typeMap[type] || type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
};

export default MyDocuments;
