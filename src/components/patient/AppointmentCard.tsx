import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Calendar, Clock, Video, X } from 'lucide-react';
import { formatInClientTimezone, getSafeTimezone } from '@/utils/dateFormatting';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

interface AppointmentCardProps {
  appointment: {
    id: string;
    start_at: string;
    end_at: string;
    type: string;
    status: string;
    video_room_url?: string;
  };
  clientTimezone?: string;
  isToday?: boolean;
  onStartSession: (appointmentId: string) => void;
  isSessionLoading?: boolean;
  showCancelButton?: boolean;
  onCancelAppointment?: (appointmentId: string) => void;
  isCancelLoading?: boolean;
}

const AppointmentCard: React.FC<AppointmentCardProps> = ({
  appointment,
  clientTimezone,
  isToday = false,
  onStartSession,
  isSessionLoading = false,
  showCancelButton = false,
  onCancelAppointment,
  isCancelLoading = false
}) => {
  const safeTimezone = getSafeTimezone(clientTimezone);
  
  const formatTime = (timestamp: string) => {
    return formatInClientTimezone(timestamp, safeTimezone, 'h:mm a');
  };

  const formatDate = (timestamp: string) => {
    return formatInClientTimezone(timestamp, safeTimezone, 'MMM d, yyyy');
  };

  const getStatusBadgeVariant = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'scheduled':
        return 'default';
      case 'completed':
        return 'secondary';
      case 'cancelled':
        return 'destructive';
      default:
        return 'outline';
    }
  };

  const getTypeDisplay = (type: string) => {
    return type?.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()) || 'Appointment';
  };

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">
                {isToday ? 'Today' : formatDate(appointment.start_at)}
              </span>
              <Badge variant={getStatusBadgeVariant(appointment.status)}>
                {appointment.status}
              </Badge>
            </div>
            
            <div className="flex items-center gap-2 mb-2">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">
                {formatTime(appointment.start_at)} - {formatTime(appointment.end_at)}
              </span>
            </div>
            
            <div className="text-sm text-muted-foreground">
              {getTypeDisplay(appointment.type)}
            </div>
          </div>

          <div className="ml-4 flex items-center gap-2">
            {isToday && appointment.status?.toLowerCase() === 'scheduled' && (
              <Button
                onClick={() => onStartSession(appointment.id)}
                disabled={isSessionLoading}
                className="flex items-center gap-2"
              >
                <Video className="h-4 w-4" />
                {isSessionLoading ? 'Starting...' : 'Start Session'}
              </Button>
            )}
            
            {showCancelButton && appointment.status?.toLowerCase() === 'scheduled' && onCancelAppointment && (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={isCancelLoading}
                    className="flex items-center gap-2"
                  >
                    <X className="h-4 w-4" />
                    {isCancelLoading ? 'Cancelling...' : 'Cancel'}
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Cancel Appointment</AlertDialogTitle>
                    <AlertDialogDescription>
                      Are you sure you want to cancel this appointment? This action cannot be undone.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>No, keep appointment</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={() => onCancelAppointment(appointment.id)}
                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    >
                      Yes, cancel appointment
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default AppointmentCard;