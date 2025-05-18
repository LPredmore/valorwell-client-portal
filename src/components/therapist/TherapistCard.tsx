
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
      className={`cursor-pointer transition-all mb-6 h-full ${isSelected 
        ? 'ring-2 ring-blue-500 bg-blue-50' 
        : 'hover:bg-gray-50'}`}
    >
      <CardContent className="p-6 flex flex-col h-full">
        <div className="flex items-center mb-4">
          {imageUrl ? (
            <div className="w-16 h-16 rounded-full overflow-hidden flex-shrink-0 border border-gray-200">
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
            <div className="w-16 h-16 rounded-full bg-gray-200 flex items-center justify-center flex-shrink-0">
              <User className="w-8 h-8 text-gray-500" />
            </div>
          )}
          <h3 className="text-xl font-semibold ml-4">{name || 'Unnamed Therapist'}</h3>
        </div>

        <div className="text-gray-600 flex-grow">
          {bio ? (
            <>
              {bio.length > 200 ? (
                <div>
                  {bio.substring(0, 200)}...
                  <p className="text-sm text-blue-600 mt-2">Click to select and see full bio</p>
                </div>
              ) : bio}
            </>
          ) : (
            <p className="text-gray-400 italic">No bio available</p>
          )}
        </div>

        {isSelected && (
          <div className="mt-4 flex items-center text-blue-600">
            <span className="text-sm font-medium">✓ Selected</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default TherapistCard;
