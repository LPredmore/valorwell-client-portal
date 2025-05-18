
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import NewLayout from '@/components/layout/NewLayout';
import { toast } from 'sonner';
import { useAuth } from '@/context/NewAuthContext';
import { useTherapistSelection } from '@/hooks/useTherapistSelection';
import { Loader, WifiOff, AlertTriangle, RefreshCw } from 'lucide-react';
import { TherapistSelectionDebugger } from '@/debug/therapistSelectionDebugger';

const TherapistSelection = () => {
  const navigate = useNavigate();
  const [selectedTherapist, setSelectedTherapist] = useState<string | null>(null);
  const [networkOnline, setNetworkOnline] = useState<boolean>(navigator.onLine);
  
  // Get client data from auth context
  const { clientProfile } = useAuth();
  const clientState = clientProfile?.client_state || null;
  const clientAge = clientProfile?.client_age || 18;
  
  // Log client data for debugging
  console.log('[TherapistSelection] Client profile:', clientProfile);
  console.log('[TherapistSelection] Client state:', clientState);
  console.log('[TherapistSelection] Client age:', clientAge);

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
    const checkNetworkAndUpdate = () => {
      const isOnline = navigator.onLine;
      if (networkOnline !== isOnline) {
        console.log(`[TherapistSelection] Network status changed: ${isOnline ? 'online' : 'offline'}`);
        setNetworkOnline(isOnline);
      }
    };
    
    const handleOnline = () => {
      console.log('[TherapistSelection] Network is online');
      setNetworkOnline(true);
      // Auto refresh when connection is restored
      retryFetch();
      // Reset circuit breaker in debugger
      TherapistSelectionDebugger.resetCircuitBreaker();
    };
    
    const handleOffline = () => {
      console.log('[TherapistSelection] Network is offline');
      setNetworkOnline(false);
    };
    
    // Check network status immediately
    checkNetworkAndUpdate();
    
    // Set up event listeners
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    // Set up periodic network check
    const networkCheckInterval = setInterval(checkNetworkAndUpdate, 10000);
    
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      clearInterval(networkCheckInterval);
    };
  }, [networkOnline, retryFetch]);

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

  // Track if any submission is in progress
  const isSubmitting = !!selectingTherapistId;

  const handleSelectTherapist = (therapistId: string) => {
    setSelectedTherapist(therapistId);
  };

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
        // If successful, navigate to dashboard
        navigate('/patient-dashboard');
      }
    } catch (error) {
      console.error("Error selecting therapist:", error);
      toast.error("Failed to select therapist, please try again");
    }
  };

  // Helper function to handle manual refresh
  const handleManualRefresh = () => {
    console.log('[TherapistSelection] Manual refresh triggered');
    
    // First check network status
    if (!navigator.onLine) {
      toast.error("You appear to be offline. Please check your internet connection.");
      return;
    }
    
    // Reset circuit breaker in debugger
    TherapistSelectionDebugger.resetCircuitBreaker();
    
    // Trigger retry fetch
    retryFetch();
    // Show loading toast
    toast.info("Refreshing therapist list...");
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

  // Render offline state
  if (!networkOnline) {
    return (
      <NewLayout>
        <div className="container mx-auto max-w-4xl">
          <div className="mb-8">
            <h1 className="text-3xl font-bold mb-2">Select Your Therapist</h1>
            <p className="text-gray-600">
              You appear to be offline. Please check your internet connection.
            </p>
          </div>
          
          <div className="flex flex-col justify-center items-center py-16 bg-gray-50 border border-gray-200 rounded-lg">
            <WifiOff className="h-12 w-12 text-gray-400 mb-4" />
            <h2 className="text-xl font-semibold mb-2">No Internet Connection</h2>
            <p className="text-gray-600 mb-6 text-center max-w-md">
              Please check your connection and try again. You need to be online to view and select therapists.
            </p>
            <Button onClick={retryFetch}>
              <RefreshCw className="mr-2 h-4 w-4" />
              Retry Connection
            </Button>
          </div>
        </div>
      </NewLayout>
    );
  }

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
            <AlertTriangle className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <h2 className="text-lg font-semibold text-red-700 mb-2">Error Loading Therapists</h2>
            <p className="text-gray-600 mb-6">{error}</p>
            <div className="flex flex-col sm:flex-row justify-center gap-3">
              <Button onClick={handleManualRefresh} className="mb-3 sm:mb-0">
                <RefreshCw className="mr-2 h-4 w-4" />
                Try Again
              </Button>
              <Button variant="outline" onClick={() => navigate('/patient-dashboard')}>
                Return to Dashboard
              </Button>
            </div>
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
              <Button variant="outline" onClick={handleManualRefresh}>
                <RefreshCw className="mr-2 h-4 w-4" />
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
            // Calculate title and name
            const title = getTherapistTitle(therapist);
            const fullName = therapist.clinician_professional_name || 
                            `${title} ${therapist.clinician_first_name || ''} ${therapist.clinician_last_name || ''}`.trim();
            
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
        
        <div className="mt-8 flex justify-between">
          <Button 
            variant="outline"
            onClick={handleManualRefresh}
            disabled={loading}
          >
            <RefreshCw className="mr-2 h-4 w-4" />
            Refresh List
          </Button>
          
          <div className="space-x-4">
            <Button 
              variant="outline" 
              onClick={() => navigate('/patient-dashboard')}
            >
              Cancel
            </Button>
            <Button 
              onClick={handleSubmit}
              disabled={!selectedTherapist || isSubmitting || !networkOnline}
            >
              {isSubmitting ? "Confirming..." : "Confirm Selection"}
            </Button>
          </div>
        </div>
      </div>
    </NewLayout>
  );
};

export default TherapistSelection;
