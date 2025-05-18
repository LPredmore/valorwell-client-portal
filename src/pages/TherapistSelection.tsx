
import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import NewLayout from '@/components/layout/NewLayout';
import { toast } from 'sonner';
import { useAuth } from '@/context/NewAuthContext';
import { useTherapistSelection } from '@/hooks/useTherapistSelection';
import { Loader, WifiOff, AlertTriangle, RefreshCw } from 'lucide-react';
import { TherapistSelectionDebugger } from '@/debug/therapistSelectionDebugger';
import { DebugUtils } from '@/utils/debugUtils';

const TherapistSelection = () => {
  const navigate = useNavigate();
  const [selectedTherapist, setSelectedTherapist] = useState<string | null>(null);
  const [networkOnline, setNetworkOnline] = useState<boolean>(navigator.onLine);
  const sessionId = useRef(DebugUtils.generateSessionId()).current;

  // Get client data from auth context
  const { clientProfile, isLoading: authLoading } = useAuth();
  const clientState = clientProfile?.client_state || null;
  const clientAge = clientProfile?.client_age || 18;

  // Log client data for debugging
  DebugUtils.log(sessionId, '[TherapistSelection] Component rendering', { 
    clientProfile, 
    clientState, 
    clientAge, 
    authLoading 
  });

  // Initialize the debugger
  useEffect(() => {
    DebugUtils.log(sessionId, '[TherapistSelection] Initializing component');
    TherapistSelectionDebugger.initialize();
    
    return () => {
      DebugUtils.log(sessionId, '[TherapistSelection] Component unmounting, triggering cleanup');
      TherapistSelectionDebugger.cleanup();
      window.dispatchEvent(new CustomEvent('therapist_selection_circuit_breaker_cleanup'));
    };
  }, [sessionId]);

  // Use the therapist selection hook
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
    enableFiltering: true,
    sessionId
  });

  // Handle network status changes
  useEffect(() => {
    const handleOnline = () => {
      DebugUtils.log(sessionId, '[TherapistSelection] Network is online');
      setNetworkOnline(true);
      retryFetch();
      TherapistSelectionDebugger.resetCircuitBreaker();
    };

    const handleOffline = () => {
      DebugUtils.log(sessionId, '[TherapistSelection] Network is offline');
      setNetworkOnline(false);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [sessionId, retryFetch]);

  const handleSubmit = async () => {
    if (!selectedTherapist) {
      toast.error("Please select a therapist to continue");
      return;
    }
    if (!networkOnline) {
      toast.error("You appear to be offline. Please check your internet connection and try again.");
      return;
    }
    try {
      const success = await selectTherapist(selectedTherapist);
      if (success) {
        TherapistSelectionDebugger.resetCircuitBreaker();
        navigate('/patient-dashboard');
      }
    } catch (error) {
      DebugUtils.log(sessionId, '[TherapistSelection] Error selecting therapist', error, true);
      toast.error("Failed to select therapist, please try again");
    }
  };

  // Show loading state when auth is still loading
  if (authLoading) {
    return (
      <NewLayout>
        <div className="container mx-auto max-w-4xl flex flex-col items-center justify-center py-12">
          <Loader className="h-12 w-12 animate-spin text-blue-500 mb-4" />
          <p className="text-lg">Loading your profile information...</p>
        </div>
      </NewLayout>
    );
  }

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

        {loading && (
          <div className="flex flex-col items-center justify-center py-8">
            <Loader className="h-8 w-8 animate-spin text-blue-500 mb-4" />
            <p>Loading available therapists...</p>
          </div>
        )}

        {!loading && error && (
          <div className="bg-red-50 border border-red-200 rounded-md p-4 mb-6 flex items-start">
            <AlertTriangle className="h-5 w-5 text-red-500 mr-2 mt-0.5" />
            <div>
              <h3 className="font-medium text-red-800">Error loading therapists</h3>
              <p className="text-red-700 text-sm mt-1">
                We encountered a problem loading the therapist list. Please try refreshing.
              </p>
              <Button 
                variant="outline" 
                size="sm" 
                className="mt-2"
                onClick={retryFetch}
              >
                <RefreshCw className="h-4 w-4 mr-1" /> Retry
              </Button>
            </div>
          </div>
        )}

        {!loading && !error && therapists.length === 0 && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4 mb-6">
            <h3 className="font-medium text-yellow-800">No therapists available</h3>
            <p className="text-yellow-700 text-sm mt-1">
              There are currently no therapists available that match your criteria. 
              Please try again later or contact support for assistance.
            </p>
          </div>
        )}

        {!loading && therapists.map(therapist => (
          <Card 
            key={therapist.id} 
            onClick={() => setSelectedTherapist(therapist.id)}
            className={`cursor-pointer transition-all mb-4 ${selectedTherapist === therapist.id ? 'ring-2 ring-blue-500 bg-blue-50' : 'hover:bg-gray-50'}`}
          >
            <CardContent className="p-6">
              <h3 className="text-xl font-semibold">{therapist.clinician_professional_name || 'Unnamed Therapist'}</h3>
              <p className="text-gray-600">{therapist.clinician_bio || 'No bio available'}</p>
            </CardContent>
          </Card>
        ))}

        {!networkOnline && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4 mb-6 flex items-center">
            <WifiOff className="h-5 w-5 text-yellow-500 mr-2" />
            <span className="text-yellow-800">You appear to be offline. Some features may not work correctly.</span>
          </div>
        )}

        <div className="mt-8 flex justify-between">
          <Button variant="outline" onClick={retryFetch} disabled={loading}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh List
          </Button>
          <Button 
            onClick={handleSubmit} 
            disabled={!selectedTherapist || selectingTherapistId || !networkOnline}
          >
            {selectingTherapistId ? (
              <>
                <Loader className="h-4 w-4 animate-spin mr-2" />
                Processing...
              </>
            ) : "Confirm Selection"}
          </Button>
        </div>
      </div>
    </NewLayout>
  );
};

export default TherapistSelection;
