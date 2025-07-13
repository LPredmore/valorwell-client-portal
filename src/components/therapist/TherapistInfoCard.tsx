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

        <div className="flex items-center mt-4">
          <div className="flex items-center gap-2 text-gray-600 bg-gray-50 px-3 py-2 rounded">
            <Mail className="h-4 w-4" />
            <span className="text-sm">Email for Availability: {email}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default TherapistInfoCard;