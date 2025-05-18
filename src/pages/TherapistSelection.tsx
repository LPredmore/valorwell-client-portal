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
  const { clientProfile } = useAuth();
  const clientState = clientProfile?.client_state || null;
  const clientAge = clientProfile?.client_age || 18;

  // Log client data for debugging
  DebugUtils.log(sessionId, '[TherapistSelection] Client profile', clientProfile);
  DebugUtils.log(sessionId, '[TherapistSelection] Client state', clientState);
  DebugUtils.log(sessionId, '[TherapistSelection] Client age', clientAge);

  // Initialize the debugger
  useEffect(() => {
    DebugUtils.log(sessionId, '[TherapistSelection] Initializing component');
    TherapistSelectionDebugger.initialize();
    return () => {
      DebugUtils.log(sessionId, '[TherapistSelection] Component unmounting, triggering cleanup');
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
    enableFiltering: true
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
        {therapists.map(therapist => (
          <Card 
            key={therapist.id} 
            onClick={() => setSelectedTherapist(therapist.id)}
            className={`cursor-pointer transition-all ${selectedTherapist === therapist.id ? 'ring-2 ring-blue-500 bg-blue-50' : 'hover:bg-gray-50'}`}
          >
            <CardContent className="p-6">
              <h3 className="text-xl font-semibold">{therapist.clinician_professional_name || 'Unnamed Therapist'}</h3>
              <p className="text-gray-600">{therapist.clinician_bio || 'No bio available'}</p>
            </CardContent>
          </Card>
        ))}
        <div className="mt-8 flex justify-between">
          <Button variant="outline" onClick={retryFetch} disabled={loading}>Refresh List</Button>
          <Button onClick={handleSubmit} disabled={!selectedTherapist || selectingTherapistId}>Confirm Selection</Button>
        </div>
      </div>
    </NewLayout>
  );
};

export default TherapistSelection;
