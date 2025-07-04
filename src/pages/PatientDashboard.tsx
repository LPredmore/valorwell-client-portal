import React, { useState, useEffect } from 'react';
import NewLayout from '@/components/layout/NewLayout';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Calendar, Loader2, Clock, AlertCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/NewAuthContext';
import { toast } from 'sonner';
import { supabase, getOrCreateVideoRoom } from '@/integrations/supabase/client';
import { TimeZoneService } from '@/utils/timeZoneService';
import { Appointment } from '@/types/appointment';
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from '@/components/ui/table';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useClinicianData } from '@/hooks/useClinicianData';
import PHQ9Template from '@/components/templates/PHQ9Template';
import VideoChat from '@/components/video/VideoChat';
import { convertToClientDetails } from '@/utils/clientProfileConverter';

const PatientDashboard = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('dashboard');
  const {
    clientStatus,
    authState,
    isLoading,
    clientProfile,
    userId
  } = useAuth();
  const [loadingTimeoutReached, setLoadingTimeoutReached] = useState(false);

  // New states for appointments
  const [upcomingAppointments, setUpcomingAppointments] = useState<Appointment[]>([]);
  const [todayAppointments, setTodayAppointments] = useState<Appointment[]>([]);
  const [isLoadingAppointments, setIsLoadingAppointments] = useState(false);
  const [appointmentError, setAppointmentError] = useState<Error | null>(null);

  // New states for session management
  const [isVideoOpen, setIsVideoOpen] = useState(false);
  const [currentVideoUrl, setCurrentVideoUrl] = useState("");
  const [showPHQ9, setShowPHQ9] = useState(false);
  const [pendingAppointmentId, setPendingAppointmentId] = useState<string | number | null>(null);
  const [isLoadingVideoSession, setIsLoadingVideoSession] = useState(false);
  const [videoError, setVideoError] = useState<string | null>(null);
  const [isRetrying, setIsRetrying] = useState(false);

  // Add state for clinician data
  const {
    clinicianData,
    isLoading: isClinicianLoading
  } = useClinicianData(clientProfile?.client_assigned_therapist || undefined);

  // Determine the client's timezone safely with detailed logging for debugging
  const clientTimeZone = React.useMemo(() => {
    let timezone = clientProfile?.client_time_zone;
    
    // Log the raw timezone value we got from the profile
    console.log(`[PatientDashboard] Raw client timezone from profile: ${timezone || 'undefined'}`);
    
    // Use TimeZoneService to ensure we have a valid IANA timezone
    const safeTimezone = TimeZoneService.ensureIANATimeZone(timezone);
    console.log(`[PatientDashboard] Normalized timezone: ${safeTimezone}`);
    
    return safeTimezone;
  }, [clientProfile?.client_time_zone]);

  // Set up loading timeout effect
  useEffect(() => {
    const timer = setTimeout(() => {
      if (isLoading) {
        setLoadingTimeoutReached(true);
      }
    }, 10000); // Show timeout message after 10 seconds

    return () => clearTimeout(timer);
  }, [isLoading]);

  // IMMEDIATE REDIRECTION: Run this effect first and with highest priority
  // This will run as soon as the component mounts, before any other effects
  useEffect(() => {
    // Strong safety check for "New" clients - do an immediate redirect
    const isNewOrIncompleteClient = (clientStatus === 'New' || clientStatus === null || clientStatus === undefined) && clientProfile?.client_is_profile_complete !== true;
    console.log("[PatientDashboard] Initial mount check:", {
      clientStatus,
      profileComplete: clientProfile?.client_is_profile_complete,
      isNewOrIncompleteClient
    });
    if (isNewOrIncompleteClient) {
      console.log("[PatientDashboard] IMMEDIATE REDIRECT: User has New status or incomplete profile");
      toast.info("Please complete your profile setup first");
      navigate('/profile-setup', {
        replace: true
      });
    }
  }, []); // Empty dependency array ensures this runs once on mount

  // Enhanced debugging log
  useEffect(() => {
    console.log("[PatientDashboard] Current state:", {
      clientStatus,
      isLoading,
      authState,
      clientProfileComplete: clientProfile?.client_is_profile_complete,
      path: window.location.pathname,
      clientTimeZone,
      rawTimeZone: clientProfile?.client_time_zone
    });

    // SECOND REDIRECTION CHECK: Runs whenever data changes
    const isNewOrIncompleteClient = (clientStatus === 'New' || clientStatus === null || clientStatus === undefined) && clientProfile?.client_is_profile_complete !== true;
    if (isNewOrIncompleteClient) {
      console.log("[PatientDashboard] UPDATE REDIRECT: User has New status or incomplete profile, redirecting to profile setup");
      toast.info("Please complete your profile setup first");
      navigate('/profile-setup', {
        replace: true
      });
      return;
    }
  }, [clientStatus, navigate, isLoading, authState, clientProfile, clientTimeZone]);

  // THIRD SAFETY CHECK: Final verification after the component has fully rendered
  useEffect(() => {
    // Add a slight delay to ensure this runs after the component has fully rendered
    const timer = setTimeout(() => {
      const isNewOrIncompleteClient = (clientStatus === 'New' || clientStatus === null || clientStatus === undefined) && clientProfile?.client_is_profile_complete !== true;
      if (isNewOrIncompleteClient) {
        console.log("[PatientDashboard] FINAL SAFETY CHECK: User still has New status or incomplete profile, redirecting to profile setup");
        toast.info("Please complete your profile setup first");
        navigate('/profile-setup', {
          replace: true
        });
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [clientStatus, navigate, clientProfile]);

  // Fetch appointments for the logged-in user
  useEffect(() => {
    if (!userId || !clientProfile) return;
    const fetchAppointments = async () => {
      setIsLoadingAppointments(true);
      setAppointmentError(null);
      try {
        // Use the processed client timezone
        console.log(`[PatientDashboard] Fetching appointments using timezone: ${clientTimeZone}`);

        // Get today's date in UTC
        const todayUTC = TimeZoneService.now().toUTC().startOf('day');
        console.log("Fetching appointments for client:", userId);
        const {
          data,
          error
        } = await supabase.from('appointments').select(`
            *,
            client:client_id(
              client_first_name, 
              client_last_name,
              client_preferred_name
            )
          `).eq('client_id', userId).eq('status', 'scheduled').gte('start_at', todayUTC.toISO()).order('start_at', {
          ascending: true
        });
        if (error) {
          console.error('Error fetching appointments:', error);
          setAppointmentError(error);
          return;
        }
        console.log("Appointments data from Supabase:", data);
        if (data && data.length > 0) {
          const today = TimeZoneService.today(clientTimeZone);

          // Process and separate appointments
          const todayAppts: Appointment[] = [];
          const upcomingAppts: Appointment[] = [];
          data.forEach(appointment => {
            try {
              // Add the clientName convenience property
              const clientFirstName = appointment.client?.client_first_name || '';
              const clientLastName = appointment.client?.client_last_name || '';
              const clientPreferredName = appointment.client?.client_preferred_name || '';
              const enhancedAppointment = {
                ...appointment,
                clientName: clientPreferredName ? `${clientPreferredName} ${clientLastName}` : `${clientFirstName} ${clientLastName}`
              };

              // Check if appointment is today
              const appointmentDate = TimeZoneService.fromUTC(appointment.start_at, clientTimeZone);
              const isAppointmentToday = TimeZoneService.isSameDay(appointmentDate, today);
              if (isAppointmentToday) {
                todayAppts.push(enhancedAppointment);
              } else {
                upcomingAppts.push(enhancedAppointment);
              }
            } catch (error) {
              console.error('Error processing appointment:', error);
            }
          });
          setTodayAppointments(todayAppts);
          setUpcomingAppointments(upcomingAppts);
          console.log("Today's appointments:", todayAppts);
          console.log("Upcoming appointments:", upcomingAppts);
        } else {
          // No appointments found
          setTodayAppointments([]);
          setUpcomingAppointments([]);
        }
      } catch (error) {
        console.error('Error in fetchAppointments:', error);
        setAppointmentError(error instanceof Error ? error : new Error('Failed to fetch appointments'));
      } finally {
        setIsLoadingAppointments(false);
      }
    };
    fetchAppointments();
  }, [userId, clientProfile, clientTimeZone]);

  // Format time for display in user's time zone
  const formatAppointmentTime = (utcTimestamp: string) => {
    console.log(`[formatAppointmentTime] Using timezone: ${clientTimeZone} for timestamp: ${utcTimestamp}`);
    return TimeZoneService.formatUTCInTimezone(utcTimestamp, clientTimeZone, 'h:mm a');
  };

  // Format date from UTC timestamp
  const formatAppointmentDate = (utcTimestamp: string) => {
    const localDate = TimeZoneService.fromUTC(utcTimestamp, clientTimeZone);
    return localDate.toFormat('EEEE, MMMM d, yyyy');
  };

  // New handler for starting a therapy session with improved error handling
  const handleStartSession = async (appointmentId: string | number) => {
    console.log(`Starting session for appointment ${appointmentId}`);
    setPendingAppointmentId(appointmentId);
    
    try {
      // Check if PHQ9 assessment already exists for this appointment
      const { checkPHQ9AssessmentExists } = await import('@/integrations/supabase/client');
      const { exists, error } = await checkPHQ9AssessmentExists(appointmentId.toString());
      
      if (error) {
        console.error('Error checking for PHQ9 assessment:', error);
        // Show the PHQ9 form on error to be safe
        setShowPHQ9(true);
      } else if (exists) {
        // Assessment already exists, skip directly to video session
        console.log('PHQ9 assessment already exists, skipping directly to video session');
        handlePHQ9Complete();
      } else {
        // No assessment exists, show the form
        console.log('No PHQ9 assessment exists, showing form');
        setShowPHQ9(true);
      }
    } catch (error) {
      console.error('Exception in handleStartSession:', error);
      // Show PHQ9 form on error to be safe
      setShowPHQ9(true);
    }
    
    // Reset any previous errors
    setVideoError(null);
  };

  // Handle PHQ9 completion with enhanced error handling
  const handlePHQ9Complete = async () => {
    setShowPHQ9(false);
    
    if (pendingAppointmentId) {
      setIsLoadingVideoSession(true);
      
      try {
        // Get or create a video room for the appointment
        const result = await getOrCreateVideoRoom(pendingAppointmentId.toString());
        
        if (!result.success || !result.url) {
          console.error('Error creating video room:', result.error || 'Unknown error');
          throw new Error(result.error?.message || result.error || 'Failed to create video room');
        }
        
        console.log('Video room created/retrieved:', result.url);
        setCurrentVideoUrl(result.url);
        setIsVideoOpen(true);
        
        toast.success("Video session is ready", {
          description: "You are now entering the video session"
        });
      } catch (error) {
        console.error('Error starting video session:', error);
        setVideoError(error.message || "Failed to start video session");
        toast.error("Failed to start video session", {
          description: "Please try again or contact support"
        });
      } finally {
        setIsLoadingVideoSession(false);
        setPendingAppointmentId(null);
      }
    }
  };

  // Add retry mechanism for video sessions
  const handleRetryVideoSession = async (appointmentId: string | number) => {
    setIsRetrying(true);
    setVideoError(null);
    
    try {
      // Force recreation of the room
      const result = await getOrCreateVideoRoom(appointmentId.toString());
      
      if (!result.success || !result.url) {
        throw new Error(result.error?.message || result.error || 'Failed to create video room on retry');
      }
      
      setCurrentVideoUrl(result.url);
      setIsVideoOpen(true);
      
      toast.success("Video session reconnected", {
        description: "You have been reconnected to your session"
      });
    } catch (error) {
      console.error('Error retrying video session:', error);
      setVideoError(error.message || "Failed to reconnect to video session");
      toast.error("Failed to reconnect", {
        description: "Please contact support for assistance"
      });
    } finally {
      setIsRetrying(false);
    }
  };

  // Handle closing video session with cleanup
  const handleCloseVideoSession = () => {
    setIsVideoOpen(false);
    setCurrentVideoUrl("");
    setVideoError(null);
  };

  // Convert clientProfile to ClientDetails for PHQ9Template
  const clientDetailsForPHQ9 = convertToClientDetails(clientProfile);

  // Get timezone display name
  const timeZoneDisplay = TimeZoneService.getTimeZoneDisplayName(clientTimeZone);
  
  // FINAL RENDER CHECK: Even after loading is complete, check status one final time
  const isNewOrIncompleteClient = (clientStatus === 'New' || clientStatus === null || clientStatus === undefined) && clientProfile?.client_is_profile_complete !== true;
  if (isLoading) {
    return <div className="flex items-center justify-center h-screen flex-col">
        <Loader2 className="h-12 w-12 animate-spin text-blue-500 mb-4" />
        <p className="text-gray-600">Loading your dashboard...</p>
        
        {loadingTimeoutReached && <div className="mt-6 text-center max-w-md px-4">
            <p className="text-amber-600 mb-2">This is taking longer than expected.</p>
            <p className="text-gray-600 mb-4">There might be an issue with your connection.</p>
            <Button onClick={() => window.location.reload()} variant="outline">
              Refresh Page
            </Button>
          </div>}
      </div>;
  }

  // FINAL RENDER CHECK: Even after loading is complete, check status one final time
  if (isNewOrIncompleteClient) {
    console.log("[PatientDashboard] PRE-RENDER CHECK: User has New status or incomplete profile, redirecting to profile setup");
    // Use a timeout to avoid potential rendering issues
    setTimeout(() => {
      navigate('/profile-setup', {
        replace: true
      });
    }, 0);

    // Show a temporary loading state to avoid flashing content before redirect happens
    return <div className="flex items-center justify-center h-screen flex-col">
        <Loader2 className="h-12 w-12 animate-spin text-blue-500 mb-4" />
        <p className="text-gray-600">Redirecting to profile setup...</p>
      </div>;
  }
  return <NewLayout>
      <div className="container mx-auto max-w-6xl">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-semibold">Patient Portal</h1>
          <div className="flex items-center space-x-2">
            {/* This would normally contain user info/avatar */}
          </div>
        </div>
        
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="border-b w-full justify-start mb-6 bg-transparent p-0">
            <TabsTrigger value="dashboard" className="data-[state=active]:border-b-2 data-[state=active]:border-valorwell-700 data-[state=active]:text-valorwell-700 rounded-none px-4 py-2" onClick={() => navigate('/patient-dashboard')}>
              Dashboard
            </TabsTrigger>
            
          </TabsList>
          
          <TabsContent value="dashboard">
            <div className="space-y-6">
              {/* Today's Appointments */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg">Today's Appointments</CardTitle>
                  <CardDescription>Sessions scheduled for today in {timeZoneDisplay}</CardDescription>
                </CardHeader>
                <CardContent className="pt-2">
                  {isLoadingAppointments ? (
                    <div className="flex justify-center items-center py-8">
                      <Loader2 className="h-8 w-8 animate-spin text-valorwell-700" />
                    </div>
                  ) : appointmentError ? (
                    <div className="flex items-center justify-center py-8 text-red-500">
                      <AlertCircle className="h-6 w-6 mr-2" />
                      <span>Error loading appointments</span>
                    </div>
                  ) : todayAppointments.length > 0 ? (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Time</TableHead>
                          <TableHead>Therapist</TableHead>
                          <TableHead>Type</TableHead>
                          <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {todayAppointments.map(appointment => (
                          <TableRow key={appointment.id}>
                            <TableCell>
                              {formatAppointmentTime(appointment.start_at)} - {formatAppointmentTime(appointment.end_at)}
                            </TableCell>
                            <TableCell>{clientProfile?.client_assigned_therapist ? 'Your Therapist' : 'Unassigned'}</TableCell>
                            <TableCell>{appointment.type}</TableCell>
                            <TableCell className="text-right">
                              <Button 
                                variant="outline" 
                                size="sm" 
                                onClick={() => handleStartSession(appointment.id)}
                                disabled={isLoadingVideoSession || isRetrying}
                                className="bg-valorwell-700 text-white hover:bg-valorwell-800"
                              >
                                {isLoadingVideoSession || isRetrying ? "Loading..." : "Start Session"}
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  ) : (
                    <div className="flex flex-col items-center justify-center py-8 text-center">
                      <Calendar className="h-16 w-16 text-gray-300 mb-4" />
                      <h3 className="text-lg font-medium">No appointments today</h3>
                      <p className="text-sm text-gray-500 mt-1">Check your upcoming appointments below</p>
                    </div>
                  )}
                </CardContent>
              </Card>
              
              {/* Therapist Information */}
              <Card>
                <CardHeader className="pb-2">
                  <div>
                    <CardTitle className="text-lg">Your Therapist</CardTitle>
                  </div>
                </CardHeader>
                <CardContent className="pt-2">
                  <div className="flex items-start gap-4">
                    {/* Use Avatar component with clinician image */}
                    {isClinicianLoading ? (
                      <div className="w-32 h-32 flex items-center justify-center bg-gray-100 rounded-md">
                        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
                      </div>
                    ) : (
                      <Avatar className="w-32 h-32 border border-gray-200 rounded-md">
                        {/* We need to check for image property that actually exists in the Clinician interface */}
                        <AvatarImage src={clinicianData?.clinician_image_url || ""} alt="Therapist" className="object-cover w-full h-full rounded-md" />
                        <AvatarFallback className="w-full h-full text-2xl bg-valorwell-100 text-valorwell-700 rounded-md">
                          {clinicianData?.clinician_first_name?.[0] || ''}{clinicianData?.clinician_last_name?.[0] || ''}
                        </AvatarFallback>
                      </Avatar>
                    )}
                    <div>
                      <h3 className="font-semibold mb-2">
                        {isClinicianLoading ? "Loading therapist information..." : clinicianData ? `About ${clinicianData.clinician_first_name || ''} ${clinicianData.clinician_last_name || ''}, ${clinicianData.clinician_type || 'Therapist'}` : "No assigned therapist"}
                      </h3>
                      <p className="text-gray-700">
                        {isClinicianLoading ? <span className="text-gray-400">Loading bio...</span> : clinicianData?.clinician_bio ? clinicianData.clinician_bio : "No therapist bio available"}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              {/* Upcoming Appointments */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg">Upcoming Appointments</CardTitle>
                  <CardDescription>Your scheduled sessions in {timeZoneDisplay}</CardDescription>
                </CardHeader>
                <CardContent className="pt-2">
                  {isLoadingAppointments ? (
                    <div className="flex justify-center items-center py-8">
                      <Loader2 className="h-8 w-8 animate-spin text-valorwell-700" />
                    </div>
                  ) : appointmentError ? (
                    <div className="flex items-center justify-center py-8 text-red-500">
                      <AlertCircle className="h-6 w-6 mr-2" />
                      <span>Error loading appointments</span>
                    </div>
                  ) : upcomingAppointments.length > 0 ? (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Date</TableHead>
                          <TableHead>Time</TableHead>
                          <TableHead>Type</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {upcomingAppointments.map(appointment => (
                          <TableRow key={appointment.id}>
                            <TableCell>{formatAppointmentDate(appointment.start_at)}</TableCell>
                            <TableCell>
                              {formatAppointmentTime(appointment.start_at)} - {formatAppointmentTime(appointment.end_at)}
                            </TableCell>
                            <TableCell>{appointment.type}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  ) : (
                    <div className="flex flex-col items-center justify-center py-8 text-center">
                      <Calendar className="h-16 w-16 text-gray-300 mb-4" />
                      <h3 className="text-lg font-medium">No upcoming appointments</h3>
                      <p className="text-sm text-gray-500 mt-1">Your scheduled sessions will appear here</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
      
      {/* PHQ9 Assessment Dialog */}
      {showPHQ9 && (
        <PHQ9Template 
          onClose={() => setShowPHQ9(false)} 
          clinicianName={clinicianData ? `${clinicianData.clinician_first_name} ${clinicianData.clinician_last_name}` : "Your Therapist"} 
          clientData={clientDetailsForPHQ9} 
          onComplete={handlePHQ9Complete}
          appointmentId={pendingAppointmentId}
        />
      )}

      {/* Video Chat Error Dialog */}
      {videoError && !isVideoOpen && (
        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50">
          <div className="bg-white p-6 rounded-lg max-w-md">
            <h3 className="text-lg font-semibold mb-2 text-red-600">Video Session Error</h3>
            <p className="mb-4">{videoError}</p>
            {pendingAppointmentId && (
              <div className="flex justify-end space-x-2">
                <Button variant="outline" onClick={() => setVideoError(null)}>Cancel</Button>
                <Button 
                  onClick={() => handleRetryVideoSession(pendingAppointmentId)} 
                  disabled={isRetrying}
                >
                  {isRetrying ? "Retrying..." : "Retry Connection"}
                </Button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Video Chat Component */}
      {currentVideoUrl && (
        <VideoChat 
          roomUrl={currentVideoUrl} 
          isOpen={isVideoOpen} 
          onClose={handleCloseVideoSession} 
        />
      )}
    </NewLayout>
  );
};

export default PatientDashboard;
