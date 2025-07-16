import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/context/NewAuthContext';
import { Loader, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';
import { useSimpleTherapistSelection } from '@/hooks/useSimpleTherapistSelection';
import TherapistCard from '@/components/therapist/TherapistCard';

const TherapistSelectionTab = () => {
  const navigate = useNavigate();
  
  // Get client data from auth context
  const { clientProfile, isLoading: authLoading, refreshUserData } = useAuth();
  const clientState = clientProfile?.client_state || null;
  const clientDateOfBirth = clientProfile?.client_date_of_birth || null;
  const clientChampva = clientProfile?.client_champva || null;

  // Use the enhanced therapist selection hook with CHAMPVA filtering
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
    clientDateOfBirth,
    clientChampva
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
      
      // Show success message without navigation
      toast.success("Your therapist has been selected successfully!");
    }
  };

  // Show loading state when auth or therapists are loading
  if (authLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <Loader className="h-12 w-12 animate-spin text-primary mb-4" />
        <p className="text-lg">Loading your profile information...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-start">
        <div>
          <h2 className="text-2xl font-semibold mb-2">Select Your Therapist</h2>
          <p className="text-muted-foreground">
            {clientState 
              ? `Showing therapists licensed in ${clientState} who can work with you.`
              : 'Choose a therapist who you feel would be the best fit for your needs.'}
          </p>
          <p className="text-muted-foreground mt-3">
            Our care team is constantly growing. As we hire more clinicians, they will show up here and you will be notified. We personally believe that your care should be in your hands. And you should be able to select your own therapist. Please reach out to the clinician of your choosing to discuss scheduling.
          </p>
        </div>
        <Button 
          onClick={handleSubmit} 
          disabled={!selectedTherapistId || isSubmitting}
        >
          {isSubmitting ? (
            <>
              <Loader className="h-4 w-4 animate-spin mr-2" />
              Processing...
            </>
          ) : "Confirm Selection"}
        </Button>
      </div>

      {loading && (
        <div className="flex flex-col items-center justify-center py-8">
          <Loader className="h-8 w-8 animate-spin text-primary mb-4" />
          <p>Loading available therapists...</p>
        </div>
      )}

      {!loading && error && (
        <div className="bg-destructive/10 border border-destructive/20 rounded-md p-4 mb-6 flex items-start">
          <AlertTriangle className="h-5 w-5 text-destructive mr-2 mt-0.5" />
          <div>
            <h3 className="font-medium text-destructive">Error loading therapists</h3>
            <p className="text-destructive text-sm mt-1">{error}</p>
          </div>
        </div>
      )}

      {!loading && !error && therapists.length === 0 && (
        <div className="bg-primary/10 border border-primary/20 rounded-md p-6 mb-6">
          {!clientChampva || clientChampva.trim() === '' ? (
            <div>
              <h3 className="font-medium text-foreground mb-2">CHAMPVA Insurance Required</h3>
              <p className="text-foreground leading-relaxed">
                At this time, we are only able to provide services to clients who have CHAMPVA insurance coverage. Please ensure your CHAMPVA insurance information is complete in your profile to access our therapist selection.
              </p>
              <p className="text-foreground leading-relaxed mt-4">
                If you have CHAMPVA insurance but it's not showing in your profile, please contact our support team to update your insurance information.
              </p>
            </div>
          ) : (
            <div>
              <p className="text-foreground leading-relaxed">
                We're truly sorry, but at this moment all of our clinicians who are in your state are booked up and not taking new clients. We understand how difficult it can be to wait for care—and especially when you're seeking support that's covered and accessible. You're not alone in this, and we're here to help you take the next step.
              </p>
              <p className="text-foreground leading-relaxed mt-4">
                We are fighting to get reach more therapists and grow our team to keep up with the extraordinary need that we have encountered. If you know any clinicians that would be interested in working with us, please let them know about us. The best thing we can do is increase awareness that we exist.
              </p>
            </div>
          )}
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
              email={therapist.clinician_email || 'Contact clinic for email'}
              isSelected={selectedTherapistId === therapist.id}
              onSelect={setSelectedTherapistId}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default TherapistSelectionTab;