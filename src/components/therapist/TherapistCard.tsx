
import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { User, Calendar } from 'lucide-react';
import { Button } from '@/components/ui/button';
import AppointmentBookingDialog from '@/components/patient/AppointmentBookingDialog';

export interface TherapistCardProps {
  id: string;
  name: string;
  bio: string | null;
  imageUrl: string | null;
  isSelected: boolean;
  onSelect: (id: string) => void;
}

const TherapistCard = ({
  id,
  name,
  bio,
  imageUrl,
  isSelected,
  onSelect,
}: TherapistCardProps) => {
  const [showAvailability, setShowAvailability] = useState(false);

  return (
    <>
      <Card 
        onClick={() => onSelect(id)}
        className={`cursor-pointer transition-all mb-6 w-full ${isSelected 
          ? 'ring-2 ring-blue-500 bg-blue-50' 
          : 'hover:bg-gray-50'}`}
      >
        <CardContent className="p-6 flex flex-col">
          <div className="flex items-center mb-6">
            {imageUrl ? (
              <div className="w-20 h-20 rounded-full overflow-hidden flex-shrink-0 border border-gray-200">
                <img 
                  src={imageUrl} 
                  alt={`${name}'s profile`} 
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = 'https://via.placeholder.com/150?text=No+Image';
                  }}
                />
              </div>
            ) : (
              <div className="w-20 h-20 rounded-full bg-gray-200 flex items-center justify-center flex-shrink-0">
                <User className="w-10 h-10 text-gray-500" />
              </div>
            )}
            <h3 className="text-2xl font-semibold ml-5">{name || 'Unnamed Therapist'}</h3>
          </div>

          <div className="text-gray-700 mb-4">
            {bio ? (
              <div className="prose max-w-none">
                {bio}
              </div>
            ) : (
              <p className="text-gray-400 italic">No bio available</p>
            )}
          </div>

          <div className="flex items-center justify-between mt-4">
            {isSelected && (
              <div className="flex items-center text-blue-600">
                <span className="font-medium">✓ Selected</span>
              </div>
            )}
            <Button 
              onClick={(e) => {
                e.stopPropagation(); // Prevent card selection when clicking this button
                setShowAvailability(true);
              }}
              variant="outline" 
              size="sm"
              className="ml-auto flex items-center gap-2"
            >
              <Calendar className="h-4 w-4" />
              View Availability
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Availability Dialog (View Only Mode) */}
      <AppointmentBookingDialog
        open={showAvailability}
        onOpenChange={setShowAvailability}
        clinicianId={id}
        clinicianName={name}
        viewOnly={true} // This will be a new prop to AppointmentBookingDialog
      />
    </>
  );
};

export default TherapistCard;
