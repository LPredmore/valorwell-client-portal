import React, { useEffect, useState, useCallback } from 'react';
import Layout from '@/components/layout/Layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Info, Loader2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useUser } from '@/context/UserContext';

interface ClientDataForFiltering { // Renamed for clarity
  client_state: string | null;
  client_age: number | null;
}

interface Therapist {
  id: string;
  clinician_first_name: string | null;
  clinician_last_name: string | null;
  clinician_professional_name: string | null;
  clinician_title: string | null;
  clinician_bio: string | null;
  clinician_bio_short: string | null;
  clinician_licensed_states: string[] | null;
  clinician_min_client_age: number | null;
  clinician_profile_image: string | null;
  clinician_image_url: string | null;
}

const TherapistSelection = () => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const { 
    user, 
    userId: authUserId, 
    isLoading: isUserContextLoading, 
    clientProfile: userClientProfile,
    authInitialized 
  } = useUser();

  const [clientDataForFilter, setClientDataForFilter] = useState<ClientDataForFiltering | null>(null);
  const [therapists, setTherapists] = useState<Therapist[]>([]);
  const [allTherapists, setAllTherapists] = useState<Therapist[]>([]);
  const [isLoadingPage, setIsLoadingPage] = useState(true); // Overall loading for the page
  const [filteringApplied, setFilteringApplied] = useState(false);
  const [selectingTherapistId, setSelectingTherapistId] = useState<string | null>(null);

  // Effect 1: Determine client data for filtering once UserContext is ready
  useEffect(() => {
    console.log('[TherapistSelection] Effect 1: Checking UserContext. isUserContextLoading:', isUserContextLoading, 'authInitialized:', authInitialized, 'authUserId:', authUserId);

    if (!isUserContextLoading && authInitialized) {
      if (authUserId && userClientProfile) {
        // Ensure client_age is a number or null, not undefined or a string that needs conversion here.
        // UserContext should ideally provide client_age as number | null directly.
        const ageFromContext = userClientProfile.client_age;
        const processedAge = (ageFromContext === undefined || ageFromContext === null) ? null : Number(ageFromContext);

        if (isNaN(processedAge) && ageFromContext !== null) {
            console.warn(`[TherapistSelection] client_age from context ('${ageFromContext}') resulted in NaN after Number(). Setting to null.`);
        }

        const currentClientData: ClientDataForFiltering = {
          client_state: userClientProfile.client_state || null,
          client_age: (isNaN(processedAge) && ageFromContext !== null) ? null : processedAge,
        };
        console.log('[TherapistSelection] Effect 1: UserContext ready. Setting clientDataForFilter:', JSON.stringify(currentClientData, null, 2));
        setClientDataForFilter(currentClientData);
      } else if (authUserId && !userClientProfile) {
        // User is authenticated, but profile might be incomplete or not fetched yet by UserContext
        console.warn('[TherapistSelection] Effect 1: User authenticated but clientProfile is null/undefined in UserContext. This might indicate profile setup is not complete or UserContext needs refresh.');
        // Setting clientDataForFilter to an object with nulls allows therapist fetch to proceed without filters
        setClientDataForFilter({ client_state: null, client_age: null });
        // Optionally, redirect if profile is known to be incomplete
        // if (userClientProfile?.client_status === 'New') navigate('/profile-setup'); 
      } else if (!authUserId) {
        console.log("[TherapistSelection] Effect 1: No authenticated user. Redirecting to login.");
        toast({ title: "Authentication Required", description: "Please log in to view therapists.", variant: "destructive" });
        navigate('/login');
        setIsLoadingPage(false); // Stop loading as we are redirecting
      }
    }
  }, [authUserId, isUserContextLoading, userClientProfile, authInitialized, navigate, toast]);

  // Effect 2: Fetch therapists and apply filters once clientDataForFilter is set (or known to be null)
  // and UserContext is no longer loading.
  useEffect(() => {
    // Do not run if UserContext is still loading or if clientDataForFilter hasn't been determined yet by Effect 1.
    if (isUserContextLoading || clientDataForFilter === undefined) {
      console.log('[TherapistSelection] Effect 2: Waiting for UserContext or clientDataForFilter to be ready. isUserContextLoading:', isUserContextLoading, 'clientDataForFilter:', clientDataForFilter);
      setIsLoadingPage(true); // Keep page loading
      return;
    }

    const fetchAndFilterTherapists = async () => {
      console.log('[TherapistSelection] Effect 2: Starting fetchAndFilterTherapists. clientDataForFilter:', JSON.stringify(clientDataForFilter, null, 2));
      setIsLoadingPage(true); // Specifically for therapist fetching/filtering
      setFilteringApplied(false); 

      try {
        const { data: activeTherapists, error } = await supabase
          .from('clinicians')
          .select('id, clinician_first_name, clinician_last_name, clinician_professional_name, clinician_title, clinician_bio, clinician_bio_short, clinician_licensed_states, clinician_min_client_age, clinician_profile_image, clinician_image_url')
          .eq('clinician_status', 'Active');

        if (error) {
          console.error('[TherapistSelection] Error fetching therapists from DB:', error);
          throw error; // Let the catch block handle it
        }
        
        const fetchedTherapists = activeTherapists || [];
        console.log("[TherapistSelection] Total active therapists fetched:", fetchedTherapists.length);
        setAllTherapists(fetchedTherapists);

        // Determine if actual filtering should occur
        const canFilter = clientDataForFilter && (clientDataForFilter.client_state || (clientDataForFilter.client_age !== null && clientDataForFilter.client_age !== undefined));

        if (canFilter) {
          console.log('[TherapistSelection] Applying filters based on clientDataForFilter:', JSON.stringify(clientDataForFilter, null, 2));
          setFilteringApplied(true);

          const filtered = fetchedTherapists.filter(therapist => {
            let matchesState = !clientDataForFilter!.client_state; // True if no client state to filter by
            let matchesAge = true; // True if no client age to filter by or if client age is null

            if (clientDataForFilter!.client_state && therapist.clinician_licensed_states && therapist.clinician_licensed_states.length > 0) {
              const clientStateNormalized = clientDataForFilter!.client_state.toLowerCase().trim();
              matchesState = therapist.clinician_licensed_states.some(state => 
                state?.toLowerCase().trim().includes(clientStateNormalized) || clientStateNormalized.includes(state?.toLowerCase().trim())
              );
            } else if (clientDataForFilter!.client_state) {
              matchesState = false; // Client has state, therapist has no licensed states
            }

            const currentClientAge = clientDataForFilter!.client_age; // number | null
            const therapistMinAge = therapist.clinician_min_client_age; // number | null

            console.log(`[TherapistSelection] Filter Detail - Therapist: ${therapist.id}, ClientState: ${clientDataForFilter!.client_state}, TherapistStates: ${JSON.stringify(therapist.clinician_licensed_states)}, StateMatch: ${matchesState}`);
            
            if (currentClientAge !== null && currentClientAge !== undefined) { // Only filter by age if client has an age
              if (therapistMinAge !== null && therapistMinAge !== undefined) {
                matchesAge = currentClientAge >= therapistMinAge;
                console.log(`  ClientAge: ${currentClientAge}, TherapistMinAge: ${therapistMinAge}, AgeMatch: ${matchesAge}`);
              } else {
                matchesAge = true; // Therapist has no min age, so it's a match
                console.log(`  ClientAge: ${currentClientAge}, TherapistMinAge: null, AgeMatch: true (no min age for therapist)`);
              }
            } else {
              matchesAge = true; // Client age is null, so don't filter by age
              console.log(`  ClientAge: null, AgeMatch: true (client age not provided)`);
            }
            return matchesState && matchesAge;
          });

          console.log(`[TherapistSelection] Filtering complete. Filtered count: ${filtered.length}`);
          
          if (filtered.length === 0 && fetchedTherapists.length > 0) {
            console.log("[TherapistSelection] No therapists matched filters. Showing all active therapists as fallback.");
            setTherapists(fetchedTherapists);
            toast({ title: "Filtered Results", description: "No therapists exactly matched your criteria. Showing all available therapists.", variant: "default" });
            setFilteringApplied(false); // Fallback means filters are not strictly applied to the list shown
          } else {
            setTherapists(filtered);
          }
        } else {
          console.log("[TherapistSelection] No specific client filters to apply (no state or age). Showing all active therapists.");
          setTherapists(fetchedTherapists);
          setFilteringApplied(false);
        }
      } catch (error: any) {
        console.error('[TherapistSelection] Error in fetchAndFilterTherapists:', error);
        toast({ title: 'Error Loading Therapists', description: error.message || 'Failed to load therapists.', variant: 'destructive' });
        setTherapists([]);
        setAllTherapists([]);
      } finally {
        setIsLoadingPage(false);
        console.log("[TherapistSelection] fetchAndFilterTherapists finished. isLoadingPage: false");
      }
    };

    fetchAndFilterTherapists();

  }, [clientDataForFilter, isUserContextLoading, toast]); // Depends on clientDataForFilter now

  const handleSelectTherapist = async (therapist: Therapist) => {
    // ... (implementation as before, ensure authUserId is used)
    if (!authUserId) { /* ... */ return; }
    setSelectingTherapistId(therapist.id);
    try {
      const { error } = await supabase
        .from('clients')
        .update({ client_assigned_therapist: therapist.id, client_status: 'Therapist Selected' })
        .eq('id', authUserId);
      if (error) throw error;
      toast({
        title: "Therapist Selected!",
        description: `You have selected ${therapist.clinician_professional_name || `${therapist.clinician_first_name} ${therapist.clinician_last_name}`}.`,
      });
      if (refreshUserData) await refreshUserData(); // Refresh context
      navigate('/patient-dashboard');
    } catch (error: any) {
      console.error("Exception in handleSelectTherapist:", error);
      toast({ title: "Error", description: error.message || "An unexpected error occurred.", variant: "destructive" });
    } finally {
      setSelectingTherapistId(null);
    }
  };
  
  const displayTherapistName = (therapist: Therapist) => { /* ... as before ... */ 
    return therapist.clinician_professional_name || `${therapist.clinician_first_name || ''} ${therapist.clinician_last_name || ''}`.trim();
  };

  // Initial loading state for the whole page based on UserContext readiness
  if (isUserContextLoading || clientDataForFilter === undefined) { // Wait until clientDataForFilter is determined
    return (
      <Layout>
        <div className="container max-w-6xl mx-auto py-6 flex justify-center items-center min-h-[calc(100vh-200px)]">
          <Loader2 className="h-12 w-12 animate-spin text-valorwell-600" />
          <p className="ml-4 text-lg">Loading user information...</p>
        </div>
      </Layout>
    );
  }

  // If clientDataForFilter is null after context load (e.g. no profile, or user not client)
  // This case should ideally be handled by redirecting earlier if authUserId is missing.
  // If authUserId exists but userClientProfile was null, it means profile might be incomplete.
  if (!clientDataForFilter && authUserId) {
     return (
      <Layout>
        <div className="container max-w-6xl mx-auto py-6 text-center">
          <p className="text-xl text-gray-700">Could not load your profile data to filter therapists.</p>
          <p className="text-gray-500">Please ensure your profile is complete or try again later.</p>
          <Button onClick={() => navigate('/profile-setup')} className="mt-4">Go to Profile Setup</Button>
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
            {isLoadingPage ? ( // This now refers to therapist list loading
              <div className="flex flex-col justify-center items-center py-12 text-center">
                <Loader2 className="h-12 w-12 animate-spin text-valorwell-600" />
                <p className="mt-4 text-lg text-gray-600">Loading available therapists...</p>
              </div>
            ) : (
              <>
                {/* Display filtering info only if clientDataForFilter was available and used */}
                {clientDataForFilter && (clientDataForFilter.client_state || clientDataForFilter.client_age !== null) && (
                  <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-md">
                    <Alert>
                      <Info className="h-5 w-5 text-blue-600" />
                      <AlertTitle className="font-semibold text-blue-700">
                        {filteringApplied ? "Filtered Results" : "Showing All Therapists"}
                      </AlertTitle>
                      <AlertDescription className="text-blue-600">
                        {clientDataForFilter.client_state && clientDataForFilter.client_age !== null ? (
                          <>
                            Based on your state (<strong>{clientDataForFilter.client_state}</strong>) and age (<strong>{clientDataForFilter.client_age}</strong>).
                          </>
                        ) : clientDataForFilter.client_state ? (
                          <>
                            Based on your state (<strong>{clientDataForFilter.client_state}</strong>). Age not specified.
                          </>
                        ) : clientDataForFilter.client_age !== null ? (
                          <>
                            Based on your age (<strong>{clientDataForFilter.client_age}</strong>). State not specified.
                          </>
                        ) : "Filters not fully applied (missing state or age)." }
                         {!filteringApplied && therapists.length > 0 && therapists.length === allTherapists.length && clientDataForFilter && (clientDataForFilter.client_state || clientDataForFilter.client_age !== null) && " (No exact matches found, showing all.)"}
                      </AlertDescription>
                    </Alert>
                  </div>
                )}

                {therapists.length === 0 ? (
                  <div className="text-center py-12">
                    <p className="text-xl text-gray-600 mb-4">
                      {filteringApplied && (clientDataForFilter?.client_state || clientDataForFilter?.client_age !== null)
                        ? `No therapists currently match your specific criteria (State: ${clientDataForFilter?.client_state || 'N/A'}, Age: ${clientDataForFilter?.client_age ?? 'N/A'}).`
                        : "No therapists are currently available in our network. Please check back later or contact support."}
                    </p>
                    <Button 
                      className="mt-6 bg-valorwell-600 hover:bg-valorwell-700"
                      onClick={() => window.location.reload()} // Simple refresh, or could re-trigger fetch
                    >
                      Refresh Page
                    </Button>
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
                                  {therapist.clinician_first_name?.[0]?.toUpperCase()}
                                  {therapist.clinician_last_name?.[0]?.toUpperCase()}
                                </AvatarFallback>
                              </Avatar>
                              <h3 className="text-xl font-semibold text-center text-valorwell-700">
                                {displayTherapistName(therapist)}
                              </h3>
                              <p className="text-sm text-gray-500 mt-1 text-center">{therapist.clinician_title || 'Therapist'}</p>
                              
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
                                   therapist.clinician_bio_short || 
                                   'No biography available for this therapist.'}
                                </p>
                                
                                {clientDataForFilter?.client_state && therapist.clinician_licensed_states?.some(
                                  state => {
                                    if (!state || !clientDataForFilter.client_state) return false;
                                    const stateNorm = state.toLowerCase().trim();
                                    const clientStateNorm = clientDataForFilter.client_state.toLowerCase().trim();
                                    return stateNorm.includes(clientStateNorm) || clientStateNorm.includes(stateNorm);
                                  }
                                ) && (
                                  <div className="mt-4">
                                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                      Licensed in your state ({clientDataForFilter.client_state})
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
