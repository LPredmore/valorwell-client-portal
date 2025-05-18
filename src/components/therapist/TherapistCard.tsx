
import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { User } from 'lucide-react';

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
  return (
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

        {isSelected && (
          <div className="mt-4 flex items-center text-blue-600">
            <span className="font-medium">✓ Selected</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default TherapistCard;
