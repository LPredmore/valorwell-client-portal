
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { DocumentAssignment, updateDocumentStatus, saveDocumentSubmission } from '@/integrations/supabase/client';
import ClientHistoryTemplate from '@/components/templates/ClientHistoryTemplate';
import InformedConsentTemplate from '@/components/templates/InformedConsentTemplate';
import { handleFormSubmission, CLINICAL_DOCUMENTS_BUCKET } from '@/utils/formSubmissionUtils';
import { useAuth } from '@/context/NewAuthContext';
import { ClientDetails } from '@/types/client';

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
  const { clientProfile } = useAuth();
  
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
        // Generate the proper document type based on the assignment name
        const documentType = getDocumentType(assignment.document_name);
        
        // Create the document info object with proper client ID
        const documentInfo = {
          clientId: clientId,
          documentType: documentType,
          documentDate: new Date(),
          documentTitle: assignment.document_name,
          createdBy: clientId // Using clientId instead of the string 'client'
        };
        
        if (formData.formElementId) {
          // Use the formSubmissionUtils helper to generate and upload PDF
          const result = await handleFormSubmission(
            formData.formElementId,
            documentInfo,
            assignment.document_name,
            formData
          );
          
          if (!result.success) {
            throw new Error(`Failed to generate PDF: ${result.message}`);
          }
          
          formData.pdf_path = result.filePath;
          
          // Log the file path for debugging
          console.log(`[DocumentFormRenderer] Document PDF generated at path: ${result.filePath} in bucket: ${CLINICAL_DOCUMENTS_BUCKET}`);
        } else {
          console.warn('[DocumentFormRenderer] Form has no formElementId to capture');
        }
        
        // Save the document record
        const documentData = {
          client_id: clientId,
          document_type: documentType,
          document_title: assignment.document_name,
          document_date: new Date().toISOString().split('T')[0],
          file_path: formData.pdf_path || '', // Use the file path from PDF generation
          created_by: clientId // Using clientId instead of the string 'client'
        };
        
        // Validate document data before saving
        if (!documentData.file_path) {
          console.error('[DocumentFormRenderer] Missing file_path in document data');
          throw new Error('Document file path is missing');
        }
        
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
  
  // Convert ClientProfile to ClientDetails format
  const clientData: ClientDetails | null = clientProfile ? {
    id: clientProfile.id,
    client_first_name: clientProfile.client_first_name || null,
    client_last_name: clientProfile.client_last_name || null,
    client_preferred_name: clientProfile.client_preferred_name || null,
    client_email: clientProfile.client_email || null,
    client_phone: clientProfile.client_phone || null,
    client_date_of_birth: clientProfile.client_date_of_birth || null,
    client_age: clientProfile.client_age || null,
    client_gender: clientProfile.client_gender || null,
    client_gender_identity: clientProfile.client_gender_identity || null,
    client_state: clientProfile.client_state || null,
    client_time_zone: clientProfile.client_time_zone || null,
    client_minor: clientProfile.client_minor || null,
    client_status: clientProfile.client_status || null,
    client_assigned_therapist: clientProfile.client_assigned_therapist || null,
    client_referral_source: clientProfile.client_referral_source || null,
    client_self_goal: clientProfile.client_self_goal || null,
    client_diagnosis: clientProfile.client_diagnosis || null,
  } : null;
  
  const renderForm = () => {
    switch(assignment.document_name) {
      case 'Client History Form':
        return (
          <ClientHistoryTemplate 
            onClose={onCancel}
            onSubmit={(data) => handleSave(data, false)}
            clientData={clientData}
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
