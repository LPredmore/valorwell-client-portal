
import React, { useState, useEffect } from 'react';
import Layout from '@/components/layout/Layout';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { FileText, ClipboardCheck } from 'lucide-react';
import { fetchDocumentAssignments, DocumentAssignment } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import DocumentAssignmentsList from '@/components/patient/DocumentAssignmentsList';
import DocumentFormRenderer from '@/components/patient/DocumentFormRenderer';
import MyDocuments from '@/components/patient/MyDocuments';
import { useAuth } from '@/context/NewAuthContext';

const PatientDocuments: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [assignments, setAssignments] = useState<DocumentAssignment[]>([]);
  const [selectedAssignment, setSelectedAssignment] = useState<DocumentAssignment | null>(null);
  const [isFormMode, setIsFormMode] = useState(false);
  const [activeTab, setActiveTab] = useState('assignments');
  const { toast } = useToast();
  const { userId } = useAuth();

  useEffect(() => {
    const loadAssignments = async () => {
      setLoading(true);
      try {
        if (!userId) {
          console.error('No user ID available - cannot load documents');
          toast({
            title: "Authentication required",
            description: "Please log in to view your documents",
            variant: "destructive"
          });
          return;
        }
        
        console.log('Loading document assignments for user ID:', userId);
        
        // Fetch the document assignments for this user
        const { data, error: assignmentsError } = await fetchDocumentAssignments(userId);
        if (assignmentsError) {
          console.error('Error loading document assignments:', assignmentsError);
          toast({
            title: "Error",
            description: "Failed to load document assignments",
            variant: "destructive"
          });
          return;
        }
        
        if (data) {
          console.log('Loaded document assignments:', data);
          setAssignments(data);
        } else {
          console.log('No document assignments found');
          setAssignments([]);
        }
      } catch (error) {
        console.error('Exception while loading assignments:', error);
        toast({
          title: "Error",
          description: "Failed to load document assignments",
          variant: "destructive"
        });
      } finally {
        setLoading(false);
      }
    };

    loadAssignments();
  }, [toast, userId]);

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
    // In a real application, this would open the completed form
    console.log('Viewing completed form:', assignment);
    toast({
      title: "View Completed Form",
      description: `Viewing ${assignment.document_name}`,
    });
  };

  const handleCancelForm = () => {
    console.log('Canceling form editing');
    setIsFormMode(false);
    setSelectedAssignment(null);
  };

  const handleSaveForm = () => {
    console.log('Form saved, refreshing assignments');
    // Refresh the assignments list after saving
    if (userId) {
      fetchDocumentAssignments(userId).then(({ data }) => {
        if (data) {
          setAssignments(data);
        }
      });
    }
    
    setIsFormMode(false);
    setSelectedAssignment(null);
  };

  const handleCompleteForm = () => {
    console.log('Form completed, refreshing assignments');
    // Refresh the assignments list after completing
    if (userId) {
      fetchDocumentAssignments(userId).then(({ data }) => {
        if (data) {
          setAssignments(data);
        }
      });
    }
    
    toast({
      title: "Form Completed",
      description: "Thank you for submitting your form.",
    });
    
    setIsFormMode(false);
    setSelectedAssignment(null);
  };

  const handleRefreshAssignments = () => {
    console.log('Refreshing document assignments');
    if (userId) {
      fetchDocumentAssignments(userId).then(({ data }) => {
        if (data) {
          console.log('Refreshed assignments:', data);
          setAssignments(data);
        }
      });
    }
  };

  return (
    <Layout>
      <div className="flex flex-col gap-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold tracking-tight">Patient Documents</h1>
          <div className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-valorwell-600" />
            <span className="text-sm text-gray-500">Manage your forms and documents</span>
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
                isLoading={loading}
                onStartForm={handleStartForm}
                onContinueForm={handleContinueForm}
                onViewCompleted={handleViewCompleted}
                onLoadComplete={handleRefreshAssignments}
              />
            </TabsContent>
            
            <TabsContent value="documents" className="mt-0">
              <MyDocuments clientId={userId || undefined} excludedTypes={['session_note', 'treatment_plan']} />
            </TabsContent>
          </Tabs>
        )}
      </div>
    </Layout>
  );
};

export default PatientDocuments;
