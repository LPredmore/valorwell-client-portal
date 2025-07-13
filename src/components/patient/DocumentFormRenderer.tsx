
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { DocumentAssignment, updateDocumentStatus } from '@/integrations/supabase/client';
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
      
      if (isDraft) {
        // For draft saves, only update the assignment status
        const { success: statusUpdateSuccess, error: statusUpdateError } = await updateDocumentStatus(assignment.id, 'in_progress');
        
        if (!statusUpdateSuccess) {
          throw new Error(`Failed to update document status: ${statusUpdateError?.message || 'Unknown error'}`);
        }
        
        toast.success("Progress saved successfully");
        onSave();
      } else {
        // For completion, let handleFormSubmission handle everything
        const documentType = getDocumentType(assignment.document_name);
        
        const documentInfo = {
          clientId: clientId,
          documentType: documentType,
          documentDate: new Date(),
          documentTitle: assignment.document_name,
          createdBy: clientId
        };
        
        if (formData.formElementId) {
          toast.loading("Generating document...", { id: 'pdf-generation' });
          
          // handleFormSubmission does everything: PDF generation, database insert, status update
          const result = await handleFormSubmission(
            formData.formElementId,
            documentInfo,
            assignment.document_name,
            formData
          );
          
          toast.dismiss('pdf-generation');
          
          if (!result.success) {
            throw new Error(`Failed to generate document: ${result.message}`);
          }
          
          console.log(`[DocumentFormRenderer] Document completed successfully at path: ${result.filePath}`);
          toast.success("Document successfully completed!");
          onComplete();
        } else {
          throw new Error('Form has no content to capture');
        }
      }
    } catch (error: any) {
      console.error('[DocumentFormRenderer] Error saving document:', error);
      toast.dismiss('pdf-generation');
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
  
  // Convert ClientProfile to ClientDetails format correctly with all required fields
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
    client_address: clientProfile.client_address || null, // Add the address field
    client_city: clientProfile.client_city || null, // Add the city field
    client_zip_code: clientProfile.client_zip_code || null, // Add the zip code field
    client_time_zone: clientProfile.client_time_zone || null,
    client_minor: clientProfile.client_minor || null,
    client_status: clientProfile.client_status || null,
    client_assigned_therapist: clientProfile.client_assigned_therapist || null,
    client_referral_source: clientProfile.client_referral_source || null,
    client_self_goal: clientProfile.client_self_goal || null,
    client_diagnosis: clientProfile.client_diagnosis || null,
    // Additional required properties with null values
    client_insurance_company_primary: null,
    client_policy_number_primary: null,
    client_group_number_primary: null,
    client_subscriber_name_primary: null,
    client_insurance_type_primary: null,
    client_subscriber_dob_primary: null,
    client_subscriber_relationship_primary: null,
    client_insurance_company_secondary: null,
    client_policy_number_secondary: null,
    client_group_number_secondary: null,
    client_subscriber_name_secondary: null,
    client_insurance_type_secondary: null,
    client_subscriber_dob_secondary: null,
    client_subscriber_relationship_secondary: null,
    client_insurance_company_tertiary: null,
    client_policy_number_tertiary: null,
    client_group_number_tertiary: null,
    client_subscriber_name_tertiary: null,
    client_insurance_type_tertiary: null,
    client_subscriber_dob_tertiary: null,
    client_subscriber_relationship_tertiary: null,
    client_planlength: null,
    client_treatmentfrequency: null,
    client_problem: null,
    client_treatmentgoal: null,
    client_primaryobjective: null,
    client_secondaryobjective: null,
    client_tertiaryobjective: null,
    client_intervention1: null,
    client_intervention2: null,
    client_intervention3: null,
    client_intervention4: null,
    client_intervention5: null,
    client_intervention6: null,
    client_nexttreatmentplanupdate: null,
    client_privatenote: null,
    client_appearance: null,
    client_attitude: null,
    client_behavior: null,
    client_speech: null,
    client_affect: null,
    client_thoughtprocess: null,
    client_perception: null,
    client_orientation: null,
    client_memoryconcentration: null,
    client_insightjudgement: null,
    client_mood: null,
    client_substanceabuserisk: null,
    client_suicidalideation: null,
    client_homicidalideation: null,
    client_functioning: null,
    client_prognosis: null,
    client_progress: null,
    client_sessionnarrative: null,
    client_medications: null,
    client_personsinattendance: null,
    client_currentsymptoms: null,
    client_vacoverage: null,
    client_champva: null,
    client_tricare_beneficiary_category: null,
    client_tricare_sponsor_name: null,
    client_tricare_sponsor_branch: null,
    client_tricare_sponsor_id: null,
    client_tricare_plan: null,
    client_tricare_region: null,
    client_tricare_policy_id: null,
    client_tricare_has_referral: null,
    client_tricare_referral_number: null,
    client_recentdischarge: null,
    client_branchOS: null,
    client_disabilityrating: null,
    client_relationship: null,
    client_veteran_relationship: null,
    client_situation_explanation: null,
    client_mental_health_referral: null,
    client_other_insurance: null,
    client_champva_agreement: null,
    client_tricare_insurance_agreement: null,
    hasMoreInsurance: null,
    client_has_even_more_insurance: null
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
        {isSubmitting && (
          <div className="text-sm text-muted-foreground">
            Processing document...
          </div>
        )}
      </CardFooter>
    </Card>
  );
};

export default DocumentFormRenderer;
