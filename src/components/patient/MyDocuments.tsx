
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from '@/components/ui/table';
import { Calendar, Eye, FileText } from 'lucide-react';
import { format } from 'date-fns';
import { useToast } from '@/hooks/use-toast';
import { getCurrentUser, fetchClinicalDocuments, getDocumentDownloadURL } from '@/integrations/supabase/client';

interface ClinicalDocument {
  id: string;
  document_title: string;
  document_type: string;
  document_date: string;
  file_path: string;
  created_at: string;
}

type MyDocumentsProps = {
  clientId?: string;
  excludedTypes?: string[];
};

const MyDocuments: React.FC<MyDocumentsProps> = ({ clientId, excludedTypes = [] }) => {
  const [documents, setDocuments] = useState<ClinicalDocument[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    const loadDocuments = async () => {
      setIsLoading(true);
      try {
        // If clientId is passed as prop, use it; otherwise get current user
        let userId = clientId;
        
        if (!userId) {
          const { user, error } = await getCurrentUser();
          if (error || !user) {
            setIsLoading(false);
            return;
          }
          userId = user.id;
        }
        
        // Fetch all documents
        const allDocs = await fetchClinicalDocuments(userId);
        
        // Filter out excluded document types
        const filteredDocs = excludedTypes.length > 0
          ? allDocs.filter(doc => !excludedTypes.includes(doc.document_type))
          : allDocs;
        
        setDocuments(filteredDocs);
      } catch (error) {
        console.error('Error loading documents:', error);
        toast({
          title: "Error",
          description: "Failed to load your documents",
          variant: "destructive"
        });
      } finally {
        setIsLoading(false);
      }
    };

    loadDocuments();
  }, [clientId, excludedTypes, toast]);

  const handleViewDocument = async (filePath: string) => {
    try {
      const url = await getDocumentDownloadURL(filePath);
      if (url) {
        window.open(url, '_blank');
      } else {
        toast({
          title: "Error",
          description: "Could not retrieve document URL",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('Error viewing document:', error);
      toast({
        title: "Error",
        description: "Failed to open document",
        variant: "destructive"
      });
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Completed Documents</CardTitle>
        <CardDescription>View and download your completed documents</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {isLoading ? (
          <div className="flex justify-center py-8">
            <p>Loading documents...</p>
          </div>
        ) : documents.length === 0 ? (
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
                {documents.map((doc) => (
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
                        onClick={() => handleViewDocument(doc.file_path)}
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
