
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import NewLayout from '@/components/layout/NewLayout';
import { toast } from 'sonner';
import { useAuth } from '@/context/NewAuthContext';
import { useTherapistSelection } from '@/hooks/useTherapistSelection';
import { Loader } from 'lucide-react';
import { TherapistSelectionDebugger } from '@/debug/therapistSelectionDebugger';

const TherapistSelection = () => {
  const navigate = useNavigate();
  const [selectedTherapist, setSelectedTherapist] = useState<string | null>(null);
  
  // Get client data from auth context
  const { clientProfile } = useAuth();
  const clientState = clientProfile?.client_state || null;
  const clientAge = clientProfile?.client_age || 18;
  
  // Add console logs to verify client data
  console.log('[TherapistSelection] Client profile:', clientProfile);
  console.log('[TherapistSelection] Client state:', clientState);
  console.log('[TherapistSelection] Client age:', clientAge);

  // Use the therapist selection hook to get real therapist data
  const { 
    therapists, 
    loading, 
    error, 
    filteringApplied,
    retryFetch,
    selectTherapist,
    selectingTherapistId
  } = useTherapistSelection({
    clientState,
    clientAge,
    enableFiltering: true
  });

  // Run verification checks when therapists are loaded
  useEffect(() => {
    if (!loading && !error && therapists.length > 0) {
      console.log('[TherapistSelection] Running verification checks');
      TherapistSelectionDebugger.runAllChecks(
        clientProfile?.id || null,
        clientState,
        therapists
      );
    }
  }, [loading, error, therapists, clientProfile, clientState]);

  // Track if any submission is in progress (either our local state or from the hook)
  const isSubmitting = !!selectingTherapistId;

  const handleSelectTherapist = (therapistId: string) => {
    setSelectedTherapist(therapistId);
  };

  const handleSubmit = async () => {
    if (!selectedTherapist) {
      toast.error("Please select a therapist to continue");
      return;
    }
    
    try {
      const success = await selectTherapist(selectedTherapist);
      
      if (success) {
        // If successful, navigate to dashboard
        navigate('/patient-dashboard');
      }
    } catch (error) {
      console.error("Error selecting therapist:", error);
      toast.error("Failed to select therapist, please try again");
    }
  };

  // Helper function to get appropriate title prefix for therapist
  const getTherapistTitle = (therapist: any) => {
    const type = therapist?.clinician_type?.toLowerCase() || '';
    
    if (type.includes('psychologist') || type.includes('phd') || type.includes('psy.d')) {
      return 'Dr.';
    } else if (type.includes('psychiatrist') || type.includes('md')) {
      return 'Dr.';
    }
    
    return '';
  };

  // Render loading state
  if (loading) {
    return (
      <NewLayout>
        <div className="container mx-auto max-w-4xl">
          <div className="mb-8">
            <h1 className="text-3xl font-bold mb-2">Select Your Therapist</h1>
            <p className="text-gray-600">
              Loading available therapists...
            </p>
          </div>
          
          <div className="flex justify-center items-center py-16">
            <Loader className="animate-spin mr-2 h-8 w-8 text-blue-500" />
            <span className="text-lg text-gray-600">Loading therapists...</span>
          </div>
        </div>
      </NewLayout>
    );
  }

  // Render error state
  if (error) {
    return (
      <NewLayout>
        <div className="container mx-auto max-w-4xl">
          <div className="mb-8">
            <h1 className="text-3xl font-bold mb-2">Select Your Therapist</h1>
            <p className="text-gray-600">
              There was a problem loading therapists.
            </p>
          </div>
          
          <div className="bg-red-50 border border-red-200 rounded-lg p-8 text-center">
            <h2 className="text-lg font-semibold text-red-700 mb-2">Error Loading Therapists</h2>
            <p className="text-gray-600 mb-6">{error}</p>
            <Button onClick={retryFetch}>
              Try Again
            </Button>
          </div>
        </div>
      </NewLayout>
    );
  }

  // Render empty state
  if (therapists.length === 0) {
    return (
      <NewLayout>
        <div className="container mx-auto max-w-4xl">
          <div className="mb-8">
            <h1 className="text-3xl font-bold mb-2">Select Your Therapist</h1>
            {filteringApplied ? (
              <p className="text-gray-600">
                We couldn't find any therapists licensed in your state. Please contact our support team for assistance.
              </p>
            ) : (
              <p className="text-gray-600">
                No therapists are currently available. Please check back later or contact our support team.
              </p>
            )}
          </div>
          
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-8 text-center">
            <h2 className="text-xl font-semibold mb-4">No Available Therapists</h2>
            <p className="mb-6">Please contact our support team for personalized assistance with finding a therapist.</p>
            <div className="space-x-4">
              <Button onClick={() => navigate('/patient-dashboard')}>
                Return to Dashboard
              </Button>
              <Button variant="outline" onClick={retryFetch}>
                Refresh List
              </Button>
            </div>
          </div>
        </div>
      </NewLayout>
    );
  }

  // Main render with therapist list
  return (
    <NewLayout>
      <div className="container mx-auto max-w-4xl">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Select Your Therapist</h1>
          <p className="text-gray-600">
            {filteringApplied 
              ? `Showing therapists licensed in ${clientState || 'your state'} who can work with your age group.`
              : 'Choose a therapist who you feel would be the best fit for your needs.'}
          </p>
        </div>
        
        <div className="space-y-6">
          {therapists.map((therapist) => {
            // Log therapist data to verify correct fields are being used
            console.log('[TherapistSelection] Therapist data:', {
              id: therapist.id,
              name: therapist.clinician_professional_name,
              type: therapist.clinician_type,
              states: therapist.clinician_licensed_states,
              imageUrl: therapist.clinician_image_url
            });
            
            const title = getTherapistTitle(therapist);
            const fullName = `${title} ${therapist.clinician_first_name || ''} ${therapist.clinician_last_name || ''}`.trim();
            // Use clinician_image_url as the primary image source
            const imageUrl = therapist.clinician_image_url || 'https://randomuser.me/api/portraits/lego/1.jpg';
            
            return (
              <Card 
                key={therapist.id}
                className={`cursor-pointer transition-all ${
                  selectedTherapist === therapist.id 
                    ? 'ring-2 ring-blue-500 bg-blue-50' 
                    : 'hover:bg-gray-50'
                }`}
                onClick={() => handleSelectTherapist(therapist.id)}
              >
                <CardContent className="p-6">
                  <div className="flex items-center gap-6">
                    <div className="flex-shrink-0">
                      <img 
                        src={imageUrl} 
                        alt={fullName}
                        className="w-24 h-24 rounded-full object-cover"
                        onError={(e) => {
                          // Fallback if image fails to load
                          (e.target as HTMLImageElement).src = 'https://randomuser.me/api/portraits/lego/1.jpg';
                        }}
                      />
                    </div>
                    <div className="flex-grow">
                      <h3 className="text-xl font-semibold">
                        {fullName}
                      </h3>
                      <p className="text-gray-600 mb-2">{therapist.clinician_type || 'Therapist'}</p>
                      <p className="text-sm">{therapist.clinician_bio || 'No bio available'}</p>
                    </div>
                    <div className="flex-shrink-0">
                      <div className={`w-6 h-6 rounded-full border-2 ${
                        selectedTherapist === therapist.id 
                          ? 'border-blue-500 bg-blue-500' 
                          : 'border-gray-300'
                      }`}>
                        {selectedTherapist === therapist.id && (
                          <svg 
                            xmlns="http://www.w3.org/2000/svg" 
                            className="h-5 w-5 text-white" 
                            viewBox="0 0 20 20" 
                            fill="currentColor"
                          >
                            <path 
                              fillRule="evenodd" 
                              d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" 
                              clipRule="evenodd" 
                            />
                          </svg>
                        )}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
        
        <div className="mt-8 flex justify-end space-x-4">
          <Button 
            variant="outline" 
            onClick={() => navigate('/patient-dashboard')}
          >
            Cancel
          </Button>
          <Button 
            onClick={handleSubmit}
            disabled={!selectedTherapist || isSubmitting}
          >
            {isSubmitting ? "Confirming..." : "Confirm Selection"}
          </Button>
        </div>
      </div>
    </NewLayout>
  );
};

export default TherapistSelection;
