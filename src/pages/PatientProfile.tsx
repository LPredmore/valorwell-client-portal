import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import Layout from '@/components/layout/Layout';
import MyProfile from '@/components/patient/MyProfile';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/NewAuthContext';
import { timezoneOptions } from '@/utils/timezoneOptions';
import { getEffectiveClientTimezone } from '@/utils/timezoneValidation';

const formSchema = z.object({
  firstName: z.string().min(2, {
    message: "First name must be at least 2 characters.",
  }),
  lastName: z.string().min(2, {
    message: "Last name must be at least 2 characters.",
  }),
  preferredName: z.string().optional(),
  email: z.string().email({
    message: "Please enter a valid email address.",
  }),
  phone: z.string().optional(),
  dateOfBirth: z.string().optional(),
  age: z.number().optional(),
  address: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  zipCode: z.string().optional(),
  gender: z.string().optional(),
  genderIdentity: z.string().optional(),
  timeZone: z.string().optional(),
});

const PatientProfile: React.FC = () => {
  const { user, userId } = useAuth();
  const { toast } = useToast();
  const [clientData, setClientData] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  
  // Use proper timezone options with user-friendly labels
  const timeZoneOptions = timezoneOptions.map(option => ({
    value: option.value,
    label: option.label
  }));
  
  const genderOptions = [
    'Male',
    'Female',
    'Transgender Male',
    'Transgender Female',
    'Non-binary',
    'Other',
    'Prefer not to say'
  ];
  
  const genderIdentityOptions = [
    'Cisgender',
    'Transgender',
    'Non-binary',
    'Genderqueer',
    'Genderfluid',
    'Agender',
    'Two-Spirit',
    'Other',
    'Prefer not to say'
  ];
  
  const stateOptions = [
    'AL', 'AK', 'AZ', 'AR', 'CA', 'CO', 'CT', 'DE', 'FL', 'GA',
    'HI', 'ID', 'IL', 'IN', 'IA', 'KS', 'KY', 'LA', 'ME', 'MD',
    'MA', 'MI', 'MN', 'MS', 'MO', 'MT', 'NE', 'NV', 'NH', 'NJ',
    'NM', 'NY', 'NC', 'ND', 'OH', 'OK', 'OR', 'PA', 'RI', 'SC',
    'SD', 'TN', 'TX', 'UT', 'VT', 'VA', 'WA', 'WV', 'WI', 'WY'
  ];

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      firstName: '',
      lastName: '',
      preferredName: '',
      email: '',
      phone: '',
      dateOfBirth: '',
      age: 0,
      address: '',
      city: '',
      state: '',
      zipCode: '',
      gender: '',
      genderIdentity: '',
      timeZone: getEffectiveClientTimezone(null), // Use effective timezone as default
    },
  });

  useEffect(() => {
    // Set page title for accessibility
    document.title = 'My Profile | Valorwell';
    
    // Log page view for debugging
    console.log('PatientProfile page loaded');
    
    // Fetch client data on mount
    fetchClientData();
  }, [userId]);

  const fetchClientData = async () => {
    if (!userId) {
      console.warn('No user ID found, cannot fetch client data.');
      setLoading(false);
      return;
    }
    
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('clients')
        .select('*')
        .eq('id', userId)
        .single();

      if (error) {
        console.error('Error fetching client data:', error);
        toast({
          title: "Error",
          description: "Failed to load profile data. Please try again.",
          variant: "destructive",
        });
        return;
      }

      if (data) {
        // Populate form with client data
        form.setValue('firstName', data.client_first_name || '');
        form.setValue('lastName', data.client_last_name || '');
        form.setValue('preferredName', data.client_preferred_name || '');
        form.setValue('email', data.client_email || '');
        form.setValue('phone', data.client_phone || '');
        form.setValue('dateOfBirth', data.client_date_of_birth || '');
        form.setValue('age', data.client_age || 0);
        form.setValue('address', data.client_address || '');
        form.setValue('city', data.client_city || '');
        form.setValue('state', data.client_state || '');
        form.setValue('zipCode', data.client_zip_code || '');
        form.setValue('gender', data.client_gender || '');
        form.setValue('genderIdentity', data.client_gender_identity || '');
        form.setValue('timeZone', data.client_time_zone || getEffectiveClientTimezone(null));

        setClientData(data);
      } else {
        console.warn('No client data found for user:', userId);
        toast({
          title: "Profile Not Found",
          description: "No profile data found for your account.",
          variant: "default",
        });
      }
    } catch (error) {
      console.error('Error fetching client data:', error);
      toast({
        title: "Error",
        description: "Failed to load profile data. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSaveProfile = async () => {
    setIsSaving(true);
    
    try {
      const formData = form.getValues();
      
      const { error } = await supabase
        .from('clients')
        .update({
          client_preferred_name: formData.preferredName,
          client_phone: formData.phone,
          client_address: formData.address,
          client_city: formData.city,
          client_state: formData.state,
          client_zip_code: formData.zipCode,
          client_gender: formData.gender,
          client_gender_identity: formData.genderIdentity,
          client_time_zone: formData.timeZone, // This will be an IANA identifier
        })
        .eq('id', userId);

      if (error) throw error;

      toast({
        title: "Profile Updated",
        description: "Your profile has been successfully updated.",
      });
      
      setIsEditing(false);
      fetchClientData(); // Refresh data
    } catch (error) {
      console.error('Error updating profile:', error);
      toast({
        title: "Error",
        description: "Failed to update profile. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    form.reset({
      firstName: clientData?.client_first_name || '',
      lastName: clientData?.client_last_name || '',
      preferredName: clientData?.client_preferred_name || '',
      email: clientData?.client_email || '',
      phone: clientData?.client_phone || '',
      dateOfBirth: clientData?.client_date_of_birth || '',
      age: clientData?.client_age || 0,
      address: clientData?.client_address || '',
      city: clientData?.client_city || '',
      state: clientData?.client_state || '',
      zipCode: clientData?.client_zip_code || '',
      gender: clientData?.client_gender || '',
      genderIdentity: clientData?.client_gender_identity || '',
      timeZone: clientData?.client_time_zone || getEffectiveClientTimezone(null),
    });
  };

  return (
    <Layout>
      <div className="container mx-auto p-6">
        <h1 className="text-2xl font-semibold mb-6">My Profile</h1>
        <div className="grid grid-cols-1 gap-6">
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
      </div>
    </Layout>
  );
};

export default PatientProfile;
