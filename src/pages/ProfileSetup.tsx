import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Form } from '@/components/ui/form';
import FormFieldWrapper from '@/components/ui/FormFieldWrapper';
import { useAuth } from '@/context/NewAuthContext';
import { supabase, getClientByUserId, updateClientProfile } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';

const formSchema = z.object({
  firstName: z.string().min(2, {
    message: 'First name must be at least 2 characters.'
  }),
  lastName: z.string().min(2, {
    message: 'Last name must be at least 2 characters.'
  }),
  preferredName: z.string().optional(),
  email: z.string().email({
    message: 'Please enter a valid email address.'
  }),
  phone: z.string().optional(),
  dateOfBirth: z.string().optional(),
  age: z.string().optional(),
  address: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  zipCode: z.string().optional(),
  gender: z.string().optional(),
  genderIdentity: z.string().optional(),
  timeZone: z.string().optional()
});

const stateOptions = [
  'Alabama', 'Alaska', 'Arizona', 'Arkansas', 'California', 'Colorado', 'Connecticut',
  'Delaware', 'Florida', 'Georgia', 'Hawaii', 'Idaho', 'Illinois', 'Indiana', 'Iowa',
  'Kansas', 'Kentucky', 'Louisiana', 'Maine', 'Maryland', 'Massachusetts', 'Michigan',
  'Minnesota', 'Mississippi', 'Missouri', 'Montana', 'Nebraska', 'Nevada', 'New Hampshire',
  'New Jersey', 'New Mexico', 'New York', 'North Carolina', 'North Dakota', 'Ohio', 'Oklahoma',
  'Oregon', 'Pennsylvania', 'Rhode Island', 'South Carolina', 'South Dakota', 'Tennessee', 'Texas',
  'Utah', 'Vermont', 'Virginia', 'Washington', 'West Virginia', 'Wisconsin', 'Wyoming'
];

const genderOptions = ['Male', 'Female', 'Other', 'Prefer not to say'];
const genderIdentityOptions = ['Man', 'Woman', 'Non-binary', 'Other', 'Prefer not to say'];

const timeZoneOptions = [
  'America/New_York', 'America/Los_Angeles', 'America/Chicago', 'America/Phoenix',
  'America/Anchorage', 'America/Honolulu', 'America/Denver', 'America/Toronto',
  'America/Vancouver', 'America/Montreal', 'America/Mexico_City', 'America/Argentina/Buenos_Aires',
  'Europe/London', 'Europe/Berlin', 'Europe/Paris', 'Europe/Rome', 'Europe/Moscow',
  'Asia/Tokyo', 'Asia/Shanghai', 'Asia/Kolkata', 'Asia/Dubai', 'Australia/Sydney',
  'Australia/Melbourne', 'Africa/Johannesburg', 'Africa/Lagos', 'Pacific/Auckland'
];

// Helper function to extract user metadata and map to client fields
const extractUserMetadata = (user: any) => {
  const metadata = user?.user_metadata || {};
  return {
    client_first_name: metadata.first_name || '',
    client_last_name: metadata.last_name || '',
    client_preferred_name: metadata.preferred_name || metadata.first_name || '',
    client_phone: metadata.phone || '',
    client_state: metadata.state || '',
    client_email: user?.email || ''
  };
};

// Helper function to create form values from client record with metadata fallback
const createFormValuesFromClientRecord = (clientRecord: any, userMetadata: any) => {
  return {
    firstName: clientRecord?.client_first_name || userMetadata.client_first_name || '',
    lastName: clientRecord?.client_last_name || userMetadata.client_last_name || '',
    preferredName: clientRecord?.client_preferred_name || userMetadata.client_preferred_name || '',
    email: clientRecord?.client_email || userMetadata.client_email || '',
    phone: clientRecord?.client_phone || userMetadata.client_phone || '',
    dateOfBirth: clientRecord?.client_date_of_birth || '',
    age: clientRecord?.client_age?.toString() || '',
    address: clientRecord?.client_address || '',
    city: clientRecord?.client_city || '',
    state: clientRecord?.client_state || userMetadata.client_state || '',
    zipCode: clientRecord?.client_zip_code || clientRecord?.client_zipcode || '',
    gender: clientRecord?.client_gender || '',
    genderIdentity: clientRecord?.client_gender_identity || '',
    timeZone: clientRecord?.client_time_zone || ''
  };
};

const ProfileSetup: React.FC = () => {
  const navigate = useNavigate();
  const { user, userId, isLoading: authLoading, refreshUserData } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoadingData, setIsLoadingData] = useState(true);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      firstName: '',
      lastName: '',
      preferredName: '',
      email: '',
      phone: '',
      dateOfBirth: '',
      age: '',
      address: '',
      city: '',
      state: '',
      zipCode: '',
      gender: '',
      genderIdentity: '',
      timeZone: ''
    }
  });

  const fetchAndSetInitialData = async () => {
    if (!userId || !user) return;

    try {
      setIsLoadingData(true);
      
      // Extract user metadata for fallback values
      const userMetadata = extractUserMetadata(user);
      console.log('Extracted user metadata:', userMetadata);

      // Try to fetch existing client data
      const { client, error } = await getClientByUserId(userId);
      
      if (error) {
        console.error('Error fetching client data:', error);
        // Use metadata as primary source if database fetch fails
        const formValues = createFormValuesFromClientRecord(null, userMetadata);
        form.reset(formValues);
        console.log('Using metadata as primary source:', formValues);
      } else {
        // Merge database data with metadata (database takes priority)
        const formValues = createFormValuesFromClientRecord(client, userMetadata);
        form.reset(formValues);
        console.log('Merged database and metadata:', formValues);
      }
    } catch (error) {
      console.error('Exception in fetchAndSetInitialData:', error);
      // Fall back to just user metadata if everything fails
      const userMetadata = extractUserMetadata(user);
      const formValues = createFormValuesFromClientRecord(null, userMetadata);
      form.reset(formValues);
    } finally {
      setIsLoadingData(false);
    }
  };

  useEffect(() => {
    if (!authLoading && user && userId) {
      fetchAndSetInitialData();
    }
  }, [authLoading, user, userId]);

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    if (!userId) {
      toast.error('User not authenticated');
      return;
    }

    try {
      setIsSubmitting(true);

      // Calculate age from date of birth if provided
      let calculatedAge = null;
      if (values.dateOfBirth) {
        const birthDate = new Date(values.dateOfBirth);
        const today = new Date();
        calculatedAge = today.getFullYear() - birthDate.getFullYear();
        const monthDiff = today.getMonth() - birthDate.getMonth();
        if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
          calculatedAge--;
        }
      }

      const profileData = {
        client_first_name: values.firstName,
        client_last_name: values.lastName,
        client_preferred_name: values.preferredName || values.firstName,
        client_email: values.email,
        client_phone: values.phone,
        client_date_of_birth: values.dateOfBirth || null,
        client_age: calculatedAge || (values.age ? parseInt(values.age) : null),
        client_address: values.address,
        client_city: values.city,
        client_state: values.state,
        client_zip_code: values.zipCode,
        client_gender: values.gender,
        client_gender_identity: values.genderIdentity,
        client_time_zone: values.timeZone,
        client_status: 'Profile Complete',
        client_is_profile_complete: 'true',
        updated_at: new Date().toISOString()
      };

      const { success, error } = await updateClientProfile(userId, profileData);

      if (success) {
        toast.success('Profile updated successfully!');
        
        // Refresh user data to get updated client status
        await refreshUserData();
        
        // Navigate to patient dashboard
        navigate('/patient-dashboard');
      } else {
        console.error('Error updating profile:', error);
        toast.error('Failed to update profile. Please try again.');
      }
    } catch (error) {
      console.error('Exception during profile update:', error);
      toast.error('An unexpected error occurred. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (authLoading || isLoadingData) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="flex items-center gap-2">
          <Loader2 className="h-6 w-6 animate-spin" />
          <span>Loading your profile...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 px-4 max-w-4xl">
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl font-bold">Complete Your Profile</CardTitle>
          <CardDescription>
            Please fill out your profile information to get started with Valorwell.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormFieldWrapper
                  control={form.control}
                  name="firstName"
                  label="First Name *"
                />

                <FormFieldWrapper
                  control={form.control}
                  name="lastName"
                  label="Last Name *"
                />

                <FormFieldWrapper
                  control={form.control}
                  name="preferredName"
                  label="Preferred Name"
                />

                <FormFieldWrapper
                  control={form.control}
                  name="email"
                  label="Email Address *"
                  type="email"
                  readOnly={true}
                />

                <FormFieldWrapper
                  control={form.control}
                  name="phone"
                  label="Phone Number"
                  type="tel"
                />

                <FormFieldWrapper
                  control={form.control}
                  name="dateOfBirth"
                  label="Date of Birth"
                  type="date"
                />

                <FormFieldWrapper
                  control={form.control}
                  name="age"
                  label="Age"
                  type="number"
                />

                <FormFieldWrapper
                  control={form.control}
                  name="address"
                  label="Street Address"
                />

                <FormFieldWrapper
                  control={form.control}
                  name="city"
                  label="City"
                />

                <FormFieldWrapper
                  control={form.control}
                  name="state"
                  label="State"
                  type="select"
                  options={stateOptions}
                />

                <FormFieldWrapper
                  control={form.control}
                  name="zipCode"
                  label="ZIP Code"
                />

                <FormFieldWrapper
                  control={form.control}
                  name="gender"
                  label="Gender"
                  type="select"
                  options={genderOptions}
                />

                <FormFieldWrapper
                  control={form.control}
                  name="genderIdentity"
                  label="Gender Identity"
                  type="select"
                  options={genderIdentityOptions}
                />

                <FormFieldWrapper
                  control={form.control}
                  name="timeZone"
                  label="Time Zone"
                  type="select"
                  options={timeZoneOptions}
                />
              </div>

              <div className="flex justify-end gap-4 pt-6">
                <Button
                  type="submit"
                  disabled={isSubmitting}
                  className="min-w-[150px]"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    'Complete Profile'
                  )}
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
};

export default ProfileSetup;
