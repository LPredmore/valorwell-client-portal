
import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { FileText, Save, Check } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { DocumentAssignment, updateDocumentStatus } from '@/integrations/supabase/client';
import InformedConsentTemplate from '@/components/templates/InformedConsentTemplate';
import ClientHistoryTemplate from '@/components/templates/ClientHistoryTemplate';

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
  const [isSaving, setIsSaving] = useState(false);
  const { toast } = useToast();
  
  // Handle saving draft (mark as in_progress)
  const handleSaveDraft = async () => {
    setIsSaving(true);
    try {
      // Update the document status to in_progress
      const result = await updateDocumentStatus(assignment.id, 'in_progress');
      
      if (result.success) {
        toast({
          title: "Progress saved",
          description: "Your information has been saved as a draft.",
        });
        
        onSave();
      } else {
        throw new Error("Failed to update document status");
      }
    } catch (error) {
      console.error('Error saving draft:', error);
      toast({
        title: "Error",
        description: "Failed to save your progress",
        variant: "destructive"
      });
    } finally {
      setIsSaving(false);
    }
  };
  
  // Render different forms based on document_name
  const renderFormContent = () => {
    switch (assignment.document_name) {
      case "Client History Form":
        return (
          <ClientHistoryTemplate
            onClose={onComplete}
            onSubmit={() => {
              // Mark the document as completed
              updateDocumentStatus(assignment.id, 'completed');
            }}
          />
        );
      case "Informed Consent":
        return (
          <InformedConsentTemplate
            onClose={onComplete}
          />
        );
      default:
        return (
          <div className="p-6 text-center">
            <p className="text-lg font-medium text-red-500 mb-2">Unsupported Document Type</p>
            <p>The document type "{assignment.document_name}" is not currently supported.</p>
          </div>
        );
    }
  };
  
  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-2xl font-bold flex items-center gap-2">
          <FileText className="h-6 w-6" />
          {assignment.document_name}
        </h2>
        <Button variant="outline" onClick={onCancel}>
          Back to Documents
        </Button>
      </div>
      
      {renderFormContent()}
    </div>
  );
};

export default DocumentFormRenderer;
