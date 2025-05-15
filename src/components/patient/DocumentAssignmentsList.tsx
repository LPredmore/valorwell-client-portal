
import React, { useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from '@/components/ui/table';
import { AlertTriangle, Calendar, ClipboardCheck, Edit, Eye } from 'lucide-react';
import { format } from 'date-fns';
import { useToast } from '@/hooks/use-toast';
import { 
  DocumentAssignment, 
  updateDocumentStatus 
} from '@/integrations/supabase/client';
import { useAutoAssignDocuments } from '@/utils/documentAssignmentUtils';
import { useUser } from '@/context/UserContext';

interface DocumentAssignmentsListProps {
  assignments: DocumentAssignment[];
  isLoading: boolean;
  onStartForm: (assignment: DocumentAssignment) => void;
  onContinueForm: (assignment: DocumentAssignment) => void;
  onViewCompleted: (assignment: DocumentAssignment) => void;
  onLoadComplete?: () => void;
}

const DocumentAssignmentsList: React.FC<DocumentAssignmentsListProps> = ({
  assignments,
  isLoading,
  onStartForm,
  onContinueForm,
  onViewCompleted,
  onLoadComplete
}) => {
  const { toast } = useToast();
  const { userId } = useUser();
  
  // Automatically assign required documents if needed
  useAutoAssignDocuments(userId);
  
  useEffect(() => {
    if (!isLoading && onLoadComplete) {
      onLoadComplete();
    }
  }, [isLoading, onLoadComplete]);
  
  const handleStartForm = async (assignment: DocumentAssignment) => {
    try {
      // Update the status to in_progress
      if (assignment.status === 'not_started') {
        const result = await updateDocumentStatus(assignment.id, 'in_progress');
        if (!result.success) {
          throw new Error('Failed to update document status');
        }
      }
      onStartForm(assignment);
    } catch (error) {
      console.error('Error starting form:', error);
      toast({
        title: "Error",
        description: "Failed to start the form. Please try again.",
        variant: "destructive"
      });
    }
  };

  // Map document types to their corresponding labels
  const getDocumentTypeLabel = (documentName: string) => {
    switch(documentName) {
      case 'Informed Consent':
        return 'Consent Form';
      case 'Client History':
        return 'History Form';
      case 'PHQ-9 Assessment':
        return 'Depression Screening';
      case 'GAD-7 Assessment':
        return 'Anxiety Screening';
      default:
        return 'Form';
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Assigned Documents</CardTitle>
        <CardDescription>
          Please complete all assigned forms and documents
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {isLoading ? (
          <div className="flex justify-center py-8">
            <p>Loading assignments...</p>
          </div>
        ) : assignments.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <ClipboardCheck className="h-12 w-12 text-gray-300 mb-3" />
            <h3 className="text-lg font-medium">No assigned documents</h3>
            <p className="text-sm text-gray-500 mt-1">
              You don't have any assigned documents at this time
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Date Assigned</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {assignments.map((assignment) => {
                  const isNotStarted = assignment.status === 'not_started';
                  const isInProgress = assignment.status === 'in_progress';
                  const isCompleted = assignment.status === 'completed';
                  
                  return (
                    <TableRow key={assignment.id}>
                      <TableCell className="font-medium">{assignment.document_name}</TableCell>
                      <TableCell>{getDocumentTypeLabel(assignment.document_name)}</TableCell>
                      <TableCell>
                        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                          isNotStarted
                            ? 'bg-gray-100 text-gray-800'
                            : isInProgress
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-green-100 text-green-800'
                        }`}>
                          {isNotStarted ? (
                            <AlertTriangle className="h-3 w-3 mr-1" />
                          ) : isInProgress ? (
                            <Edit className="h-3 w-3 mr-1" />
                          ) : (
                            <ClipboardCheck className="h-3 w-3 mr-1" />
                          )}
                          {isNotStarted
                            ? 'Not Started'
                            : isInProgress
                            ? 'In Progress'
                            : 'Completed'}
                        </span>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Calendar className="h-4 w-4 text-gray-500" />
                          {format(new Date(assignment.created_at), 'MMM d, yyyy')}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        {isCompleted ? (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => onViewCompleted(assignment)}
                          >
                            <Eye className="h-4 w-4 mr-1" />
                            View
                          </Button>
                        ) : isInProgress ? (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => onContinueForm(assignment)}
                          >
                            <Edit className="h-4 w-4 mr-1" />
                            Continue
                          </Button>
                        ) : (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleStartForm(assignment)}
                          >
                            <ClipboardCheck className="h-4 w-4 mr-1" />
                            Start
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default DocumentAssignmentsList;
