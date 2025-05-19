
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { DocumentAssignment } from '@/integrations/supabase/client';
import { ClipboardCheck, Loader2, Clock, CheckCircle2, RefreshCw } from 'lucide-react';

interface DocumentAssignmentsListProps {
  assignments: DocumentAssignment[];
  isLoading: boolean;
  onStartForm: (assignment: DocumentAssignment) => void;
  onContinueForm: (assignment: DocumentAssignment) => void;
  onViewCompleted: (assignment: DocumentAssignment) => void;
  onRefresh?: () => void;
  error?: string | null;
  filterStatus?: string[]; // New prop to filter assignments by status
}

const DocumentAssignmentsList: React.FC<DocumentAssignmentsListProps> = ({
  assignments,
  isLoading,
  onStartForm,
  onContinueForm,
  onViewCompleted,
  onRefresh,
  error,
  filterStatus = [] // Default to show all statuses
}) => {
  // Filter assignments based on filterStatus prop
  const filteredAssignments = filterStatus.length > 0
    ? assignments.filter(assignment => filterStatus.includes(assignment.status))
    : assignments;
  
  const getStatusIcon = (status: string) => {
    switch(status) {
      case 'completed':
        return <CheckCircle2 className="h-5 w-5 text-green-500" />;
      case 'in_progress':
        return <Clock className="h-5 w-5 text-amber-500" />;
      default:
        return <ClipboardCheck className="h-5 w-5 text-blue-500" />;
    }
  };

  const getStatusText = (status: string) => {
    switch(status) {
      case 'completed':
        return 'Completed';
      case 'in_progress':
        return 'In Progress';
      case 'not_started':
        return 'Not Started';
      default:
        return 'Pending';
    }
  };

  const renderActionButton = (assignment: DocumentAssignment) => {
    switch(assignment.status) {
      case 'completed':
        return (
          <Button 
            variant="outline"
            onClick={() => onViewCompleted(assignment)}
          >
            View
          </Button>
        );
      case 'in_progress':
        return (
          <Button 
            variant="outline"
            onClick={() => onContinueForm(assignment)}
          >
            Continue
          </Button>
        );
      default:
        return (
          <Button 
            onClick={() => onStartForm(assignment)}
          >
            Start
          </Button>
        );
    }
  };
  
  console.log('Rendering filtered document assignments:', filteredAssignments);

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle className="flex items-center gap-2">
            <ClipboardCheck className="h-5 w-5 text-valorwell-600" />
            Required Forms
          </CardTitle>
          <CardDescription>Please complete all assigned forms</CardDescription>
        </div>
        {onRefresh && (
          <Button 
            variant="ghost" 
            size="icon"
            onClick={onRefresh}
            disabled={isLoading}
            title="Refresh assignments"
          >
            <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
          </Button>
        )}
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-valorwell-600" />
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <ClipboardCheck className="h-12 w-12 text-amber-400 mb-4" />
            <h3 className="text-lg font-medium">Error Loading Forms</h3>
            <p className="text-sm text-gray-500 mt-1 mb-4">
              {error}
            </p>
            {onRefresh && (
              <Button onClick={onRefresh} variant="outline" className="mt-2">
                <RefreshCw className="h-4 w-4 mr-2" />
                Retry
              </Button>
            )}
          </div>
        ) : filteredAssignments.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <ClipboardCheck className="h-12 w-12 text-gray-300 mb-4" />
            <h3 className="text-lg font-medium">No forms assigned</h3>
            <p className="text-sm text-gray-500 mt-1">
              Your therapist will assign forms for you to complete
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredAssignments.map(assignment => (
              <div key={assignment.id} className="flex items-center justify-between p-4 border rounded-md">
                <div className="flex items-center gap-3">
                  {getStatusIcon(assignment.status)}
                  <div>
                    <h4 className="font-medium">{assignment.document_name}</h4>
                    <p className="text-sm text-gray-500">{getStatusText(assignment.status)}</p>
                  </div>
                </div>
                <div>
                  {renderActionButton(assignment)}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default DocumentAssignmentsList;
