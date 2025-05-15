
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { DocumentAssignment } from '@/integrations/supabase/client';
import InformedConsentTemplate from '../templates/InformedConsentTemplate';
import ClientHistoryTemplate from '../templates/ClientHistoryTemplate';
import PHQ9Template from '../templates/PHQ9Template';
import GAD7Template from '../templates/GAD7Template';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Save } from 'lucide-react';

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
  onComplete,
}) => {
  // Adding a default clinician name - this would ideally come from a context or prop
  const defaultClinicianName = "Provider"; // Default value
  
  // Render the appropriate form based on document name/type
  const renderFormTemplate = () => {
    switch (assignment.document_name) {
      case 'Informed Consent':
        return (
          <InformedConsentTemplate 
            onClose={onComplete}
          />
        );
      case 'Client History':
        return (
          <ClientHistoryTemplate 
            onClose={onComplete}
          />
        );
      case 'PHQ-9 Assessment':
        return (
          <PHQ9Template 
            onClose={onComplete}
            clinicianName={defaultClinicianName}
          />
        );
      case 'GAD-7 Assessment':
        return (
          <GAD7Template 
            onClose={onComplete}
            clinicianName={defaultClinicianName}
          />
        );
      default:
        return (
          <Card>
            <CardHeader>
              <CardTitle>Form Not Available</CardTitle>
              <CardDescription>
                The form template for {assignment.document_name} is not currently available.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex justify-end gap-4">
              <Button variant="outline" onClick={onCancel}>
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back
              </Button>
            </CardContent>
          </Card>
        );
    }
  };

  return (
    <div className="w-full">
      <div className="mb-4 flex items-center justify-between">
        <Button variant="outline" onClick={onCancel}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Documents
        </Button>
      </div>
      
      {renderFormTemplate()}
    </div>
  );
};

export default DocumentFormRenderer;
