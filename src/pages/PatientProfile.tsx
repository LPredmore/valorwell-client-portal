
import React, { useState, useEffect } from 'react';
import Layout from '@/components/layout/Layout';
import { useForm } from 'react-hook-form';
import { useNavigate } from 'react-router-dom';
import { getCurrentUser, getClientByUserId, updateClientProfile } from '@/integrations/supabase/client';
import { useToast } from '@/components/ui/use-toast';
import MyProfile from '@/components/patient/MyProfile';
import { useAuth } from '@/context/NewAuthContext';
import { getUserTimeZone, getTimeZoneDisplayName } from '@/utils/timeZoneUtils';

const PatientProfile: React.FC = () => {
  const [loading, setLoading] = useState<boolean>(true);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [clientData, setClientData] = useState<any>(null);
  const [isEditing, setIsEditing] = useState<boolean>(false);
  const { toast } = useToast();
  const navigate = useNavigate();
  const { userId } = useAuth();

  const genderOptions = ['Male', 'Female', 'Non-Binary', 'Other', 'Prefer not to say'];
  const genderIdentityOptions = ['Male', 'Female', 'Trans Man', 'Trans Woman', 'Non-Binary', 'Other', 'Prefer not to say'];
  const stateOptions = [
    'Alabama', 'Alaska', 'Arizona', 'Arkansas', 'California', 'Colorado', 'Connecticut',
    'Delaware', 'Florida', 'Georgia', 'Hawaii', 'Idaho', 'Illinois', 'Indiana', 'Iowa', 'Kansas',
    'Kentucky', 'Louisiana', 'Maine', 'Maryland', 'Massachusetts', 'Michigan', 'Minnesota',
    'Mississippi', 'Missouri', 'Montana', 'Nebraska', 'Nevada', 'New Hampshire', 'New Jersey',
    'New Mexico', 'New York', 'North Carolina', 'North Dakota', 'Ohio', 'Oklahoma', 'Oregon',
    'Pennsylvania', 'Rhode Island', 'South Carolina', 'South Dakota', 'Tennessee', 'Texas',
    'Utah', 'Vermont', 'Virginia', 'Washington', 'West Virginia', 'Wisconsin', 'Wyoming'
  ];
  const timeZoneOptions = [
    'Eastern Standard Time (EST)', 'Central Standard Time (CST)',
    'Mountain Standard Time (MST)', 'Pacific Standard Time (PST)', 'Alaska Standard Time (AKST)',
    'Hawaii-Aleutian Standard Time (HST)', 'Atlantic Standard Time (AST)'
  ];

  const form = useForm({
    defaultValues: {
      firstName: '',
      lastName: '',
      preferredName: '',
      email: '',
      phone: '',
      dateOfBirth: '',
      age: '',
      gender: '',
      genderIdentity: '',
      state: '',
      address: '', // Added address field
      city: '', // Added city field
      zipCode: '', // Added zip code field
      timeZone: ''
    }
  });

  const fetchClientData = async () => {
    setLoading(true);

    try {
      // Use userId from useAuth hook
      if (!userId) {
        toast({
          title: "Authentication required",
          description: "Please sign in to view your profile",
          variant: "destructive"
        });
        navigate('/login');
        return;
      }

      console.log("Current user ID:", userId);
      const { client, error: clientError } = await getClientByUserId(userId);
      console.log("Retrieved client data:", client);

      if (clientError || !client) {
        toast({
          title: "Profile not found",
          description: "We couldn't find your client profile",
          variant: "destructive"
        });
        return;
      }

      setClientData(client);

      let age = '';
      if (client.client_date_of_birth) {
        const dob = new Date(client.client_date_of_birth);
        const today = new Date();
        age = String(today.getFullYear() - dob.getFullYear());
      }

      let formattedDob = '';
      if (client.client_date_of_birth) {
        const dob = new Date(client.client_date_of_birth);
        formattedDob = dob.toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'long',
          day: 'numeric'
        });
      }

      // Get user timezone if none exists in profile
      const timeZone = client.client_time_zone || getUserTimeZone();
      
      // Format timezone for display if it exists
      const displayTimeZone = timeZone ? getTimeZoneDisplayName(timeZone) : '';

      form.reset({
        firstName: client.client_first_name || '',
        lastName: client.client_last_name || '',
        preferredName: client.client_preferred_name || '',
        email: client.client_email || '',
        phone: client.client_phone || '',
        dateOfBirth: formattedDob,
        age: age,
        gender: client.client_gender || '',
        genderIdentity: client.client_gender_identity || '',
        state: client.client_state || '',
        address: client.client_address || '', // Added address field
        city: client.client_city || '', // Added city field
        zipCode: client.client_zip_code || '', // Added zip code field
        timeZone: client.client_time_zone || timeZone
      });
    } catch (error) {
      console.error("Error fetching client data:", error);
      toast({
        title: "Error",
        description: "Failed to load your profile data",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSaveProfile = async () => {
    if (!clientData) {
      console.error("Cannot save: No client data available");
      toast({
        title: "Error",
        description: "Unable to save profile: No client data available",
        variant: "destructive"
      });
      return;
    }

    console.log("Starting save process for client ID:", clientData.id);
    setIsSaving(true);

    try {
      const formValues = form.getValues();
      console.log("Form values to save:", formValues);

      const updates = {
        client_preferred_name: formValues.preferredName,
        client_phone: formValues.phone,
        client_gender: formValues.gender,
        client_gender_identity: formValues.genderIdentity,
        client_state: formValues.state,
        client_address: formValues.address, // Added address field
        client_city: formValues.city, // Added city field
        client_zip_code: formValues.zipCode, // Added zip code field
        client_time_zone: formValues.timeZone
      };

      console.log("Sending updates to database:", updates);
      const result = await updateClientProfile(clientData.id, updates);

      if (result.success) {
        console.log("Profile update successful");
        toast({
          title: "Success",
          description: "Your profile has been updated successfully",
        });
        setIsEditing(false);
        fetchClientData();
      } else {
        console.error("Profile update failed:", result.error);
        throw new Error("Failed to update profile: " + JSON.stringify(result.error));
      }
    } catch (error) {
      console.error("Error saving profile:", error);
      toast({
        title: "Error",
        description: "Failed to save your profile",
        variant: "destructive"
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancelEdit = () => {
    console.log("Edit cancelled");
    setIsEditing(false);
    fetchClientData();
  };

  useEffect(() => {
    console.log("PatientProfile component mounted");
    fetchClientData();
  }, [userId]);

  return (
    <Layout>
      <div className="flex flex-col gap-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold tracking-tight">My Profile</h1>
        </div>

        <MyProfile 
          clientData={clientData}
          loading={loading}
          isEditing={isEditing}
          setIsEditing={setIsEditing}
          form={form}
          isSaving={isSaving}
          handleSaveProfile={handleSaveProfile}
          handleCancelEdit={handleCancelEdit}
          genderOptions={genderOptions}
          genderIdentityOptions={genderIdentityOptions}
          stateOptions={stateOptions}
          timeZoneOptions={timeZoneOptions}
        />
      </div>
    </Layout>
  );
};

export default PatientProfile;
