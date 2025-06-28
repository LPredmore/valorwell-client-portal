
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import NewLayout from '@/components/layout/NewLayout';
import { useAuth } from '@/context/NewAuthContext';
import { Loader, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';
import { useSimpleTherapistSelection } from '@/hooks/useSimpleTherapistSelection';
import TherapistCard from '@/components/therapist/TherapistCard';

const TherapistSelection = () => {
  const navigate = useNavigate();
  
  // Get client data from auth context
  const { clientProfile, isLoading: authLoading, refreshUserData } = useAuth();
  const clientState = clientProfile?.client_state || null;
  const clientDateOfBirth = clientProfile?.client_date_of_birth || null;

  // Use the enhanced therapist selection hook with age filtering
  const { 
    therapists, 
    loading, 
    error, 
    selectedTherapistId,
    setSelectedTherapistId, 
    selectTherapist,
    isSubmitting
  } = useSimpleTherapistSelection({
    clientState,
    clientDateOfBirth
  });

  const handleSubmit = async () => {
    if (!selectedTherapistId) {
      toast.error("Please select a therapist to continue");
      return;
    }
    
    const success = await selectTherapist(selectedTherapistId);
    if (success) {
      // Refresh the user data to get the updated status
      await refreshUserData();
      
      // Navigate to dashboard
      toast.success("Your therapist has been selected! Redirecting to dashboard...");
      navigate('/patient-dashboard');
    }
  };

  // Show loading state when auth or therapists are loading
  if (authLoading) {
    return (
      <NewLayout>
        <div className="container mx-auto max-w-4xl flex flex-col items-center justify-center py-12">
          <Loader className="h-12 w-12 animate-spin text-blue-500 mb-4" />
          <p className="text-lg">Loading your profile information...</p>
        </div>
      </NewLayout>
    );
  }

  return (
    <NewLayout>
      <div className="container mx-auto max-w-5xl px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Select Your Therapist</h1>
          <p className="text-gray-600">
            {clientState 
              ? `Showing therapists licensed in ${clientState} who can work with you.`
              : 'Choose a therapist who you feel would be the best fit for your needs.'}
          </p>
        </div>

        {loading && (
          <div className="flex flex-col items-center justify-center py-8">
            <Loader className="h-8 w-8 animate-spin text-blue-500 mb-4" />
            <p>Loading available therapists...</p>
          </div>
        )}

        {!loading && error && (
          <div className="bg-red-50 border border-red-200 rounded-md p-4 mb-6 flex items-start">
            <AlertTriangle className="h-5 w-5 text-red-500 mr-2 mt-0.5" />
            <div>
              <h3 className="font-medium text-red-800">Error loading therapists</h3>
              <p className="text-red-700 text-sm mt-1">{error}</p>
            </div>
          </div>
        )}

        {!loading && !error && therapists.length === 0 && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4 mb-6">
            <h3 className="font-medium text-yellow-800">No therapists available</h3>
            <p className="text-yellow-700 text-sm mt-1">
              No therapists are currently available that match your criteria. This could be due to state licensing requirements, age restrictions, or availability status. Please contact support for assistance.
            </p>
          </div>
        )}

        {!loading && therapists.length > 0 && (
          <div className="grid grid-cols-1 gap-6">
            {therapists.map(therapist => (
              <TherapistCard
                key={therapist.id}
                id={therapist.id}
                name={therapist.clinician_professional_name || `${therapist.clinician_first_name || ''} ${therapist.clinician_last_name || ''}`.trim()}
                bio={therapist.clinician_bio}
                imageUrl={therapist.clinician_image_url}
                isSelected={selectedTherapistId === therapist.id}
                onSelect={setSelectedTherapistId}
              />
            ))}
          </div>
        )}

        <div className="mt-8 flex justify-end">
          <Button 
            onClick={handleSubmit} 
            disabled={!selectedTherapistId || isSubmitting}
            className="bg-blue-600 hover:bg-blue-700"
          >
            {isSubmitting ? (
              <>
                <Loader className="h-4 w-4 animate-spin mr-2" />
                Processing...
              </>
            ) : "Confirm Selection"}
          </Button>
        </div>
      </div>
    </NewLayout>
  );
};

export default TherapistSelection;
