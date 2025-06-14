import { useState, useEffect, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase, getOrCreateVideoRoom } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { TimeZoneService } from "@/utils/timeZoneService";
import { DateTime } from "luxon";
import { Appointment } from "@/types/appointment";

// Interface for the raw Supabase response
interface RawSupabaseAppointment {
  id: string;
  client_id: string;
  clinician_id: string;
  start_at: string;
  end_at: string;
  type: string;
  status: string;
  appointment_recurring: string | null;
  recurring_group_id: string | null;
  video_room_url: string | null;
  notes: string | null;
  // Modified to account for both object and array formats from Supabase joins
  clients: any; // Using any temporarily to resolve the type error
}

// Type guard to check if an object is a valid client data object from Supabase
function isValidClientData(obj: any): obj is {
  client_first_name: string | null;
  client_last_name: string | null;
  client_preferred_name: string | null;
} {
  return (
    obj &&
    typeof obj === "object" &&
    ("client_first_name" in obj ||
      "client_last_name" in obj ||
      "client_preferred_name" in obj)
  );
}

// Extended appointment type for the display formatting
interface FormattedAppointment extends Appointment {
  formattedDate?: string;
  formattedStartTime?: string;
  formattedEndTime?: string;
}

export const useAppointments = (
  clinicianId: string | null,
  fromDate?: Date,
  toDate?: Date,
  timeZone?: string,
  refreshTrigger: number = 0 // Add the refreshTrigger parameter with default value
) => {
  const { toast } = useToast();
  const [currentAppointment, setCurrentAppointment] =
    useState<Appointment | null>(null);
  const [isVideoOpen, setIsVideoOpen] = useState(false);
  const [currentVideoUrl, setCurrentVideoUrl] = useState("");
  const [showSessionTemplate, setShowSessionTemplate] = useState(false);
  const [sessionClientData, setSessionClientData] = useState<
    Appointment["client"] | null
  >(null);
  const [isLoadingSessionClientData, setIsLoadingSessionClientData] =
    useState(false);

  const formattedClinicianId = clinicianId ? clinicianId : null;
  const safeUserTimeZone = TimeZoneService.ensureIANATimeZone(
    timeZone || TimeZoneService.DEFAULT_TIMEZONE
  );
  
  // Log clinician ID handling for debugging
  console.log("[useAppointments] Clinician ID handling:", {
    rawClinicianId: clinicianId,
    formattedClinicianId,
    isUUIDFormat: /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(clinicianId || ""),
    fromTimeZone: safeUserTimeZone
  });

  const { fromUTCISO, toUTCISO } = useMemo(() => {
    let fromISO: string | undefined;
    let toISO: string | undefined;
    try {
      if (fromDate) {
        fromISO = 
          DateTime.fromJSDate(fromDate)
            .setZone(safeUserTimeZone)
            .startOf('day') 
            .toUTC()
            .toISO();
        
        // Add 6 days to create a proper week window (since our view has 7 days)
        const weekEnd = DateTime.fromJSDate(fromDate)
          .setZone(safeUserTimeZone)
          .startOf('day')
          .plus({ days: 6 })
          .endOf('day')
          .toUTC()
          .toISO();
          
        toISO = weekEnd;
      } else if (toDate) {
        // If only toDate exists, calculate a week window ending on toDate
        toISO = 
          DateTime.fromJSDate(toDate)
            .setZone(safeUserTimeZone)
            .endOf('day')
            .toUTC()
            .toISO();
            
        const weekStart = DateTime.fromJSDate(toDate)
          .setZone(safeUserTimeZone)
          .endOf('day')
          .minus({ days: 6 })
          .startOf('day')
          .toUTC()
          .toISO();
          
        fromISO = weekStart;
      } else {
        // If neither from/to dates exist, fetch current UTC week
        const now = DateTime.utc();
        fromISO = now.startOf('week').toISO();
        toISO = now.endOf('week').toISO();
      }
      
      return { fromUTCISO: fromISO, toUTCISO: toISO };
    } catch (e) {
      console.error("Error converting date range:", e);
      return {};
    }
  }, [fromDate, toDate, safeUserTimeZone]);

  const {
    data: fetchedAppointments = [],
    isLoading,
    error,
    refetch: refetchAppointments,
  } = useQuery<Appointment[], Error>({
    // Include refreshTrigger in the queryKey to force refresh when it changes
    queryKey: ["appointments", formattedClinicianId, fromUTCISO, toUTCISO, refreshTrigger],
    queryFn: async (): Promise<Appointment[]> => {
      if (!formattedClinicianId) return [];
      console.log(
        "[useAppointments] Fetching for clinician:",
        formattedClinicianId,
        { from: fromUTCISO, to: toUTCISO, refreshTrigger }
      );

      let query = supabase
        .from("appointments")
        .select(
          `id, client_id, clinician_id, start_at, end_at, type, status, appointment_recurring, recurring_group_id, video_room_url, notes, clients (client_first_name, client_last_name, client_preferred_name)`
        )
        .eq("clinician_id", formattedClinicianId)
        .eq("status", "scheduled");

      // Use more robust timezone-aware filtering
      console.log("[useAppointments] Applying robust UTC filter:", {
        fromUTCISO,
        toUTCISO,
        clinicianTZ: safeUserTimeZone
      });
      
      if (fromUTCISO) query = query.gte("start_at", fromUTCISO);
      if (toUTCISO) query = query.lte("end_at", toUTCISO);
      
      // Add explicit time zone debugging
      query = query
        .order("start_at", { ascending: true });
        
      // Log debug info
      console.log("[useAppointments] Final query details:", {
        clinician_id: formattedClinicianId,
        start_at: fromUTCISO ? `>= ${fromUTCISO}` : 'any',
        end_at: toUTCISO ? `<= ${toUTCISO}` : 'any'
      });
      
      const { data: rawDataAny, error: queryError } = await query;

      // Debugging: Log raw Supabase response structure with more context
      console.log('[useAppointments] Raw Supabase response structure:', {
        hasData: !!rawDataAny,
        recordCount: rawDataAny?.length || 0,
        sampleRecord: rawDataAny?.[0] || null,
        hasClientsField: rawDataAny?.[0] ? 'clients' in rawDataAny[0] : false,
        clientsFieldType: rawDataAny?.[0]?.clients ? typeof rawDataAny[0].clients : "undefined",
        clientFieldKeys: rawDataAny?.[0]?.clients ? Object.keys(rawDataAny[0].clients) : [],
        rawStartAtFormat: rawDataAny?.[0]?.start_at || "N/A",
        clinicianIdUsed: formattedClinicianId
      });

      if (queryError) {
        console.error(
          "[useAppointments] Error fetching appointments:",
          queryError
        );
        throw new Error(queryError.message);
      }

      // Cast the raw data while ensuring proper validation
      if (!rawDataAny) {
        console.warn("[useAppointments] No data returned from Supabase");
        return [];
      }

      console.log(
        `[useAppointments] Fetched ${rawDataAny.length || 0} raw appointments.`
      );

      // Safely process the data with standardized client name formatting
      return rawDataAny.map((rawAppt: any): Appointment => {
        // Process client data, ensure we handle nested objects correctly
        const rawClientData = rawAppt.clients;
        let clientData: Appointment["client"] | undefined;
        let clientName = "Unknown Client";

        if (rawClientData) {
          // Handle both object and array structures (depending on Supabase's response format)
          const clientInfo = Array.isArray(rawClientData)
            ? rawClientData[0]
            : rawClientData;

          if (clientInfo && typeof clientInfo === "object") {
            clientData = {
              client_first_name: clientInfo.client_first_name || "",
              client_last_name: clientInfo.client_last_name || "",
              client_preferred_name: clientInfo.client_preferred_name || "",
            };

            // STANDARDIZED CLIENT NAME FORMATTING:
            // First check if both preferred_name AND last_name exist (AND condition)
            // Only use preferred_name + last_name when both exist, otherwise fall back
            if (
              clientData.client_preferred_name &&
              clientData.client_last_name
            ) {
              clientName = `${clientData.client_preferred_name} ${clientData.client_last_name}`;
            } else if (
              clientData.client_first_name &&
              clientData.client_last_name
            ) {
              clientName = `${clientData.client_first_name} ${clientData.client_last_name}`;
            } else {
              // Handle edge cases
              clientName =
                [
                  clientData.client_preferred_name ||
                    clientData.client_first_name ||
                    "",
                  clientData.client_last_name || "",
                ]
                  .filter(Boolean)
                  .join(" ")
                  .trim() || "Unknown Client";
            }
          }
        }

        return {
          id: rawAppt.id,
          client_id: rawAppt.client_id,
          clinician_id: rawAppt.clinician_id,
          start_at: rawAppt.start_at,
          end_at: rawAppt.end_at,
          type: rawAppt.type,
          status: rawAppt.status,
          appointment_recurring: rawAppt.appointment_recurring,
          recurring_group_id: rawAppt.recurring_group_id,
          video_room_url: rawAppt.video_room_url,
          notes: rawAppt.notes,
          client: clientData,
          clientName: clientName,
        };
      });
    },
    enabled: !!formattedClinicianId,
  });

  // Helper function to add display formatting
  const addDisplayFormattingToAppointment = (
    appointment: Appointment,
    displayTimeZone: string
  ): FormattedAppointment => {
    const safeDisplayZone = TimeZoneService.ensureIANATimeZone(displayTimeZone);
    const result: FormattedAppointment = { ...appointment };

    if (appointment.start_at) {
      try {
        const startDateTime = TimeZoneService.fromUTC(
          appointment.start_at,
          safeDisplayZone
        );
        result.formattedStartTime = TimeZoneService.formatTime(startDateTime);
        result.formattedDate = TimeZoneService.formatDate(
          startDateTime,
          "yyyy-MM-dd"
        );
      } catch (e) {
        console.error("Error formatting start_at", e);
      }
    }

    if (appointment.end_at) {
      try {
        const endDateTime = TimeZoneService.fromUTC(
          appointment.end_at,
          safeDisplayZone
        );
        result.formattedEndTime = TimeZoneService.formatTime(endDateTime);
      } catch (e) {
        console.error("Error formatting end_at", e);
      }
    }

    return result;
  };

  // isAppointmentToday logic
  const isAppointmentToday = (appointment: Appointment): boolean => {
    if (!appointment.start_at) return false;

    try {
      const now = DateTime.now().setZone(safeUserTimeZone);
      const apptDateTime = DateTime.fromISO(appointment.start_at).setZone(
        safeUserTimeZone
      );

      return now.hasSame(apptDateTime, "day");
    } catch (e) {
      console.error("[useAppointments] Error in isAppointmentToday:", e);
      return false;
    }
  };

  // Memoized formatted appointments
  const appointmentsWithDisplayFormatting = useMemo(() => {
    return fetchedAppointments.map((appt) =>
      addDisplayFormattingToAppointment(appt, safeUserTimeZone)
    );
  }, [fetchedAppointments, safeUserTimeZone]);
  

  // Memoized filtered appointments
  const todayAppointments = useMemo(() => {
    return appointmentsWithDisplayFormatting.filter(isAppointmentToday);
  }, [appointmentsWithDisplayFormatting]);

  const upcomingAppointments = useMemo(() => {
    const now = DateTime.now().setZone(safeUserTimeZone);

    return appointmentsWithDisplayFormatting.filter((appt) => {
      if (!appt.start_at) return false;

      try {
        const apptDateTime = DateTime.fromISO(appt.start_at).setZone(
          safeUserTimeZone
        );
        // Upcoming means: not today and in the future
        return apptDateTime > now && !now.hasSame(apptDateTime, "day");
      } catch (e) {
        console.error("[useAppointments] Error filtering upcoming:", e);
        return false;
      }
    });
  }, [appointmentsWithDisplayFormatting, safeUserTimeZone]);

  const pastAppointments = useMemo(() => {
    const now = DateTime.now().setZone(safeUserTimeZone);

    return appointmentsWithDisplayFormatting.filter((appt) => {
      if (!appt.start_at) return false;

      try {
        const apptDateTime = DateTime.fromISO(appt.start_at).setZone(
          safeUserTimeZone
        );
        // Past means: before now
        return apptDateTime < now;
      } catch (e) {
        console.error("[useAppointments] Error filtering past:", e);
        return false;
      }
    });
  }, [appointmentsWithDisplayFormatting, safeUserTimeZone]);

  // Session handling functions
  const startSession = async (appointment: Appointment) => {
    setCurrentAppointment(appointment);
    setIsLoadingSessionClientData(true);

    try {
      // Check if appointment has a video room URL, create one if not
      let videoRoomUrl = appointment.video_room_url;

      if (!videoRoomUrl) {
        const { url, error } = await getOrCreateVideoRoom(appointment.id);

        if (error) {
          console.error("[useAppointments] Error creating video room:", error);
          toast({
            title: "Error creating video session",
            description: error.message || "Could not create video session",
            variant: "destructive",
          });
          setIsLoadingSessionClientData(false);
          return;
        }

        videoRoomUrl = url;
      }

      setCurrentVideoUrl(videoRoomUrl);
      setSessionClientData(appointment.client || null);
      setIsVideoOpen(true);
    } catch (error) {
      console.error("[useAppointments] Error starting session:", error);
      toast({
        title: "Error starting session",
        description: "Could not start the video session",
        variant: "destructive",
      });
    } finally {
      setIsLoadingSessionClientData(false);
    }
  };

  const documentSession = (appointment: Appointment) => {
    setCurrentAppointment(appointment);
    setSessionClientData(appointment.client || null);
    setShowSessionTemplate(true);
  };

  const closeVideoSession = () => setIsVideoOpen(false);
  const closeSessionTemplate = () => setShowSessionTemplate(false);

  return {
    appointments: appointmentsWithDisplayFormatting,
    todayAppointments,
    upcomingAppointments,
    pastAppointments,
    isLoading,
    error,
    refetch: refetchAppointments,
    startVideoSession: startSession,
    openSessionTemplate: documentSession,
    isVideoOpen,
    closeVideoSession,
    closeSessionTemplate,
    currentVideoUrl,
    currentAppointment,
    showSessionTemplate,
    setShowSessionTemplate,
    clientData: sessionClientData,
    isLoadingClientData: isLoadingSessionClientData,
    addDisplayFormattingToAppointment,
  };
};
