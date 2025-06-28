import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { format, addDays, isSameDay, parseISO } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { getUserTimeZone } from '@/utils/timeZoneUtils';
import { TimeZoneService } from '@/utils/timeZoneService';
import { DateTime } from 'luxon';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/NewAuthContext';

import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription,
  DialogFooter
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';

// Types for appointment slots
interface AppointmentSlot {
  time: string;
  formattedTime: string;
  available: boolean;
  timezone: string;
}

interface AvailabilitySettings {
  time_granularity: 'hour' | 'half_hour';
  min_days_ahead: number;
  max_days_ahead: number;
}

// Define interface for clinician availability data
interface ClinicianAvailabilityData {
  [key: string]: string | null;
  clinician_time_granularity?: 'hour' | 'half_hour';
}

// Define interface for availability block
interface AvailabilityBlock {
  day_of_week: number;
  start_time: string;
  end_time: string;
  is_active: boolean;
}

// Helper function to convert UTC timestamp to local timezone
const formatDateTime = (timestamp: string, timezone: string): string => {
  return DateTime.fromISO(timestamp, { zone: 'UTC' })
    .setZone(timezone)
    .toFormat('yyyy-MM-dd HH:mm:ss ZZZZ');
};

// Check if date is in the past
const isPastDate = (date: Date): boolean => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return date < today;
};

export interface AppointmentBookingDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  clinicianId: string | null;
  clinicianName?: string | null;
  clientId?: string | null; 
  onAppointmentBooked?: () => void;
  userTimeZone?: string;
  viewOnly?: boolean; // New prop to indicate view-only mode
}

export const AppointmentBookingDialog: React.FC<AppointmentBookingDialogProps> = ({
  open, 
  onOpenChange,
  clinicianId,
  clinicianName,
  clientId,
  onAppointmentBooked,
  userTimeZone,
  viewOnly = false // Default to false for backward compatibility
}) => {
  // Tomorrow as default
  const tomorrow = useMemo(() => addDays(new Date(), 1), []);
  
  // States
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(tomorrow);
  const [timeSlots, setTimeSlots] = useState<AppointmentSlot[]>([]);
  const [selectedTimeSlot, setSelectedTimeSlot] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isBooking, setIsBooking] = useState(false);
  const [availabilityBlocks, setAvailabilityBlocks] = useState<AvailabilityBlock[]>([]);
  const [existingAppointments, setExistingAppointments] = useState<any[]>([]);
  const [availabilitySettings, setAvailabilitySettings] = useState<AvailabilitySettings>({
    time_granularity: 'hour',
    min_days_ahead: 1,
    max_days_ahead: 30
  });
  const [apiErrors, setApiErrors] = useState<{
    availabilitySettings?: string;
    availabilityBlocks?: string;
    appointments?: string;
    auth?: string;
  }>({});
  const { toast } = useToast();
  const navigate = useNavigate();
  
  // Get auth state from AuthContext
  const { userId, isLoading: userIsLoading, authInitialized } = useAuth();
  const [authError, setAuthError] = useState<string | null>(null);
  const [loadingTimeout, setLoadingTimeout] = useState(false);
  
  // Get user's timezone
  const clientTimeZone = useMemo(() => {
    return TimeZoneService.ensureIANATimeZone(
      userTimeZone || getUserTimeZone() || TimeZoneService.DEFAULT_TIMEZONE
    );
  }, [userTimeZone]);

  // Calculate days difference between selected date and today
  const daysDiff = useMemo(() => {
    if (!selectedDate || !clientTimeZone) {
      console.log('[BookingDialog] daysDiff calculation: selectedDate or userTimeZone not available, returning 0.');
      return 0;
    }

    const todayAtStartOfDay = DateTime.now().setZone(clientTimeZone).startOf('day');
    const selectedDateAtStartOfDay = DateTime.fromJSDate(selectedDate).setZone(clientTimeZone).startOf('day');
    
    const diff = selectedDateAtStartOfDay.diff(todayAtStartOfDay, 'days').days;
    console.log(`[BookingDialog] Calculated daysDiff: ${diff} (Selected: ${selectedDateAtStartOfDay.toISODate()}, Today: ${todayAtStartOfDay.toISODate()})`);
    return diff;
  }, [selectedDate, clientTimeZone]);

  // Fetch availability settings from Supabase Edge Function, memoized to prevent recreation
  const fetchAvailabilitySettings = useCallback(async () => {
    if (!clinicianId) return;
    
    try {
      console.log('Fetching availability settings for clinician:', clinicianId);
      const { data, error } = await supabase.functions.invoke('getavailabilitysettings', {
        body: { clinicianId }
      });
      
      if (error) {
        console.error('Error fetching availability settings:', error);
        setApiErrors(prev => ({ ...prev, availabilitySettings: error.message }));
        return;
      }
      
      console.log('Received availability settings:', data);
      setAvailabilitySettings({
        time_granularity: data.time_granularity || 'hour',
        min_days_ahead: data.min_days_ahead || 1,
        max_days_ahead: data.max_days_ahead || 30
      });
      
    } catch (error) {
      console.error('Error in fetchAvailabilitySettings:', error);
      setApiErrors(prev => ({ ...prev, availabilitySettings: 'Failed to fetch availability settings' }));
    }
  }, [clinicianId]);
  
  // Fetch clinician's availability blocks from the clinicians table
  const fetchAvailabilityBlocks = useCallback(async () => {
    if (!clinicianId || !selectedDate) return;
    
    try {
      setIsLoading(true);
      
      // Get day of week from selected date (0 = Sunday, 1 = Monday, etc.)
      const dayOfWeek = selectedDate.getDay();
      const dayName = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'][dayOfWeek];
      
      console.log(`[BookingDialog] Fetching availability for clinician ${clinicianId} on ${dayName} (day ${dayOfWeek})`);
      
      // Fetch clinician record to get availability data
      // Using explicit select columns instead of template string for type safety
      const { data, error } = await supabase
        .from('clinicians')
        .select('*')
        .eq('id', clinicianId)
        .single();
      
      if (error) {
        console.error(`[BookingDialog] Error fetching clinician availability:`, error);
        setApiErrors(prev => ({ ...prev, availabilityBlocks: error.message }));
        setAvailabilityBlocks([]);
        return;
      }
      
      // Convert the raw data to our expected format
      const clinicianData = data as ClinicianAvailabilityData;
      
      console.log(`[BookingDialog] Retrieved clinician availability data:`, clinicianData);
      
      // Transform the clinician data into availability blocks format
      const blocks: AvailabilityBlock[] = [];
      
      // Check each availability slot and add if it exists
      for (let i = 1; i <= 3; i++) {
        const startTimeKey = `clinician_availability_start_${dayName}_${i}`;
        const endTimeKey = `clinician_availability_end_${dayName}_${i}`;
        
        const startTime = clinicianData[startTimeKey];
        const endTime = clinicianData[endTimeKey];
        
        if (startTime && endTime) {
          blocks.push({
            day_of_week: dayOfWeek,
            start_time: startTime,
            end_time: endTime,
            is_active: true
          });
        }
      }
      
      console.log(`[BookingDialog] Transformed availability blocks:`, blocks);
      
      // Update time granularity if specified by clinician
      if (clinicianData.clinician_time_granularity) {
        setAvailabilitySettings(prev => ({
          ...prev,
          time_granularity: clinicianData.clinician_time_granularity as 'hour' | 'half_hour'
        }));
      }
      
      setAvailabilityBlocks(blocks);
      
    } catch (error) {
      console.error('[BookingDialog] Error in fetchAvailabilityBlocks:', error);
      setApiErrors(prev => ({ ...prev, availabilityBlocks: 'Failed to fetch availability blocks' }));
      setAvailabilityBlocks([]);
    } finally {
      setIsLoading(false);
    }
  }, [clinicianId, selectedDate]);

  // Fetch existing appointments for the selected date, memoized to prevent recreation
  const fetchExistingAppointments = useCallback(async () => {
    if (!clinicianId || !selectedDate || !(clientId || userId)) return;
    
    const effectiveUserId = clientId || userId;
    
    try {
      console.log('Fetching appointments for client:', effectiveUserId);
      console.log('Using time zone:', clientTimeZone);
      
      // Format date for querying
      const dateStr = format(selectedDate, 'yyyy-MM-dd');
      const nextDateStr = format(addDays(selectedDate, 1), 'yyyy-MM-dd');
      
      // Get UTC timestamps for start and end of selected date
      const startUtc = DateTime.fromISO(`${dateStr}T00:00:00`, { zone: clientTimeZone }).toUTC().toISO();
      const endUtc = DateTime.fromISO(`${nextDateStr}T00:00:00`, { zone: clientTimeZone }).toUTC().toISO();
      
      const { data, error } = await supabase
        .from('appointments')
        .select('*')
        .eq('clinician_id', clinicianId)
        .gte('start_at', startUtc)
        .lt('start_at', endUtc);
      
      if (error) {
        setApiErrors(prev => ({ ...prev, appointments: error.message }));
        return;
      }
      
      console.log('Appointments data from Supabase:', data);
      
      // Format appointments to include local time
      const formattedAppointments = data?.map(appointment => ({
        ...appointment,
        localStart: formatDateTime(appointment.start_at, clientTimeZone),
        localEnd: formatDateTime(appointment.end_at, clientTimeZone)
      }));
      
      console.log('Formatted appointments:', formattedAppointments);
      setExistingAppointments(formattedAppointments || []);
      
    } catch (error) {
      console.error('Error fetching appointments:', error);
      setApiErrors(prev => ({ ...prev, appointments: 'Failed to fetch appointments' }));
    }
  }, [clinicianId, selectedDate, userId, clientId, clientTimeZone]);

  // Generate time slots based on availability and existing appointments
  const generateTimeSlots = useCallback(() => {
    if (!selectedDate || !availabilityBlocks) return;
    
    console.log('[BookingDialog] Generating slots for date:', format(selectedDate, 'yyyy-MM-dd'));
    console.log('[BookingDialog] Days from today:', daysDiff, 'minDaysAhead:', availabilitySettings.min_days_ahead);
    
    if (daysDiff < availabilitySettings.min_days_ahead) {
      console.log('[BookingDialog] Selected date is too soon, should be blocked');
      setTimeSlots([]);
      return;
    }
    
    // Logic to generate time slots based on availability blocks
    const dayOfWeek = selectedDate.getDay(); // 0 for Sunday, 1 for Monday, etc.
    const availableBlocks = availabilityBlocks.filter(block => 
      block.day_of_week === dayOfWeek
    );
    
    if (availableBlocks.length === 0) {
      setTimeSlots([]);
      return;
    }
    
    const slots: AppointmentSlot[] = [];
    const interval = availabilitySettings.time_granularity === 'hour' ? 60 : 30;
    
    // Process each availability block
    availableBlocks.forEach(block => {
      try {
        // Convert start and end times to minutes
        const startParts = block.start_time.split(':').map(Number);
        const endParts = block.end_time.split(':').map(Number);
        
        const startMinutes = startParts[0] * 60 + startParts[1];
        const endMinutes = endParts[0] * 60 + endParts[1];
        
        // Generate slots at intervals
        for (let time = startMinutes; time < endMinutes; time += interval) {
          const hour = Math.floor(time / 60);
          const minute = time % 60;
          const timeStr = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
          
          // Check if slot overlaps with existing appointments
          const isSlotBooked = existingAppointments.some(appointment => {
            const appointmentStart = DateTime.fromISO(appointment.start_at).setZone(clientTimeZone);
            const appointmentHour = appointmentStart.hour;
            const appointmentMinute = appointmentStart.minute;
            
            return (
              isSameDay(selectedDate, parseISO(appointment.start_at)) &&
              hour === appointmentHour &&
              minute === appointmentMinute
            );
          });
          
          // Add slot if not already booked
          if (!isSlotBooked) {
            slots.push({
              time: timeStr,
              formattedTime: DateTime.fromObject({ 
                hour, 
                minute 
              }, { 
                zone: clientTimeZone 
              }).toFormat('h:mm a'),
              available: true,
              timezone: clientTimeZone
            });
          }
        }
      } catch (error) {
        console.error('Error processing availability block:', error, block);
      }
    });
    
    setTimeSlots(slots);
  }, [selectedDate, availabilityBlocks, existingAppointments, availabilitySettings, clientTimeZone, daysDiff]);

  // Fetch settings once when dialog opens
  useEffect(() => {
    if (open && clinicianId && !userIsLoading) {
      fetchAvailabilitySettings();
    }
  }, [open, clinicianId, fetchAvailabilitySettings, userIsLoading]);

  // Fetch availability blocks when date changes
  useEffect(() => {
    if (open && selectedDate && clinicianId && !userIsLoading && authInitialized) {
      console.log("[BookingDialog] Auth initialized and not loading, fetching availability blocks");
      fetchAvailabilityBlocks();
    }
  }, [open, selectedDate, clinicianId, fetchAvailabilityBlocks, userIsLoading, authInitialized]);

  // Fetch existing appointments when date changes
  useEffect(() => {
    if (open && selectedDate && clinicianId && (clientId || userId) && !userIsLoading && authInitialized) {
      console.log("[BookingDialog] Auth initialized and not loading, fetching existing appointments");
      fetchExistingAppointments();
    }
  }, [open, selectedDate, clinicianId, userId, clientId, fetchExistingAppointments, userIsLoading, authInitialized]);

  // Generate time slots when dependencies change
  useEffect(() => {
    if (open && selectedDate && !userIsLoading && authInitialized) {
      console.log("[BookingDialog] Auth initialized and not loading, generating time slots");
      generateTimeSlots();
    }
  }, [open, selectedDate, availabilityBlocks, existingAppointments, generateTimeSlots, userIsLoading, authInitialized]);

  // Reset state when dialog closes
  useEffect(() => {
    if (!open) {
      setSelectedTimeSlot(null);
      setApiErrors({});
    }
  }, [open]);

  // Handle booking appointment
  const handleBookAppointment = async () => {
    if (!selectedDate || !selectedTimeSlot || !clinicianId || !(clientId || userId)) {
      toast({
        title: "Missing Information",
        description: "Please select a date and time for your appointment.",
        variant: "destructive"
      });
      return;
    }
    
    // Use clientId if provided, otherwise fall back to userId from context
    const effectiveUserId = clientId || userId;
    
    setIsBooking(true);
    
    try {
      // Format selected date and time for database
      const [hour, minute] = selectedTimeSlot.split(':').map(Number);
      
      // Create DateTime object in user's local timezone
      const appointmentDateTime = DateTime.fromObject(
        {
          year: selectedDate.getFullYear(),
          month: selectedDate.getMonth() + 1,
          day: selectedDate.getDate(),
          hour,
          minute
        },
        { zone: clientTimeZone }
      );
      
      // Convert to UTC - Change duration to 60 minutes
      const utcStart = appointmentDateTime.toUTC().toISO();
      const utcEnd = appointmentDateTime.plus({ minutes: 60 }).toUTC().toISO();
      
      if (!utcStart || !utcEnd) {
        throw new Error('Invalid date or time selected');
      }
      
      // Insert appointment into database
      const { data, error } = await supabase
        .from('appointments')
        .insert([
          {
            client_id: effectiveUserId,
            clinician_id: clinicianId,
            start_at: utcStart,
            end_at: utcEnd,
            status: 'scheduled',
            type: 'Therapy Session'
          }
        ])
        .select();
      
      if (error) throw error;
      
      toast({
        title: "Appointment Scheduled",
        description: "Your appointment has been successfully scheduled.",
      });
      
      // Call onAppointmentBooked callback if provided
      if (onAppointmentBooked) {
        onAppointmentBooked();
      }
      
      // Close dialog
      onOpenChange(false);
      
    } catch (error) {
      console.error('Error booking appointment:', error);
      toast({
        title: "Booking Failed",
        description: "There was an error booking your appointment. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsBooking(false);
    }
  };
  
  // Convenience function to handle dialog close
  const handleClose = () => {
    onOpenChange(false);
  };
  
  // Check if a date should be disabled in the calendar
  const disabledDays = useCallback((date: Date) => {
    // Disable past dates
    if (isPastDate(date)) {
      return true;
    }
    
    // Disable dates before min_days_ahead
    const today = new Date();
    const daysDiff = Math.floor((date.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    if (daysDiff < availabilitySettings.min_days_ahead) {
      return true;
    }
    
    // Disable dates after max_days_ahead
    if (daysDiff > availabilitySettings.max_days_ahead) {
      return true;
    }
    
    return false;
  }, [availabilitySettings]);

  // Update dialog title based on view mode
  const dialogTitle = viewOnly 
    ? `${clinicianName}'s Availability` 
    : "Book an Appointment";

  // Update dialog description based on view mode
  const dialogDescription = viewOnly
    ? "View the therapist's available appointment slots."
    : "Select a date and time for your appointment.";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{dialogTitle}</DialogTitle>
          <DialogDescription>
            {dialogDescription}
          </DialogDescription>
        </DialogHeader>
        
        {/* Minimum days notice alert - only show in booking mode */}
        {!viewOnly && (
          <Alert className="mb-4">
            <AlertTitle>Booking Notice Required</AlertTitle>
            <AlertDescription>
              Please note that appointments must be booked at least {availabilitySettings.min_days_ahead} day{availabilitySettings.min_days_ahead > 1 ? 's' : ''} in advance.
            </AlertDescription>
          </Alert>
        )}
        
        <div className="grid gap-6 md:grid-cols-2">
          {/* Calendar column */}
          <div>
            <h3 className="text-lg font-medium mb-2">Select a Date</h3>
            <div className="border rounded-md p-2">
              <Calendar
                mode="single"
                selected={selectedDate}
                onSelect={(date) => {
                  setSelectedDate(date);
                  setSelectedTimeSlot(null);
                }}
                disabled={disabledDays}
                className="p-3 pointer-events-auto"
              />
            </div>
          </div>
          
          {/* Time slots column */}
          <div>
            <h3 className="text-lg font-medium mb-2">Available Times</h3>
            
            {/* Show loading spinner when loading */}
            {/* Show auth error if present */}
            {authError && (
              <div className="flex flex-col justify-center items-center h-40 p-4 bg-red-50 border border-red-200 rounded-md">
                <div className="text-red-500 mb-2">
                  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="10"></circle>
                    <line x1="12" y1="8" x2="12" y2="12"></line>
                    <line x1="12" y1="16" x2="12.01" y2="16"></line>
                  </svg>
                </div>
                <p className="text-red-600 text-center">{authError}</p>
                <button
                  onClick={handleClose}
                  className="mt-4 px-3 py-1 bg-red-600 text-white text-sm rounded-md"
                >
                  Close
                </button>
              </div>
            )}
            
            {/* Show loading spinner when loading */}
            {isLoading && !authError && (
              <div className="flex flex-col justify-center items-center h-40">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mb-2"></div>
                <p className="text-sm text-gray-600">
                  {userIsLoading || !authInitialized
                    ? "Initializing authentication..."
                    : "Loading available times..."}
                </p>
                {loadingTimeout && (
                  <p className="text-xs text-amber-600 mt-2">
                    This is taking longer than expected...
                  </p>
                )}
              </div>
            )}
            
            {/* Show message when no time slots available */}
            {!isLoading && timeSlots.length === 0 && (
              <div className="border rounded-md p-4 h-40 flex flex-col justify-center items-center text-center">
                {selectedDate && daysDiff < availabilitySettings.min_days_ahead ? (
                  <p>
                    Please select a date at least {availabilitySettings.min_days_ahead} day{availabilitySettings.min_days_ahead > 1 ? 's' : ''} in advance.
                  </p>
                ) : (
                  <p>
                    No available time slots for the selected date.
                    <br />
                    Please select another date.
                  </p>
                )}
              </div>
            )}
            
            {/* Display time slots */}
            {!isLoading && timeSlots.length > 0 && (
              <div className="grid grid-cols-2 gap-2 max-h-[300px] overflow-y-auto p-2 border rounded-md">
                {timeSlots.map((slot) => (
                  <Button
                    key={slot.time}
                    variant="outline"
                    className={`justify-center ${viewOnly ? 'cursor-default' : ''}`}
                    // In view-only mode, clicking time slots doesn't do anything
                    onClick={viewOnly ? undefined : () => setSelectedTimeSlot(slot.time)}
                  >
                    {slot.formattedTime}
                  </Button>
                ))}
              </div>
            )}
          </div>
        </div>
        
        {/* Selected appointment summary - only show in booking mode */}
        {!viewOnly && selectedDate && selectedTimeSlot && (
          <div className="mt-4 p-4 border rounded-md bg-muted/50">
            <h3 className="font-medium mb-2">Appointment Summary</h3>
            <p>
              <strong>Date:</strong> {format(selectedDate, 'EEEE, MMMM d, yyyy')}
            </p>
            <p>
              <strong>Time:</strong> {
                DateTime.fromObject(
                  { 
                    hour: parseInt(selectedTimeSlot.split(':')[0]), 
                    minute: parseInt(selectedTimeSlot.split(':')[1]) 
                  }, 
                  { zone: clientTimeZone }
                ).toFormat('h:mm a')
              }
            </p>
            <p>
              <strong>Duration:</strong> 60 minutes
            </p>
          </div>
        )}
        
        {/* Error messages */}
        {Object.values(apiErrors).some(error => !!error) && (
          <Alert variant="destructive" className="mt-4">
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>
              <ul className="list-disc pl-4">
                {Object.entries(apiErrors).map(([key, error]) => 
                  error ? <li key={key}>{error}</li> : null
                )}
              </ul>
            </AlertDescription>
          </Alert>
        )}
        
        <DialogFooter className="mt-6">
          <Button variant="outline" onClick={handleClose}>
            {viewOnly ? "Close" : "Cancel"}
          </Button>
          
          {/* Only show Book button in booking mode */}
          {!viewOnly && (
            <Button 
              onClick={handleBookAppointment} 
              disabled={!selectedDate || !selectedTimeSlot || isBooking}
            >
              {isBooking ? 'Booking...' : 'Book Appointment'}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default AppointmentBookingDialog;
