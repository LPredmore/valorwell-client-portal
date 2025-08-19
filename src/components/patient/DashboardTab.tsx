import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from '@/context/NewAuthContext';
import { supabase, checkPHQ9AssessmentExists, getOrCreateVideoRoom } from "@/integrations/supabase/client";
import { toast } from "sonner";
import TherapistInfoCard from '@/components/therapist/TherapistInfoCard';
import AppointmentCard from './AppointmentCard';
import PHQ9Template from '@/components/templates/PHQ9Template';
import VideoSessionDialog from './VideoSessionDialog';
import { getSafeTimezone } from '@/utils/dateFormatting';
import { startOfDay, endOfDay, addDays, parseISO } from 'date-fns';
import { formatInTimeZone } from 'date-fns-tz';
const DashboardTab = () => {
  const {
    user
  } = useAuth();
  const [isLoading, setIsLoading] = useState(true);
  const [clientData, setClientData] = useState<any>(null);
  const [therapistData, setTherapistData] = useState<any>(null);
  const [todayAppointments, setTodayAppointments] = useState<any[]>([]);
  const [futureAppointments, setFutureAppointments] = useState<any[]>([]);
  const [appointmentsLoading, setAppointmentsLoading] = useState(false);
  const [sessionLoading, setSessionLoading] = useState<string | null>(null);
  const [cancelLoading, setCancelLoading] = useState<string | null>(null);
  const [phq9Open, setPHQ9Open] = useState(false);
  const [currentAppointmentId, setCurrentAppointmentId] = useState<string>('');
  const [videoDialogOpen, setVideoDialogOpen] = useState(false);
  const [currentVideoUrl, setCurrentVideoUrl] = useState<string | null>(null);

  // Fetch appointments
  const fetchAppointments = async (clientId: string, timezone: string) => {
    setAppointmentsLoading(true);
    try {
      const safeTimezone = getSafeTimezone(timezone);
      const now = new Date();
      
      // Get today's date range in client timezone
      const todayStart = startOfDay(now);
      const todayEnd = endOfDay(now);
      const tomorrowStart = addDays(todayStart, 1);
      
      // Convert to UTC for database query
      const todayStartUTC = formatInTimeZone(todayStart, safeTimezone, "yyyy-MM-dd'T'HH:mm:ss.SSS'Z'");
      const todayEndUTC = formatInTimeZone(todayEnd, safeTimezone, "yyyy-MM-dd'T'HH:mm:ss.SSS'Z'");
      const tomorrowStartUTC = formatInTimeZone(tomorrowStart, safeTimezone, "yyyy-MM-dd'T'HH:mm:ss.SSS'Z'");

      // Fetch today's appointments
      const { data: todayData, error: todayError } = await supabase
        .from('appointments')
        .select('id, start_at, end_at, type, status, video_room_url')
        .eq('client_id', clientId)
        .gte('start_at', todayStartUTC)
        .lt('start_at', todayEndUTC)
        .order('start_at', { ascending: true });

      if (todayError) {
        console.error('Error fetching today appointments:', todayError);
      } else {
        setTodayAppointments(todayData || []);
      }

      // Fetch future appointments (from tomorrow onwards)
      const { data: futureData, error: futureError } = await supabase
        .from('appointments')
        .select('id, start_at, end_at, type, status, video_room_url')
        .eq('client_id', clientId)
        .gte('start_at', tomorrowStartUTC)
        .order('start_at', { ascending: true })
        .limit(10);

      if (futureError) {
        console.error('Error fetching future appointments:', futureError);
      } else {
        setFutureAppointments(futureData || []);
      }
    } catch (error) {
      console.error('Exception fetching appointments:', error);
    } finally {
      setAppointmentsLoading(false);
    }
  };

  // Smart session start logic
  const handleStartSession = async (appointmentId: string) => {
    setSessionLoading(appointmentId);
    
    try {
      // Check if PHQ9 already exists for this appointment
      const { exists } = await checkPHQ9AssessmentExists(appointmentId);
      
      if (exists) {
        // Skip PHQ9, go straight to video
        const { success, url } = await getOrCreateVideoRoom(appointmentId);
        if (success && url) {
          setCurrentVideoUrl(url);
          setVideoDialogOpen(true);
          toast.success('Video session opened');
        } else {
          toast.error('Failed to start video session');
        }
      } else {
        // Open PHQ9 first
        setCurrentAppointmentId(appointmentId);
        setPHQ9Open(true);
      }
    } catch (error) {
      console.error('Error starting session:', error);
      toast.error('Failed to start session');
    } finally {
      setSessionLoading(null);
    }
  };

  // Handle PHQ9 completion and start video session
  const handlePHQ9Complete = async () => {
    if (currentAppointmentId) {
      try {
        const { success, url } = await getOrCreateVideoRoom(currentAppointmentId);
        if (success && url) {
          setCurrentVideoUrl(url);
          setVideoDialogOpen(true);
          toast.success('PHQ9 completed and video session opened');
        } else {
          toast.error('PHQ9 saved but failed to start video session');
        }
      } catch (error) {
        console.error('Error starting video after PHQ9:', error);
        toast.error('PHQ9 saved but failed to start video session');
      }
    }
    setPHQ9Open(false);
    setCurrentAppointmentId('');
  };

  // Check if appointment is more than 24 hours away
  const isMoreThan24HoursAway = (appointmentStart: string): boolean => {
    try {
      const appointmentDate = parseISO(appointmentStart);
      const now = new Date();
      const hoursUntilAppointment = (appointmentDate.getTime() - now.getTime()) / (1000 * 60 * 60);
      return hoursUntilAppointment > 24;
    } catch (error) {
      console.error('Error calculating appointment time difference:', error);
      return false;
    }
  };

  // Handle appointment cancellation
  const handleCancelAppointment = async (appointmentId: string) => {
    setCancelLoading(appointmentId);
    
    try {
      const { error } = await supabase
        .from('appointments')
        .update({ status: 'cancelled' })
        .eq('id', appointmentId);

      if (error) {
        console.error('Error cancelling appointment:', error);
        toast.error('Failed to cancel appointment');
      } else {
        toast.success('Appointment cancelled successfully');
        // Refresh appointments
        if (clientData) {
          fetchAppointments(clientData.id, clientData.client_time_zone);
        }
      }
    } catch (error) {
      console.error('Exception cancelling appointment:', error);
      toast.error('Failed to cancel appointment');
    } finally {
      setCancelLoading(null);
    }
  };
  useEffect(() => {
    const fetchClientData = async () => {
      setIsLoading(true);
      try {
        if (!user) {
          console.error("User is not authenticated.");
          return;
        }

        // Fetch client data
        const {
          data: client,
          error: clientError
        } = await supabase.from('clients').select('*').eq('id', user.id).single();
        if (clientError) {
          console.error("Error fetching client data:", clientError);
          toast.error("Failed to load client data.");
        } else {
          setClientData(client);

          // If client has an assigned therapist, fetch therapist data
          if (client?.client_assigned_therapist) {
            const {
              data: therapist,
              error: therapistError
            } = await supabase.from('clinicians').select('*').eq('id', client.client_assigned_therapist).single();
            if (therapistError) {
              console.error("Error fetching therapist data:", therapistError);
            } else {
              setTherapistData(therapist);
            }
          }

          // Fetch appointments after client data is loaded
          if (client) {
            fetchAppointments(client.id, client.client_time_zone);
          }
        }
      } finally {
        setIsLoading(false);
      }
    };
    fetchClientData();
  }, [user]);
  if (!user) {
    return <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Please log in</h1>
          <p className="text-muted-foreground">You need to be logged in to view your dashboard.</p>
        </div>
      </div>;
  }
  if (isLoading) {
    return <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-gray-900 mx-auto"></div>
          <p className="mt-4 text-lg">Loading your dashboard...</p>
        </div>
      </div>;
  }
  return <div className="space-y-6">
      <div className="mb-8">
        <h2 className="text-3xl font-bold mb-2">
          Welcome back{clientData?.client_preferred_name || clientData?.client_first_name ? `, ${clientData.client_preferred_name || clientData.client_first_name}` : ''}!
        </h2>
      </div>

      {/* Welcome Message */}
      <Card>
        <CardHeader>
          <CardTitle>Welcome to Your Patient Portal</CardTitle>
          <CardDescription>Your secure portal for managing your healthcare information</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            Use the tabs above to access your documents, update your profile, 
            manage your insurance information, and select your therapist.
          </p>
        </CardContent>
      </Card>

      {/* Today's Appointments Section */}
      <Card>
        <CardHeader>
          <CardTitle>Today's Appointments</CardTitle>
          <CardDescription>Your scheduled appointments for today</CardDescription>
        </CardHeader>
        <CardContent>
          {appointmentsLoading ? (
            <div className="text-center py-4">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto"></div>
              <p className="mt-2 text-sm text-muted-foreground">Loading appointments...</p>
            </div>
          ) : todayAppointments.length > 0 ? (
            <div className="space-y-4">
              {todayAppointments.map((appointment) => (
                <AppointmentCard
                  key={appointment.id}
                  appointment={appointment}
                  clientTimezone={clientData?.client_time_zone}
                  isToday={true}
                  onStartSession={handleStartSession}
                  isSessionLoading={sessionLoading === appointment.id}
                />
              ))}
            </div>
          ) : (
            <p className="text-muted-foreground text-center py-4">
              No appointments scheduled for today
            </p>
          )}
        </CardContent>
      </Card>

      {/* Future Appointments Section */}
      <Card>
        <CardHeader>
          <CardTitle>Upcoming Appointments</CardTitle>
          <CardDescription>Your future scheduled appointments</CardDescription>
        </CardHeader>
        <CardContent>
          {appointmentsLoading ? (
            <div className="text-center py-4">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto"></div>
              <p className="mt-2 text-sm text-muted-foreground">Loading appointments...</p>
            </div>
          ) : futureAppointments.length > 0 ? (
            <div className="space-y-4">
              {futureAppointments.map((appointment) => (
                <AppointmentCard
                  key={appointment.id}
                  appointment={appointment}
                  clientTimezone={clientData?.client_time_zone}
                  isToday={false}
                  onStartSession={handleStartSession}
                  isSessionLoading={false}
                  showCancelButton={isMoreThan24HoursAway(appointment.start_at)}
                  onCancelAppointment={handleCancelAppointment}
                  isCancelLoading={cancelLoading === appointment.id}
                />
              ))}
            </div>
          ) : (
            <p className="text-muted-foreground text-center py-4">
              No upcoming appointments scheduled
            </p>
          )}
        </CardContent>
      </Card>

      {/* Assigned Therapist Section */}
      {therapistData && <TherapistInfoCard name={therapistData.clinician_professional_name || `${therapistData.clinician_first_name || ''} ${therapistData.clinician_last_name || ''}`.trim()} bio={therapistData.clinician_bio} imageUrl={therapistData.clinician_image_url} email={therapistData.clinician_email || 'Contact clinic for email'} />}

      {/* PHQ9 Dialog */}
      {phq9Open && (
        <PHQ9Template
          onClose={() => {
            setPHQ9Open(false);
            setCurrentAppointmentId('');
          }}
          clinicianName={therapistData?.clinician_professional_name || `${therapistData?.clinician_first_name || ''} ${therapistData?.clinician_last_name || ''}`.trim() || 'Your Clinician'}
          clientData={clientData}
          appointmentId={currentAppointmentId}
          onComplete={handlePHQ9Complete}
          onCancel={() => {
            setPHQ9Open(false);
            setCurrentAppointmentId('');
          }}
        />
      )}

      {/* Video Session Dialog */}
      <VideoSessionDialog
        open={videoDialogOpen}
        onOpenChange={setVideoDialogOpen}
        videoUrl={currentVideoUrl}
      />
    </div>;
};
export default DashboardTab;