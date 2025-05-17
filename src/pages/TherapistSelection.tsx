
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import NewLayout from '@/components/layout/NewLayout';
import { toast } from 'sonner';

// Mock data for therapists
const mockTherapists = [
  {
    id: '1',
    clinician_first_name: 'Emma',
    clinician_last_name: 'Johnson',
    clinician_type: 'Licensed Clinical Psychologist', // Updated from clinician_title to clinician_type
    clinician_bio: 'Dr. Johnson specializes in cognitive behavioral therapy with 10+ years of experience working with adults dealing with anxiety and depression.',
    clinician_avatar: 'https://randomuser.me/api/portraits/women/44.jpg'
  },
  {
    id: '2',
    clinician_first_name: 'Michael',
    clinician_last_name: 'Chen',
    clinician_type: 'Licensed Marriage and Family Therapist', // Updated from clinician_title to clinician_type
    clinician_bio: 'Michael has extensive experience in family dynamics and couples therapy, focusing on communication strategies and relationship building.',
    clinician_avatar: 'https://randomuser.me/api/portraits/men/32.jpg'
  },
  {
    id: '3',
    clinician_first_name: 'Sarah',
    clinician_last_name: 'Williams',
    clinician_type: 'Clinical Social Worker', // Updated from clinician_title to clinician_type
    clinician_bio: 'Sarah specializes in trauma-informed care and has worked extensively with individuals recovering from PTSD and childhood trauma.',
    clinician_avatar: 'https://randomuser.me/api/portraits/women/68.jpg'
  }
];

const TherapistSelection = () => {
  const navigate = useNavigate();
  const [selectedTherapist, setSelectedTherapist] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSelectTherapist = (therapistId: string) => {
    setSelectedTherapist(therapistId);
  };

  const handleSubmit = () => {
    if (!selectedTherapist) {
      toast.error("Please select a therapist to continue");
      return;
    }
    
    setIsSubmitting(true);
    
    // Simulate submission process
    setTimeout(() => {
      toast.success("Therapist selection successful", {
        description: "You have been matched with your therapist!"
      });
      setIsSubmitting(false);
      navigate('/patient-dashboard');
    }, 1000);
  };

  return (
    <NewLayout>
      <div className="container mx-auto max-w-4xl">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Select Your Therapist</h1>
          <p className="text-gray-600">
            Choose a therapist who you feel would be the best fit for your needs.
          </p>
        </div>
        
        <div className="space-y-6">
          {mockTherapists.map((therapist) => (
            <Card 
              key={therapist.id}
              className={`cursor-pointer transition-all ${
                selectedTherapist === therapist.id 
                  ? 'ring-2 ring-blue-500 bg-blue-50' 
                  : 'hover:bg-gray-50'
              }`}
              onClick={() => handleSelectTherapist(therapist.id)}
            >
              <CardContent className="p-6">
                <div className="flex items-center gap-6">
                  <div className="flex-shrink-0">
                    <img 
                      src={therapist.clinician_avatar} 
                      alt={`${therapist.clinician_first_name} ${therapist.clinician_last_name}`}
                      className="w-24 h-24 rounded-full object-cover"
                    />
                  </div>
                  <div className="flex-grow">
                    <h3 className="text-xl font-semibold">
                      Dr. {therapist.clinician_first_name} {therapist.clinician_last_name}
                    </h3>
                    <p className="text-gray-600 mb-2">{therapist.clinician_type}</p>
                    <p className="text-sm">{therapist.clinician_bio}</p>
                  </div>
                  <div className="flex-shrink-0">
                    <div className={`w-6 h-6 rounded-full border-2 ${
                      selectedTherapist === therapist.id 
                        ? 'border-blue-500 bg-blue-500' 
                        : 'border-gray-300'
                    }`}>
                      {selectedTherapist === therapist.id && (
                        <svg 
                          xmlns="http://www.w3.org/2000/svg" 
                          className="h-5 w-5 text-white" 
                          viewBox="0 0 20 20" 
                          fill="currentColor"
                        >
                          <path 
                            fillRule="evenodd" 
                            d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" 
                            clipRule="evenodd" 
                          />
                        </svg>
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
        
        <div className="mt-8 flex justify-end space-x-4">
          <Button 
            variant="outline" 
            onClick={() => navigate('/patient-dashboard')}
          >
            Cancel
          </Button>
          <Button 
            onClick={handleSubmit}
            disabled={!selectedTherapist || isSubmitting}
          >
            {isSubmitting ? "Confirming..." : "Confirm Selection"}
          </Button>
        </div>
      </div>
    </NewLayout>
  );
};

export default TherapistSelection;
