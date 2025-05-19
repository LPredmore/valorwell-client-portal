
import React, { useState } from 'react';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { DocumentAssignment, updateDocumentStatus, saveDocumentSubmission } from '@/integrations/supabase/client';
import ClientHistoryTemplate from '@/components/templates/ClientHistoryTemplate';
import InformedConsentTemplate from '@/components/templates/InformedConsentTemplate';

interface DocumentFormRendererProps {
  assignment: DocumentAssignment;
  clientId: string;
  onSave: () => void;
  onCancel: () => void;
  onComplete: () => void;
}

const DocumentFormRenderer: React.FC<DocumentFormRendererProps> = ({
  assignment,
  clientId,
  onSave,
  onCancel,
  onComplete
}) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const handleSave = async (formData: any, isDraft = true) => {
    setIsSubmitting(true);
    
    try {
      console.log('[DocumentFormRenderer] Saving form data:', formData);
      console.log('[DocumentFormRenderer] Client ID:', clientId);
      console.log('[DocumentFormRenderer] Assignment:', assignment);
      
      // Update the assignment status
      const newStatus = isDraft ? 'in_progress' : 'completed';
      const { success: statusUpdateSuccess, error: statusUpdateError } = await updateDocumentStatus(assignment.id, newStatus);
      
      if (!statusUpdateSuccess) {
        throw new Error(`Failed to update document status: ${statusUpdateError?.message || 'Unknown error'}`);
      }
      
      // If completed, save to clinical_documents
      if (!isDraft) {
        // Save the PDF path and document data
        const documentData = {
          client_id: clientId,
          document_type: getDocumentType(assignment.document_name),
          document_title: assignment.document_name,
          document_date: new Date().toISOString().split('T')[0],
          file_path: formData.pdf_path || `${clientId}/${getDocumentType(assignment.document_name)}_${Date.now()}.pdf`,
          created_by: 'client' // Indicates this was filled out by the client
        };
        
        const { success: documentSaveSuccess, error: documentSaveError } = await saveDocumentSubmission(documentData);
        
        if (!documentSaveSuccess) {
          throw new Error(`Failed to save document data: ${documentSaveError?.message || 'Unknown error'}`);
        }
        
        toast.success("Document successfully completed!");
        onComplete();
      } else {
        toast.success("Progress saved successfully");
        onSave();
      }
    } catch (error: any) {
      console.error('[DocumentFormRenderer] Error saving document:', error);
      toast.error(`Error: ${error.message || 'Failed to save document'}`);
    } finally {
      setIsSubmitting(false);
    }
  };
  
  const getDocumentType = (documentName: string): string => {
    // Map document names to types
    const typeMap: Record<string, string> = {
      'Client History Form': 'client_history',
      'Informed Consent': 'informed_consent',
    };
    
    return typeMap[documentName] || documentName.toLowerCase().replace(/\s+/g, '_');
  };
  
  const renderForm = () => {
    switch(assignment.document_name) {
      case 'Client History Form':
        return (
          <ClientHistoryTemplate 
            onClose={onCancel}
            onSubmit={(data) => handleSave(data, false)}
          />
        );
      case 'Informed Consent':
        return (
          <InformedConsentTemplate 
            onClose={onCancel}
            onSubmit={(data) => handleSave(data, false)}
          />
        );
      default:
        return (
          <div className="p-8 text-center">
            <p>This document type is not yet supported for online completion.</p>
          </div>
        );
    }
  };
  
  return (
    <Card className="border-2 border-blue-100">
      <CardHeader className="bg-blue-50/50">
        <CardTitle>{assignment.document_name}</CardTitle>
      </CardHeader>
      
      <CardContent className="p-0">
        {renderForm()}
      </CardContent>
      
      <CardFooter className="flex justify-between bg-blue-50/50 p-4">
        <Button 
          variant="outline" 
          onClick={onCancel} 
          disabled={isSubmitting}
        >
          Cancel
        </Button>
      </CardFooter>
    </Card>
  );
};

export default DocumentFormRenderer;
