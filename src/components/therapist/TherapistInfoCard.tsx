import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { User, Mail } from 'lucide-react';

export interface TherapistInfoCardProps {
  name: string;
  bio: string | null;
  imageUrl: string | null;
  email: string;
}

const TherapistInfoCard = ({
  name,
  bio,
  imageUrl,
  email,
}: TherapistInfoCardProps) => {
  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Your Assigned Therapist</CardTitle>
      </CardHeader>
      <CardContent className="p-4 sm:p-6 flex flex-col">
        <div className="flex flex-col sm:flex-row items-center sm:items-start mb-4 sm:mb-6 text-center sm:text-left">
          {imageUrl ? (
            <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-full overflow-hidden flex-shrink-0 border border-gray-200 mb-3 sm:mb-0">
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
            <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-full bg-gray-200 flex items-center justify-center flex-shrink-0 mb-3 sm:mb-0">
              <User className="w-10 h-10 sm:w-12 sm:h-12 text-gray-500" />
            </div>
          )}
          <h3 className="text-xl sm:text-2xl font-semibold sm:ml-5">{name || 'Unnamed Therapist'}</h3>
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

        <div className="flex flex-col sm:flex-row items-start mt-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 text-gray-600 bg-gray-50 px-3 py-3 sm:py-2 rounded w-full sm:w-auto">
            <Mail className="h-4 w-4 flex-shrink-0" />
            <span className="text-sm break-all">Email for Availability: {email}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default TherapistInfoCard;