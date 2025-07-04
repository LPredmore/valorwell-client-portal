
import React from 'react';
import { Button } from '@/components/ui/button';
import { Clock, Plus } from 'lucide-react';

interface CalendarViewControlsProps {
  showAvailability: boolean;
  onToggleAvailability: () => void;
  onNewAppointment: () => void;
  selectedClinicianId?: string | null;
}

const CalendarViewControls: React.FC<CalendarViewControlsProps> = ({
  showAvailability,
  onToggleAvailability,
  onNewAppointment,
  selectedClinicianId
}) => {
  return (
    <div className="flex items-center gap-4">
      <Button
        variant={showAvailability ? "default" : "outline"}
        onClick={onToggleAvailability}
      >
        <Clock className="mr-2 h-4 w-4" />
        Availability
      </Button>

      <Button onClick={onNewAppointment}>
        <Plus className="h-4 w-4 mr-2" />
        New Appointment
      </Button>
    </div>
  );
};

export default CalendarViewControls;
