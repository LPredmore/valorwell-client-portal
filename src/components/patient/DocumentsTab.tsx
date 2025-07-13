import React, { useState, useEffect } from 'react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { FileText, ClipboardCheck, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import DocumentAssignmentsList from '@/components/patient/DocumentAssignmentsList';
import DocumentFormRenderer from '@/components/patient/DocumentFormRenderer';
import MyDocuments from '@/components/patient/MyDocuments';
import { useAuth } from '@/context/NewAuthContext';
import { useDocumentAssignments } from '@/hooks/useDocumentAssignments';
import { DocumentAssignment } from '@/integrations/supabase/client';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

const DocumentsTab: React.FC = () => {
  const [selectedAssignment, setSelectedAssignment] = useState<DocumentAssignment | null>(null);
  const [isFormMode, setIsFormMode] = useState(false);
  const [activeTab, setActiveTab] = useState('assignments');
  const { userId } = useAuth();
  
  const {
    assignments,
    isLoading: assignmentsLoading,
    loadError: assignmentsError,
    fetchAssignments,
    retryFetch: retryAssignmentsFetch
  } = useDocumentAssignments(userId || undefined);

  // Initial load of assignments
  useEffect(() => {
    if (userId) {
      console.log('Initial fetch of assignments on mount or userId change');
      fetchAssignments();
    }
  }, [userId]);

  const handleStartForm = (assignment: DocumentAssignment) => {
    console.log('Starting form:', assignment);
    setSelectedAssignment(assignment);
    setIsFormMode(true);
  };

  const handleContinueForm = (assignment: DocumentAssignment) => {
    console.log('Continuing form:', assignment);
    setSelectedAssignment(assignment);
    setIsFormMode(true);
  };

  const handleViewCompleted = (assignment: DocumentAssignment) => {
    console.log('Viewing completed form:', assignment);
    toast("Viewing " + assignment.document_name);
  };

  const handleCancelForm = () => {
    console.log('Canceling form editing');
    setIsFormMode(false);
    setSelectedAssignment(null);
  };

  const handleSaveForm = () => {
    console.log('Form saved');
    setIsFormMode(false);
    setSelectedAssignment(null);
    
    // Refresh the assignments list after saving
    if (userId) {
      console.log('Refreshing assignments after form save');
      fetchAssignments(true);
    }
  };

  const handleCompleteForm = () => {
    console.log('Form completed');
    toast("Thank you for submitting your form.");
    
    setIsFormMode(false);
    setSelectedAssignment(null);
    
    // Refresh the assignments list after completing
    if (userId) {
      console.log('Refreshing assignments after form completion');
      fetchAssignments(true);
    }
  };

  const handleRefreshAssignments = () => {
    console.log('Manually refreshing document assignments via button click');
    if (userId) {
      retryAssignmentsFetch();
    }
  };

  // Get completed assignments for MyDocuments component
  const completedAssignments = assignments.filter(assignment => assignment.status === 'completed');

  if (!userId) {
    return (
      <div className="space-y-6">
        <h2 className="text-2xl font-semibold">Patient Documents</h2>
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Authentication Required</AlertTitle>
          <AlertDescription>
            Please log in to view your documents.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-semibold">Patient Documents</h2>
        <div className="flex items-center gap-2">
          <FileText className="h-5 w-5 text-primary" />
          <span className="text-sm text-muted-foreground">Manage your forms and documents</span>
        </div>
      </div>
      
      {isFormMode && selectedAssignment && userId ? (
        <DocumentFormRenderer
          assignment={selectedAssignment}
          clientId={userId}
          onSave={handleSaveForm}
          onCancel={handleCancelForm}
          onComplete={handleCompleteForm}
        />
      ) : (
        <Tabs defaultValue={activeTab} onValueChange={setActiveTab}>
          <TabsList className="mb-6">
            <TabsTrigger value="assignments" className="flex items-center gap-1">
              <ClipboardCheck className="h-4 w-4" />
              Assigned Documents
            </TabsTrigger>
            <TabsTrigger value="documents" className="flex items-center gap-1">
              <FileText className="h-4 w-4" />
              Completed Documents
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="assignments" className="mt-0">
            <DocumentAssignmentsList
              assignments={assignments}
              isLoading={assignmentsLoading}
              onStartForm={handleStartForm}
              onContinueForm={handleContinueForm}
              onViewCompleted={handleViewCompleted}
              onRefresh={handleRefreshAssignments}
              error={assignmentsError}
              filterStatus={['not_started', 'in_progress']}
            />
          </TabsContent>
          
          <TabsContent value="documents" className="mt-0">
            <MyDocuments 
              clientId={userId} 
              excludedTypes={['session_note', 'treatment_plan']} 
              completedAssignments={completedAssignments}
            />
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
};

export default DocumentsTab;