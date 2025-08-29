
import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { User, Mail, Loader } from 'lucide-react';

export interface TherapistCardProps {
  id: string;
  name: string;
  bio: string | null;
  imageUrl: string | null;
  email: string;
  onSelectTherapist: (id: string) => Promise<void>;
  isSubmitting?: boolean;
}

const TherapistCard = ({
  id,
  name,
  bio,
  imageUrl,
  email,
  onSelectTherapist,
  isSubmitting = false,
}: TherapistCardProps) => {
  return (
    <Card className="transition-all mb-6 w-full hover:bg-gray-50"
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
          <div className="flex items-center gap-2 text-gray-600 bg-gray-50 px-3 py-2 rounded">
            <Mail className="h-4 w-4" />
            <span className="text-sm">Email for Availability: {email}</span>
          </div>
          <Button 
            onClick={() => onSelectTherapist(id)}
            disabled={isSubmitting}
            className="ml-4"
          >
            {isSubmitting ? (
              <>
                <Loader className="h-4 w-4 animate-spin mr-2" />
                Selecting...
              </>
            ) : "Select This Therapist"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default TherapistCard;
