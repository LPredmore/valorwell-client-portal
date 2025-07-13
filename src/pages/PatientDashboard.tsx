import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CalendarDays, Clock, Video, Plus, FileText, User, Calendar } from "lucide-react";
import { useAuth } from '@/context/NewAuthContext';
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import VideoChat from "@/components/video/VideoChat";
import NewLayout from "@/components/layout/NewLayout";
import { formatInClientTimezone } from "@/utils/dateFormatting";
import { AppointmentCard } from "@/components/dashboard/AppointmentCard";

interface Appointment {
  id: string;
  start_at: string;
  end_at: string;
  video_room_url: string;
  notes: string;
  client_id: string;
  clinician_id: string;
  type: string;
  status: string;
  // Add other properties as needed
}

const PatientDashboard = () => {
  const { user } = useAuth();
  const [upcomingAppointments, setUpcomingAppointments] = useState<Appointment[]>([]);
  const [pastAppointments, setPastAppointments] = useState<Appointment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [clientData, setClientData] = useState<any>(null);
  const [currentVideoUrl, setCurrentVideoUrl] = useState<string | null>(null);
  const [isVideoOpen, setIsVideoOpen] = useState(false);

  useEffect(() => {
    const fetchAppointments = async () => {
      setIsLoading(true);
      try {
        if (!user) {
          console.error("User is not authenticated.");
          return;
        }

        // Fetch upcoming appointments
        const { data: upcoming, error: upcomingError } = await supabase
          .from('appointments')
          .select('*')
          .eq('client_id', user.id)
          .gte('start_at', new Date().toISOString())
          .order('start_at', { ascending: true });

        if (upcomingError) {
          console.error("Error fetching upcoming appointments:", upcomingError);
          toast.error("Failed to load upcoming appointments.");
        } else {
          setUpcomingAppointments(upcoming || []);
        }

        // Fetch past appointments
        const { data: past, error: pastError } = await supabase
          .from('appointments')
          .select('*')
          .eq('client_id', user.id)
          .lt('start_at', new Date().toISOString())
          .order('start_at', { ascending: false });

        if (pastError) {
          console.error("Error fetching past appointments:", pastError);
          toast.error("Failed to load past appointments.");
        } else {
          setPastAppointments(past || []);
        }

        // Fetch client data
        const { data: client, error: clientError } = await supabase
          .from('clients')
          .select('*')
          .eq('user_id', user.id)
          .single();

        if (clientError) {
          console.error("Error fetching client data:", clientError);
          toast.error("Failed to load client data.");
        } else {
          setClientData(client);
        }

      } finally {
        setIsLoading(false);
      }
    };

    fetchAppointments();
  }, [user]);

  const handleCloseVideoSession = () => {
    setIsVideoOpen(false);
    setCurrentVideoUrl(null);
  };

  const handleJoinVideoSession = (videoUrl: string) => {
    setCurrentVideoUrl(videoUrl);
    setIsVideoOpen(true);
  };

  if (!user) {
    return (
      <NewLayout>
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <h1 className="text-2xl font-bold mb-4">Please log in</h1>
            <p className="text-muted-foreground">You need to be logged in to view your dashboard.</p>
          </div>
        </div>
      </NewLayout>
    );
  }

  if (isLoading) {
    return (
      <NewLayout>
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-gray-900 mx-auto"></div>
            <p className="mt-4 text-lg">Loading your dashboard...</p>
          </div>
        </div>
      </NewLayout>
    );
  }

  return (
    <NewLayout>
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">
            Welcome back{clientData?.client_first_name ? `, ${clientData.client_first_name}` : ''}!
          </h1>
          <p className="text-muted-foreground">Here's an overview of your appointments and health journey.</p>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Upcoming Appointments</CardTitle>
              <CalendarDays className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{upcomingAppointments.length}</div>
              <p className="text-xs text-muted-foreground">
                {upcomingAppointments.length === 1 ? 'appointment' : 'appointments'} scheduled
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Sessions</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{pastAppointments.length + upcomingAppointments.length}</div>
              <p className="text-xs text-muted-foreground">lifetime appointments</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">This Month</CardTitle>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {upcomingAppointments.filter(apt => {
                  const aptDate = new Date(apt.start_at);
                  const now = new Date();
                  return aptDate.getMonth() === now.getMonth() && aptDate.getFullYear() === now.getFullYear();
                }).length}
              </div>
              <p className="text-xs text-muted-foreground">appointments this month</p>
            </CardContent>
          </Card>
        </div>

        {/* Upcoming Appointments */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-semibold">Upcoming Appointments</h2>
          </div>

          {upcomingAppointments.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <CalendarDays className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium mb-2">No upcoming appointments</h3>
                <p className="text-muted-foreground text-center mb-6">
                  You don't have any appointments scheduled. Contact your therapist to schedule your next session.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4">
              {upcomingAppointments.map((appointment) => (
                <AppointmentCard
                  key={appointment.id}
                  appointment={appointment}
                  timeZoneDisplay={clientData?.client_time_zone || 'UTC'}
                  userTimeZone={clientData?.client_time_zone || 'UTC'}
                  showStartButton={true}
                  onStartSession={() => handleJoinVideoSession(appointment.video_room_url || '')}
                />
              ))}
            </div>
          )}
        </div>

        {/* Recent Appointments */}
        {pastAppointments.length > 0 && (
          <div className="mb-8">
            <h2 className="text-2xl font-semibold mb-6">Recent Appointments</h2>
            <div className="grid gap-4">
              {pastAppointments.slice(0, 3).map((appointment) => (
                <AppointmentCard
                  key={appointment.id}
                  appointment={appointment}
                  timeZoneDisplay={clientData?.client_time_zone || 'UTC'}
                  userTimeZone={clientData?.client_time_zone || 'UTC'}
                  showStartButton={false}
                />
              ))}
            </div>
          </div>
        )}
      </div>

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
