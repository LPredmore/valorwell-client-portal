
import React, { useState, useEffect } from 'react';
import Layout from '@/components/layout/Layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Info, Loader2, RefreshCw, AlertCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useUser } from '@/context/UserContext';
import { useTherapistSelection, Therapist } from '@/hooks/useTherapistSelection';

// Define interface for the client data structure
interface Client {
  client_state: string | null;
  client_age: number | null;
}

const TherapistSelection = () => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const { user, userId: authUserId, isLoading: isUserContextLoading, authInitialized, clientProfile: userClientProfile, refreshUserData } = useUser();
  const [authError, setAuthError] = useState<string | null>(null);
  const [loadingTimeout, setLoadingTimeout] = useState(false);
  const [clientData, setClientData] = useState<Client | null>(null);
  
  // Add timeout mechanism to prevent indefinite loading
  useEffect(() => {
    let timeoutId: NodeJS.Timeout;
    
    if ((isUserContextLoading || !authInitialized) && !authError) {
      console.log("[TherapistSelection] Starting loading timeout check");
      timeoutId = setTimeout(() => {
        console.log("[TherapistSelection] Loading timeout reached after 10 seconds");
        setLoadingTimeout(true);
        toast({
          title: "Loading Delay",
          description: "User data is taking longer than expected to load.",
          variant: "default"
        });
      }, 10000); // 10 seconds timeout
      
      // Add a second timeout for critical failure
      const criticalTimeoutId = setTimeout(() => {
        console.log("[TherapistSelection] Critical loading timeout reached after 30 seconds");
        setAuthError("Authentication process is taking too long. Please refresh the page.");
        toast({
          title: "Authentication Error",
          description: "Failed to load user data. Please refresh the page.",
          variant: "destructive"
        });
      }, 30000); // 30 seconds for critical timeout
      
      return () => {
        clearTimeout(timeoutId);
        clearTimeout(criticalTimeoutId);
      };
    }
    
    return () => {
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [isUserContextLoading, authInitialized, authError, toast]);

  // Effect to set clientData from UserContext once available
  useEffect(() => {
    if (!isUserContextLoading && authInitialized && authUserId) {
      // Add the requested debug logging
      console.log('[TherapistSelection DEBUG] userClientProfile from UserContext:', userClientProfile ? JSON.stringify(userClientProfile, null, 2) : 'null/undefined');
      
      if (userClientProfile) {
        const clientAge = userClientProfile.client_age;
        const clientState = userClientProfile.client_state;
        
        console.log(`[TherapistSelection DEBUG] userClientProfile.client_age: ${clientAge} (Type: ${typeof clientAge})`);
        console.log(`[TherapistSelection DEBUG] userClientProfile.client_state: ${clientState} (Type: ${typeof clientState})`);
        
        setClientData({
          client_state: clientState || null,
          client_age: clientAge === undefined || clientAge === null ? null : Number(clientAge),
        });
        
        console.log('[TherapistSelection] Using clientProfile from UserContext:', JSON.stringify({
          client_state: clientState,
          client_age: clientAge
        }, null, 2));
      } else {
        console.warn('[TherapistSelection DEBUG] userClientProfile from UserContext is null/undefined.');
        toast({
            title: "Profile Incomplete",
            description: "Please complete your profile setup to select a therapist.",
            variant: "destructive",
        });
        setClientData(null);
      }
    } else if (!isUserContextLoading && !authUserId) {
        console.log("[TherapistSelection] No authenticated user. Redirecting to login.");
        toast({
            title: "Authentication Required",
            description: "Please log in to view therapists.",
            variant: "destructive",
        });
        navigate('/login');
    }
  }, [authUserId, isUserContextLoading, userClientProfile, navigate, toast, authInitialized]);

  // Use our custom hook for therapist data with enhanced error handling
  // Add defensive checks to prevent null values causing errors
  const {
    therapists,
    allTherapists,
    loading: loadingTherapists,
    error: dbError,
    filteringApplied,
    retryFetch: handleRetryFetch,
    selectTherapist,
    selectingTherapistId
  } = useTherapistSelection({
    clientState: clientData?.client_state || null,
    clientAge: clientData?.client_age !== undefined && clientData?.client_age !== null 
              ? Number(clientData.client_age) 
              : null,
    enableFiltering: true
  });

  const handleSelectTherapist = async (therapist: Therapist) => {
    if (!authUserId) {
      toast({ title: "Authentication required", description: "Please log in to select a therapist", variant: "destructive" });
      navigate('/login');
      return;
    }
    
    const success = await selectTherapist(therapist.id);
    
    if (success) {
      // Refresh user context to get updated client_status
      if (refreshUserData) {
        console.log("[TherapistSelection] Refreshing user data after therapist selection");
        await refreshUserData();
      } else {
        console.warn("[TherapistSelection] refreshUserData function not available from UserContext");
      }
      
      navigate('/patient-dashboard');
    }
  };
  
  const displayTherapistName = (therapist: Therapist) => {
    if (!therapist) return "Unknown";
    return therapist.clinician_professional_name || 
           `${therapist.clinician_first_name || ''} ${therapist.clinician_last_name || ''}`.trim() || 
           "Unknown Therapist";
  };

  if (isUserContextLoading || !authInitialized) {
    return (
      <Layout>
        <div className="container max-w-6xl mx-auto py-6 flex justify-center items-center min-h-[calc(100vh-200px)]">
          <Loader2 className="h-12 w-12 animate-spin text-valorwell-600 mb-4" />
          <div className="text-center">
            <p className="text-lg text-valorwell-600 mb-2">
              {!authInitialized
                ? "Initializing authentication..."
                : "Loading user information..."}
            </p>
            {loadingTimeout && !authError && (
              <p className="text-sm text-amber-600">
                This is taking longer than expected. Please wait...
              </p>
            )}
          </div>
        </div>
      </Layout>
    );
  }
  
  // Handle auth error state
  if (authError) {
    return (
      <Layout>
        <div className="container max-w-6xl mx-auto py-6 flex justify-center items-center min-h-[calc(100vh-200px)]">
          <div className="bg-red-50 p-8 rounded-lg border border-red-200 max-w-md text-center">
            <div className="text-red-500 mb-4 flex justify-center">
              <AlertCircle size={32} />
            </div>
            <h3 className="text-xl font-medium text-red-800 mb-2">Authentication Error</h3>
            <p className="text-red-600 mb-6">{authError}</p>
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2 bg-valorwell-600 text-white rounded-md hover:bg-valorwell-700 transition-colors"
            >
              Refresh Page
            </button>
          </div>
        </div>
      </Layout>
    );
  }

  // Enhanced: Handle database error state with more information and options
  if (dbError) {
    return (
      <Layout>
        <div className="container max-w-6xl mx-auto py-6">
          <Card className="shadow-lg border-valorwell-300">
            <CardHeader className="text-center bg-gradient-to-r from-valorwell-50 to-valorwell-100 rounded-t-lg py-8">
              <CardTitle className="text-3xl md:text-4xl font-bold text-valorwell-700">Select Your Therapist</CardTitle>
              <CardDescription className="text-lg md:text-xl mt-2 text-valorwell-600">
                Choose a therapist who best fits your needs and preferences.
              </CardDescription>
            </CardHeader>
            
            <CardContent className="pt-8 px-4 md:px-6">
              <div className="bg-red-50 p-6 rounded-lg border border-red-200 my-4">
                <div className="text-center">
                  <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-3" />
                  <h3 className="text-xl font-medium text-red-800 mb-2">Database Error</h3>
                  <p className="text-red-600 mb-6">{dbError}</p>
                </div>
                
                <div className="bg-white p-4 rounded-md mb-6 text-left">
                  <h4 className="font-medium text-gray-800 mb-2">Technical Details</h4>
                  <p className="text-sm text-gray-600 mb-2">
                    This error may be related to a database schema mismatch. Our system is looking for the correct column
                    <code className="bg-gray-100 px-1 py-0.5 rounded mx-1">clinician_type</code>
                    but encountered an error.
                  </p>
                  <p className="text-sm text-gray-600">
                    A database migration has been created to fix this issue. Please contact the development team if this error persists.
                  </p>
                </div>
                
                <div className="flex justify-center space-x-4">
                  <Button
                    onClick={handleRetryFetch}
                    className="bg-valorwell-600 hover:bg-valorwell-700 text-white"
                  >
                    <RefreshCw className="mr-2 h-4 w-4" /> Retry Query
                  </Button>
                  
                  <Button
                    onClick={() => window.location.reload()}
                    variant="outline"
                    className="border-valorwell-300 text-valorwell-700"
                  >
                    Refresh Page
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="container max-w-6xl mx-auto py-6">
        <Card className="shadow-lg border-valorwell-300">
          <CardHeader className="text-center bg-gradient-to-r from-valorwell-50 to-valorwell-100 rounded-t-lg py-8">
            <CardTitle className="text-3xl md:text-4xl font-bold text-valorwell-700">Select Your Therapist</CardTitle>
            <CardDescription className="text-lg md:text-xl mt-2 text-valorwell-600">
              Choose a therapist who best fits your needs and preferences.
            </CardDescription>
          </CardHeader>
          
          <CardContent className="pt-8 px-4 md:px-6">
            {loadingTherapists ? (
              <div className="flex flex-col justify-center items-center py-12 text-center">
                <Loader2 className="h-12 w-12 animate-spin text-valorwell-600" />
                <p className="mt-4 text-lg text-gray-600">Loading available therapists...</p>
              </div>
            ) : (
              <>
                {filteringApplied && clientData && (clientData.client_state || clientData.client_age !== null) && (
                  <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-md">
                    <Alert>
                      <Info className="h-5 w-5 text-blue-600" />
                      <AlertTitle className="font-semibold text-blue-700">Filtered Results</AlertTitle>
                      <AlertDescription className="text-blue-600">
                        {clientData.client_state && clientData.client_age !== null ? (
                          <>
                            Showing therapists licensed in <strong>{clientData.client_state}</strong> who work with clients aged <strong>{clientData.client_age}</strong> and older.
                          </>
                        ) : clientData.client_state ? (
                          <>
                            Showing therapists licensed in <strong>{clientData.client_state}</strong>.
                          </>
                        ) : clientData.client_age !== null ? (
                          <>
                            Showing therapists who work with clients aged <strong>{clientData.client_age}</strong> and older.
                          </>
                        ) : null }
                      </AlertDescription>
                    </Alert>
                  </div>
                )}

                {!therapists || therapists.length === 0 ? (
                  <div className="text-center py-12">
                    {filteringApplied && clientData?.client_state ? (
                      <div className="bg-amber-50 border border-amber-200 rounded-lg p-8 max-w-3xl mx-auto">
                        <div className="text-amber-700 mb-4 flex justify-center">
                          <AlertCircle size={48} className="text-amber-500" />
                        </div>
                        <h3 className="text-2xl font-medium text-amber-800 mb-4">No Therapists Available in {clientData.client_state}</h3>
                        <p className="text-amber-700 mb-4 text-lg">
                          We're sorry, but we currently don't have any therapists licensed in {clientData.client_state}.
                        </p>
                        <p className="text-amber-600 mb-6">
                          Our team is working diligently to expand our network of therapists across all states. Please check back soon, or contact our support team if you need immediate assistance.
                        </p>
                        <Button 
                          onClick={handleRetryFetch}
                          className="bg-valorwell-600 hover:bg-valorwell-700 text-white flex items-center gap-2"
                        >
                          <RefreshCw className="h-4 w-4" /> Retry
                        </Button>
                      </div>
                    ) : (
                      <>
                        <p className="text-xl text-gray-600 mb-4">
                          No therapists are currently available. Please check back later.
                        </p>
                        <Button 
                          className="mt-6 bg-valorwell-600 hover:bg-valorwell-700"
                          onClick={handleRetryFetch}
                        >
                          <RefreshCw className="h-4 w-4 mr-2" /> Refresh
                        </Button>
                      </>
                    )}
                  </div>
                ) : (
                  <div className="space-y-8">
                    {therapists.map((therapist) => (
                      <Card key={therapist.id} className="overflow-hidden shadow-md hover:shadow-xl transition-shadow duration-300">
                        <div className="p-6">
                          <div className="flex flex-col sm:flex-row gap-6 items-center sm:items-start">
                            <div className="flex-shrink-0 flex flex-col items-center sm:w-1/4">
                              <Avatar className="w-32 h-32 mb-4 border-2 border-valorwell-200">
                                <AvatarImage 
                                  src={therapist.clinician_image_url || therapist.clinician_profile_image || undefined} 
                                  alt={displayTherapistName(therapist)}
                                />
                                <AvatarFallback className="text-4xl bg-valorwell-100 text-valorwell-600">
                                  {(therapist.clinician_first_name?.[0] || '').toUpperCase()}
                                  {(therapist.clinician_last_name?.[0] || '').toUpperCase()}
                                </AvatarFallback>
                              </Avatar>
                              <h3 className="text-xl font-semibold text-center text-valorwell-700">
                                {displayTherapistName(therapist)}
                              </h3>
                              <p className="text-sm text-gray-500 mt-1 text-center">{therapist.clinician_type || 'Therapist'}</p>
                              
                              <Button 
                                className="mt-4 w-full bg-valorwell-600 hover:bg-valorwell-700 text-white"
                                onClick={() => handleSelectTherapist(therapist)}
                                disabled={selectingTherapistId === therapist.id}
                              >
                                {selectingTherapistId === therapist.id ? 
                                  <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                                {selectingTherapistId === therapist.id ? 'Selecting...' : 'Select Therapist'}
                              </Button>
                            </div>
                            
                            <div className="sm:w-3/4">
                              <div className="prose max-w-none">
                                <h4 className="text-lg font-semibold mb-2 text-valorwell-600 border-b pb-1">Biography</h4>
                                <p className="text-gray-700 text-sm leading-relaxed">
                                  {therapist.clinician_bio || 
                                   (therapist as any).clinician_bio_short || 
                                   'No biography available for this therapist.'}
                                </p>
                                
                                {clientData?.client_state && therapist.clinician_licensed_states?.some(
                                  state => {
                                    if (!state || !clientData.client_state) return false;
                                    const stateNorm = state.toLowerCase().trim();
                                    const clientStateNorm = clientData.client_state.toLowerCase().trim();
                                    return stateNorm.includes(clientStateNorm) || clientStateNorm.includes(stateNorm);
                                  }
                                ) && (
                                  <div className="mt-4">
                                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                      Licensed in your state ({clientData.client_state})
                                    </span>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      </Card>
                    ))}
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
};

export default TherapistSelection;
