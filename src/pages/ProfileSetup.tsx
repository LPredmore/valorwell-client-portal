import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Form } from '@/components/ui/form';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { Check, ArrowLeft, ArrowRight } from 'lucide-react';
import Layout from '@/components/layout/Layout';
import { supabase } from '@/integrations/supabase/client';
import FormFieldWrapper from '@/components/ui/FormFieldWrapper';
import { useToast } from '@/hooks/use-toast';
import { timezoneOptions, getTimezoneOption, getTimezoneLabel } from '@/utils/timezoneOptions';
import { DateField } from '@/components/ui/DateField';
import SignupChampva from '@/components/signup/SignupChampva';
import SignupTricare from '@/components/signup/SignupTricare';
import SignupVaCcn from '@/components/signup/SignupVaCcn';
import SignupVeteran from '@/components/signup/SignupVeteran';
import SignupNotAVeteran from '@/components/signup/SignupNotAVeteran';
import AdditionalInsurance from '@/components/signup/AdditionalInsurance';
import MoreAdditionalInsurance from '@/components/signup/MoreAdditionalInsurance';
import SignupLast from '@/components/signup/SignupLast';
import { useAuth } from '@/context/NewAuthContext';
import { parseDateString, calculateAge, formatDateForDB } from '@/utils/dateUtils';

// Custom timezone options - only US timezones
const customTimezoneOptions = [
  { value: "America/New_York", label: "Eastern Time (ET) - New York" },
  { value: "America/Chicago", label: "Central Time (CT) - Chicago" },
  { value: "America/Denver", label: "Mountain Time (MT) - Denver" },
  { value: "America/Los_Angeles", label: "Pacific Time (PT) - Los Angeles" },
  { value: "America/Anchorage", label: "Alaska Time (AKT) - Anchorage" },
  { value: "Pacific/Honolulu", label: "Hawaii-Aleutian Time (HST) - Honolulu" },
  { value: "America/Phoenix", label: "Mountain Time - Arizona (no DST)" },
];

type ClientFormData = {
  client_first_name?: string;
  client_last_name?: string;
  client_preferred_name?: string;
  client_email?: string;
  client_phone?: string;
  client_relationship?: string;
  client_date_of_birth?: Date | null;
  client_age?: number | null;
  client_gender?: string;
  client_gender_identity?: string;
  client_state?: string;
  client_address?: string; // Added address field
  client_city?: string; // Added city field
  client_zip_code?: string; // Added zip code field
  client_time_zone?: string;
  client_vacoverage?: string;
  client_champva?: string;
  client_other_insurance?: string;
  client_champva_agreement?: boolean;
  client_mental_health_referral?: string;
  client_branchOS?: string;
  client_recentdischarge?: Date | null; // Type is Date | null for form usage
  client_disabilityrating?: string;
  client_tricare_beneficiary_category?: string;
  client_tricare_sponsor_name?: string;
  client_tricare_sponsor_branch?: string;
  client_tricare_sponsor_id?: string;
  client_tricare_plan?: string;
  client_tricare_region?: string;
  client_tricare_policy_id?: string;
  client_tricare_has_referral?: string;
  client_tricare_referral_number?: string;
  client_tricare_insurance_agreement?: boolean;
  client_veteran_relationship?: string;
  client_situation_explanation?: string;
  client_insurance_company_primary?: string;
  client_insurance_type_primary?: string;
  client_subscriber_name_primary?: string;
  client_subscriber_relationship_primary?: string;
  client_subscriber_dob_primary?: Date | null;
  client_group_number_primary?: string;
  client_policy_number_primary?: string;
  client_insurance_company_secondary?: string;
  client_insurance_type_secondary?: string;
  client_subscriber_name_secondary?: string;
  client_subscriber_relationship_secondary?: string;
  client_subscriber_dob_secondary?: Date | null;
  client_group_number_secondary?: string;
  client_policy_number_secondary?: string;
  hasMoreInsurance?: string;
  client_has_even_more_insurance?: string;
  client_self_goal?: string;
  client_referral_source?: string;
};

const profileStep1Schema = z.object({
  client_first_name: z.string().min(1, "First name is required"),
  client_last_name: z.string().min(1, "Last name is required"),
  client_preferred_name: z.string().optional().nullable(),
  client_email: z.string().email("Valid email is required"),
  client_phone: z.string().min(10, "Valid phone number is required"),
  client_relationship: z.string().min(1, "Relationship is required"),
});

const profileStep2Schema = z.object({
  client_date_of_birth: z.date({
    required_error: "Date of birth is required",
  }).nullable(),
  client_gender: z.string().min(1, "Birth gender is required"),
  client_gender_identity: z.string().min(1, "Gender identity is required"),
  client_state: z.string().min(1, "State is required"),
  client_address: z.string().min(1, "Address is required"),
  client_city: z.string().min(1, "City is required"),
  client_zip_code: z.string().min(5, "Valid ZIP code is required"),
  client_time_zone: z.string().min(1, "Time zone is required"),
  client_vacoverage: z.string().min(1, "VA coverage information is required"),
});

type ProfileFormValues = z.infer<typeof profileStep1Schema> &
  Partial<z.infer<typeof profileStep2Schema>> & {
    client_age?: number | null;
    client_address?: string; // Added address field
    client_city?: string; // Added city field
    client_zip_code?: string; // Added zip code field
    client_champva?: string;
    client_other_insurance?: string;
    client_champva_agreement?: boolean;
    client_mental_health_referral?: string;
    client_branchOS?: string;
    client_recentdischarge?: Date | null;
    client_disabilityrating?: string;
    client_tricare_beneficiary_category?: string;
    client_tricare_sponsor_name?: string;
    client_tricare_sponsor_branch?: string;
    client_tricare_sponsor_id?: string;
    client_tricare_plan?: string;
    client_tricare_region?: string;
    client_tricare_policy_id?: string;
    client_tricare_has_referral?: string;
    client_tricare_referral_number?: string;
    client_tricare_insurance_agreement?: boolean;
    client_veteran_relationship?: string;
    client_situation_explanation?: string;
    client_insurance_company_primary?: string;
    client_insurance_type_primary?: string;
    client_subscriber_name_primary?: string;
    client_subscriber_relationship_primary?: string;
    client_subscriber_dob_primary?: Date | null;
    client_group_number_primary?: string;
    client_policy_number_primary?: string;
    client_insurance_company_secondary?: string;
    client_insurance_type_secondary?: string;
    client_subscriber_name_secondary?: string;
    client_subscriber_relationship_secondary?: string;
    client_subscriber_dob_secondary?: Date | null;
    client_group_number_secondary?: string;
    client_policy_number_secondary?: string;
    hasMoreInsurance?: string;
    client_has_even_more_insurance?: string;
    client_self_goal?: string;
    client_referral_source?: string;
  };

const ProfileSetup = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user, isLoading, authInitialized, userId, refreshUserData } = useAuth();

  const [clientId, setClientId] = useState<string | null>(null);
  const [currentStep, setCurrentStep] = useState(1);
  const [navigationHistory, setNavigationHistory] = useState<number[]>([1]);
  const [otherInsurance, setOtherInsurance] = useState<string>('');
  const [isFormLoading, setIsFormLoading] = useState(true);
  const [authError, setAuthError] = useState<string | null>(null);
  const [loadingTimeout, setLoadingTimeout] = useState(false);
  const initialDataLoadedForUser = useRef<string | null>(null);
  
  // Add timeout mechanism to prevent indefinite loading - optimized to reduce unnecessary state updates
  useEffect(() => {
    // Only set up timeouts if we're in a loading state and don't have an error
    if ((isLoading || !authInitialized) && !authError) {
      console.log("[ProfileSetup] Starting loading timeout check");
      
      // Use a single cleanup function for both timeouts
      const timeouts: NodeJS.Timeout[] = [];
      
      // First timeout for warning
      timeouts.push(setTimeout(() => {
        console.log("[ProfileSetup] Loading timeout reached after 10 seconds");
        setLoadingTimeout(true);
        toast({
          title: "Loading Delay",
          description: "User data is taking longer than expected to load.",
          variant: "default"
        });
      }, 10000)); // 10 seconds timeout
      
      // Second timeout for critical failure
      timeouts.push(setTimeout(() => {
        console.log("[ProfileSetup] Critical loading timeout reached after 30 seconds");
        setAuthError("Authentication process is taking too long. Please refresh the page.");
        toast({
          title: "Authentication Error",
          description: "Failed to load user data. Please refresh the page.",
          variant: "destructive"
        });
      }, 30000)); // 30 seconds for critical timeout
      
      // Single cleanup function for all timeouts
      return () => {
        timeouts.forEach(clearTimeout);
      };
    } else if (!isLoading && authInitialized && loadingTimeout) {
      // Reset loading timeout when loading is complete
      setLoadingTimeout(false);
    }
  }, [isLoading, authInitialized, authError, toast, loadingTimeout]);

  // Only log in development environment
  useEffect(() => {
    if (import.meta.env.DEV) {
      console.log('[ProfileSetup] Component Mounted');
      return () => {
        console.log('[ProfileSetup] Component Will Unmount');
      };
    }
  }, []);

  const form = useForm<ProfileFormValues>({
    resolver: zodResolver(
      currentStep === 1
        ? profileStep1Schema
        : currentStep === 2
        ? profileStep2Schema
        : z.object({}) 
    ),
    mode: "onChange",
    defaultValues: { 
        client_first_name: '', client_preferred_name: '', client_last_name: '',
        client_email: '', client_phone: '', client_relationship: '',
        client_date_of_birth: null, client_age: null, client_gender: '', client_gender_identity: '',
        client_state: '', client_address: '', client_city: '', client_zip_code: '', // Added new fields with defaults
        client_time_zone: '', client_vacoverage: '', client_champva: '',
        client_other_insurance: '', client_champva_agreement: false, client_mental_health_referral: '',
        client_branchOS: '', client_recentdischarge: null, client_disabilityrating: '',
        client_tricare_beneficiary_category: '', client_tricare_sponsor_name: '',
        client_tricare_sponsor_branch: '', client_tricare_sponsor_id: '', client_tricare_plan: '',
        client_tricare_region: '', client_tricare_policy_id: '', client_tricare_has_referral: '',
        client_tricare_referral_number: '', client_tricare_insurance_agreement: false,
        client_veteran_relationship: '', client_situation_explanation: '',
        client_insurance_company_primary: '', client_insurance_type_primary: '',
        client_subscriber_name_primary: '', client_subscriber_relationship_primary: '',
        client_subscriber_dob_primary: null, client_group_number_primary: '',
        client_policy_number_primary: '', client_insurance_company_secondary: '',
        client_insurance_type_secondary: '', client_subscriber_name_secondary: '',
        client_subscriber_relationship_secondary: '', client_subscriber_dob_secondary: null,
        client_group_number_secondary: '', client_policy_number_secondary: '',
        hasMoreInsurance: 'No', // Set default to 'No'
        client_has_even_more_insurance: '',
        client_self_goal: '', client_referral_source: '',
    }
  });

  const handleImmediateSave = useCallback(async (fieldName: keyof ProfileFormValues, value: any) => {
    if (!clientId) {
      console.warn("[ProfileSetup] Cannot save immediately - no client ID available yet for field:", fieldName);
      return;
    }
    
    let valueToSave = value;
    
    // Handle Date objects specifically for consistent DB formatting
    if (fieldName.includes('date') || fieldName.includes('dob') || fieldName === 'client_recentdischarge') {
      console.log(`[ProfileSetup] Field ${String(fieldName)} identified as date field with value:`, value);
      valueToSave = formatDateForDB(value);
      console.log(`[ProfileSetup] Formatted date value for DB:`, valueToSave);
    } 
    // Special handling for time_zone field to ensure IANA format is saved
    else if (fieldName === 'client_time_zone') {
      console.log(`[ProfileSetup] Time zone value before processing:`, value);
      // If the value is a label (like "Eastern Time (ET) - New York"), extract the IANA value
      if (value && typeof value === 'string') {
        const tzOption = customTimezoneOptions.find(tz => tz.label === value);
        if (tzOption) {
          valueToSave = tzOption.value; // Use the IANA identifier (e.g., "America/New_York")
          console.log(`[ProfileSetup] Converted time zone label to IANA value:`, valueToSave);
        }
      }
    } 
    // Special handling for address fields - make sure they're properly formatted
    else if (fieldName === 'client_address' || fieldName === 'client_city' || fieldName === 'client_zip_code') {
      console.log(`[ProfileSetup] Processing address field ${String(fieldName)}:`, value);
      valueToSave = value?.trim() || null; // Trim whitespace and convert empty strings to null
    }
    else if (value === null || value === undefined) {
      valueToSave = null;
    }
    
    console.log(`[ProfileSetup] Immediately saving field "${String(fieldName)}" with value:`, valueToSave);
    
    try {
      const { error } = await supabase
        .from('clients')
        .update({ [fieldName]: valueToSave })
        .eq('id', clientId);

      if (error) {
        console.error(`[ProfileSetup] Error saving ${String(fieldName)} immediately:`, error);
        toast({
          title: "Save Error",
          description: `Could not save your change for ${String(fieldName)}. Please try again.`,
          variant: "destructive"
        });
      } else {
        console.log(`[ProfileSetup] Successfully saved ${String(fieldName)} immediately.`);
        if (refreshUserData) {
            console.log(`[ProfileSetup] Refreshing auth context after immediate save of ${String(fieldName)}`);
            await refreshUserData();
        }
      }
    } catch (error) {
      console.error(`[ProfileSetup] Exception in handleImmediateSave for ${String(fieldName)}:`, error);
    }
  }, [clientId, toast, refreshUserData]);

  useEffect(() => {
    // Memoize the fetchAndSetInitialData function to avoid recreating it on every render
    const fetchAndSetInitialData = async () => {
      // Skip if still loading or not initialized
      if (isLoading || !authInitialized) {
        console.log('[ProfileSetup] Initial data fetch: User context still loading or not initialized. Waiting.');
        setIsFormLoading(true);
        return;
      }
      
      // Skip if no user ID
      if (!userId) {
        console.log('[ProfileSetup] Initial data fetch: No userId available after auth initialization.');
        setIsFormLoading(false);
        setAuthError("User ID not available. Please log in again.");
        toast({
          title: "Authentication Error",
          description: "User ID not available. Please log in again.",
          variant: "destructive"
        });
        return;
      }
      
      // Skip if data already loaded for this user
      if (initialDataLoadedForUser.current === userId) {
        console.log(`[ProfileSetup] Initial data already loaded and form set for userId: ${userId}. Skipping fetch and reset.`);
        setIsFormLoading(false);
        return;
      }
      
      console.log(`[ProfileSetup] Starting initial data fetch for userId: ${userId}. initialDataLoadedForUser.current: ${initialDataLoadedForUser.current}`);
      setIsFormLoading(true);
      
      try {
        const userEmail = user?.email;
        
        // Use a single query with proper error handling
        let clientRecord = await fetchClientRecord(userId, userEmail);
        
        if (clientRecord) {
          setClientId(clientRecord.id);
          
          // Parse all date fields at once
          const parsedDates = {
            dob: parseDateString(clientRecord.client_date_of_birth),
            recentDischarge: parseDateString(clientRecord.client_recentdischarge),
            subscriberDobPrimary: parseDateString(clientRecord.client_subscriber_dob_primary),
            subscriberDobSecondary: parseDateString(clientRecord.client_subscriber_dob_secondary)
          };
          
          // Calculate age once
          const calculatedClientAge = calculateAge(parsedDates.dob);
          
          // Only log in development environment
          if (import.meta.env.DEV) {
            console.log("[ProfileSetup] Parsed dates:", parsedDates);
            console.log("[ProfileSetup] Calculated age:", calculatedClientAge);
          }

          // Create form values object
          const formValues: ClientFormData = createFormValuesFromClientRecord(
            clientRecord,
            userEmail,
            parsedDates,
            calculatedClientAge
          );
          
          // Reset form with values
          form.reset(formValues as ProfileFormValues);
        } else {
          console.warn("[ProfileSetup] No client data could be fetched or created. Form will use defaults.");
          form.reset({ client_email: userEmail || '', ...form.formState.defaultValues } as ProfileFormValues);
        }
        
        // Mark as loaded for this user
        initialDataLoadedForUser.current = userId;
      } catch (error: any) {
        console.error("[ProfileSetup] Exception in fetchAndSetInitialData:", error);
        toast({
          title: "Error Loading Profile",
          description: error.message || "An unexpected error occurred loading your profile.",
          variant: "destructive"
        });
        initialDataLoadedForUser.current = userId;
      } finally {
        setIsFormLoading(false);
      }
    };
    
    // Helper function to fetch client record
    const fetchClientRecord = async (userId: string, userEmail: string | undefined) => {
      // Try to fetch by ID first
      let { data: clientDataArray, error: clientError } = await supabase
        .from('clients').select('*').eq('id', userId).limit(1);

      if (clientError) {
        console.error("[ProfileSetup] Error fetching client data by ID:", clientError);
        toast({
          title: "Profile Error",
          description: `Could not load your profile data. ${clientError.message}`,
          variant: "destructive"
        });
        throw clientError;
      }
      
      let clientRecord = clientDataArray?.[0];

      // If not found by ID, try by email
      if (!clientRecord && userEmail) {
        console.log("[ProfileSetup] No client found by ID, trying by email:", userEmail);
        const { data: emailDataArray, error: emailFetchError } = await supabase
          .from('clients').select('*').eq('client_email', userEmail).limit(1);
          
        if (emailFetchError) {
          console.error("[ProfileSetup] Error fetching client data by email:", emailFetchError);
        } else if (emailDataArray && emailDataArray.length > 0) {
          clientRecord = emailDataArray[0];
          console.log("[ProfileSetup] Found client by email:", clientRecord);
          if(clientRecord.id !== userId) clientRecord = undefined;
        }
      }

      // If still not found, create a new record
      if (!clientRecord) {
        console.log("[ProfileSetup] No client record found for auth user ID, creating new one for user:", userId);
        const { data: newClientArray, error: insertError } = await supabase
          .from('clients').insert([{ id: userId, client_email: userEmail }]).select().limit(1);
          
        if (insertError) {
          console.error("[ProfileSetup] Error creating new client record:", insertError);
          toast({
            title: "Profile Error",
            description: `Failed to create your profile. ${insertError.message}`,
            variant: "destructive"
          });
          throw insertError;
        }
        
        clientRecord = newClientArray?.[0];
        console.log("[ProfileSetup] Created new client record:", clientRecord);
      }
      
      return clientRecord;
    };
    
    // Helper function to create form values from client record
    const createFormValuesFromClientRecord = (
      clientRecord: any,
      userEmail: string | undefined,
      parsedDates: any,
      calculatedClientAge: number | null
    ): ClientFormData => {
      return {
        client_first_name: clientRecord.client_first_name || '',
        client_preferred_name: clientRecord.client_preferred_name || '',
        client_last_name: clientRecord.client_last_name || '',
        client_email: clientRecord.client_email || userEmail || '',
        client_phone: clientRecord.client_phone || '',
        client_relationship: clientRecord.client_relationship || '',
        client_date_of_birth: parsedDates.dob,
        client_age: clientRecord.client_age ?? calculatedClientAge,
        client_gender: clientRecord.client_gender || '',
        client_gender_identity: clientRecord.client_gender_identity || '',
        client_state: clientRecord.client_state || '',
        client_address: clientRecord.client_address || '', // Added address field
        client_city: clientRecord.client_city || '', // Added city field 
        client_zip_code: clientRecord.client_zip_code || '', // Added zip code field
        client_time_zone: clientRecord.client_time_zone || '',
        client_vacoverage: clientRecord.client_vacoverage || '',
        client_champva: clientRecord.client_champva || '',
        client_other_insurance: clientRecord.client_other_insurance || '',
        client_champva_agreement: clientRecord.client_champva_agreement || false,
        client_mental_health_referral: clientRecord.client_mental_health_referral || '',
        client_branchOS: clientRecord.client_branchOS || '',
        client_recentdischarge: parsedDates.recentDischarge,
        client_disabilityrating: clientRecord.client_disabilityrating || '',
        client_tricare_beneficiary_category: clientRecord.client_tricare_beneficiary_category || '',
        client_tricare_sponsor_name: clientRecord.client_tricare_sponsor_name || '',
        client_tricare_sponsor_branch: clientRecord.client_tricare_sponsor_branch || '',
        client_tricare_sponsor_id: clientRecord.client_tricare_sponsor_id || '',
        client_tricare_plan: clientRecord.client_tricare_plan || '',
        client_tricare_region: clientRecord.client_tricare_region || '',
        client_tricare_policy_id: clientRecord.client_tricare_policy_id || '',
        client_tricare_has_referral: clientRecord.client_tricare_has_referral || '',
        client_tricare_referral_number: clientRecord.client_tricare_referral_number || '',
        client_tricare_insurance_agreement: clientRecord.client_tricare_insurance_agreement || false,
        client_veteran_relationship: clientRecord.client_veteran_relationship || '',
        client_situation_explanation: clientRecord.client_situation_explanation || '',
        client_insurance_company_primary: clientRecord.client_insurance_company_primary || '',
        client_insurance_type_primary: clientRecord.client_insurance_type_primary || '',
        client_subscriber_name_primary: clientRecord.client_subscriber_name_primary || '',
        client_subscriber_relationship_primary: clientRecord.client_subscriber_relationship_primary || '',
        client_subscriber_dob_primary: parsedDates.subscriberDobPrimary,
        client_group_number_primary: clientRecord.client_group_number_primary || '',
        client_policy_number_primary: clientRecord.client_policy_number_primary || '',
        client_insurance_company_secondary: clientRecord.client_insurance_company_secondary || '',
        client_insurance_type_secondary: clientRecord.client_insurance_type_secondary || '',
        client_subscriber_name_secondary: clientRecord.client_subscriber_name_secondary || '',
        client_subscriber_relationship_secondary: clientRecord.client_subscriber_relationship_secondary || '',
        client_subscriber_dob_secondary: parsedDates.subscriberDobSecondary,
        client_group_number_secondary: clientRecord.client_group_number_secondary || '',
        client_policy_number_secondary: clientRecord.client_policy_number_secondary || '',
        hasMoreInsurance: clientRecord.hasMoreInsurance || '',
        client_has_even_more_insurance: clientRecord.client_has_even_more_insurance || '',
        client_self_goal: clientRecord.client_self_goal || '',
        client_referral_source: clientRecord.client_referral_source || '',
      };
    };
    
    fetchAndSetInitialData();
  }, [userId, isLoading, authInitialized, form.reset, toast, user?.email]);

  const navigateToStep = (nextStep: number) => { 
    setNavigationHistory(prev => [...prev, nextStep]);
    setCurrentStep(nextStep);
  };

  const handleConfirmIdentity = async () => { 
    const isValid = await form.trigger(["client_first_name", "client_last_name", "client_preferred_name", "client_email", "client_phone", "client_relationship"]);
    if (!isValid) { toast({ title: "Validation Error", description: "Please ensure all required fields in Step 1 are filled correctly.", variant: "destructive" }); return; }
    if (!clientId) { toast({ title: "Error", description: "No client record found. Please contact support.", variant: "destructive" }); return; }
    const values = form.getValues();
    try {
      const { error } = await supabase.from('clients').update({
        client_first_name: values.client_first_name, client_last_name: values.client_last_name,
        client_preferred_name: values.client_preferred_name, client_email: values.client_email,
        client_phone: values.client_phone, client_relationship: values.client_relationship
      }).eq('id', clientId);
      if (error) throw error;
      toast({ title: "Personal information saved", description: "Your identity details have been updated." });
      if (refreshUserData) await refreshUserData(); 
      navigateToStep(2);
    } catch (error: any) { console.error("[ProfileSetup] Error saving identity data:", error); toast({ title: "Error saving data", description: error.message, variant: "destructive" }); }
  };

  const handleGoBack = () => { 
     if (navigationHistory.length > 1) {
      const newHistory = [...navigationHistory];
      newHistory.pop();
      const previousStep = newHistory[newHistory.length - 1];
      setNavigationHistory(newHistory);
      setCurrentStep(previousStep);
    }
  };

  const handleOtherInsuranceChange = (value: string) => { 
    setOtherInsurance(value);
    form.setValue('hasMoreInsurance', value); 
  };

  const handleNext = async () => { 
    const values = form.getValues();
    const vaCoverage = values.client_vacoverage;
    
    let saveError = false;
    let dataSaved = false;

    if (currentStep === 2) {
      const isStep2Valid = await form.trigger(["client_date_of_birth", "client_gender", "client_gender_identity", "client_state", "client_address", "client_city", "client_zip_code", "client_time_zone", "client_vacoverage"]);
      if (!isStep2Valid) { toast({ title: "Validation Error", description: "Please complete all fields in Step 2.", variant: "destructive" }); return; }
      if (clientId) {
        const dob = values.client_date_of_birth;
        const age = calculateAge(dob); 
        console.log(`[ProfileSetup] Step 2 Save - Calculated age: ${age} for DOB: ${dob}`);
        
        // Use our utility for consistent date formatting
        const formattedDateOfBirth = formatDateForDB(dob);
        console.log(`[ProfileSetup] Step 2 Save - Formatted DOB for DB: ${formattedDateOfBirth}`);
        
        // Get time zone value and ensure it's the IANA value
        const timeZoneValue = values.client_time_zone;
        console.log(`[ProfileSetup] Step 2 Save - Original time zone value: ${timeZoneValue}`);
        
        // If it's a label, convert to IANA value
        let ianaTimeZone = timeZoneValue;
        const tzOption = customTimezoneOptions.find(tz => tz.label === timeZoneValue);
        if (tzOption) {
          ianaTimeZone = tzOption.value;
          console.log(`[ProfileSetup] Step 2 Save - Converted time zone to IANA: ${ianaTimeZone}`);
        }
        
        try {
          const { error } = await supabase.from('clients').update({
              client_date_of_birth: formattedDateOfBirth, 
              client_age: age, 
              client_gender: values.client_gender, 
              client_gender_identity: values.client_gender_identity, 
              client_state: values.client_state,
              client_address: values.client_address, // Added address field
              client_city: values.client_city, // Added city field 
              client_zip_code: values.client_zip_code, // Added zip code field
              client_time_zone: ianaTimeZone, // Save the IANA value
              client_vacoverage: values.client_vacoverage
            }).eq('id', clientId);
          if (error) throw error;
          toast({ title: "Information saved", description: "Your demographic information has been updated." });
          dataSaved = true;
        } catch (e: any) { saveError = true; console.error("[ProfileSetup] Error saving step 2 data:", e); toast({ title: "Error saving data", description: e.message, variant: "destructive" }); }
      } else { console.warn("[ProfileSetup] Step 2: ClientId not available, data not saved."); }
      if (!saveError) { if (dataSaved && refreshUserData) await refreshUserData(); navigateToStep(3); }
    } else if (currentStep === 3) {
        if (clientId) { 
            let step3Data: Record<string, any> = {};
            
            if (vaCoverage === "CHAMPVA") {
              step3Data.client_champva = values.client_champva;
            }
            
            if (vaCoverage === "TRICARE") {  
              step3Data = { 
                ...step3Data, 
                client_tricare_beneficiary_category: values.client_tricare_beneficiary_category, 
                client_tricare_sponsor_name: values.client_tricare_sponsor_name, 
                client_tricare_sponsor_branch: values.client_tricare_sponsor_branch, 
                client_tricare_sponsor_id: values.client_tricare_sponsor_id, 
                client_tricare_plan: values.client_tricare_plan, 
                client_tricare_region: values.client_tricare_region, 
                client_tricare_policy_id: values.client_tricare_policy_id, 
                client_tricare_has_referral: values.client_tricare_has_referral, 
                client_tricare_referral_number: values.client_tricare_referral_number 
              }; 
            }
            
            if (vaCoverage === "None - I am a veteran") { 
              // Format the discharge date properly
              const recentDischargeDate = values.client_recentdischarge;
              const formattedDischargeDate = formatDateForDB(recentDischargeDate);
              
              console.log(`[ProfileSetup] Step 3 Save - Veteran discharge date:`, {
                original: recentDischargeDate,
                formatted: formattedDischargeDate
              });
              
              step3Data = { 
                ...step3Data, 
                client_branchOS: values.client_branchOS,
                client_recentdischarge: formattedDischargeDate, // Use the formatted string here
                client_disabilityrating: values.client_disabilityrating 
              }; 
            }
            
            if (vaCoverage === "None - I am not a veteran") { 
              step3Data = { 
                ...step3Data, 
                client_veteran_relationship: values.client_veteran_relationship, 
                client_situation_explanation: values.client_situation_explanation 
              }; 
            }

            if (Object.keys(step3Data).length > 0) {
                try { 
                  console.log("[ProfileSetup] Saving step 3 data:", step3Data);
                  const { error } = await supabase.from('clients').update(step3Data).eq('id', clientId); 
                  if (error) throw error; 
                  toast({ title: "Information Saved", description: "Insurance details updated."}); 
                  dataSaved = true;
                }
                catch(e: any) { saveError = true; console.error("[ProfileSetup] Error saving step 3 data:", e); toast({ title: "Save Error", description: `Could not save insurance details. ${e.message}`, variant: "destructive"});}
            } else { dataSaved = true; }
        }
        if (!saveError) { 
            if (dataSaved && refreshUserData) await refreshUserData();
            if (vaCoverage === "TRICARE" && otherInsurance === "No") navigateToStep(6);
            else if (otherInsurance === "Yes" && (vaCoverage === "TRICARE" || vaCoverage === "CHAMPVA")) navigateToStep(4);
            else navigateToStep(6);
        }
    } else if (currentStep === 4) {
        if (clientId) {
            try {
              // Format the subscriber DOB properly
              const formattedSubscriberDob = formatDateForDB(values.client_subscriber_dob_primary);
              console.log("[ProfileSetup] Formatted primary subscriber DOB:", formattedSubscriberDob);
              
              const { error } = await supabase.from('clients').update({
                client_insurance_company_primary: values.client_insurance_company_primary,
                client_insurance_type_primary: values.client_insurance_type_primary,
                client_subscriber_name_primary: values.client_subscriber_name_primary,
                client_subscriber_relationship_primary: values.client_subscriber_relationship_primary,
                client_subscriber_dob_primary: formattedSubscriberDob,
                client_group_number_primary: values.client_group_number_primary,
                client_policy_number_primary: values.client_policy_number_primary
              }).eq('id', clientId);
              
              if (error) throw error;
              toast({ title: "Information Saved", description: "Primary insurance details updated."});
              dataSaved = true;
            } catch(e: any) {
              saveError = true;
              console.error("[ProfileSetup] Error saving step 4 data:", e);
              toast({ title: "Save Error", description: `Could not save primary insurance details. ${e.message}`, variant: "destructive"});
            }
        }
        if (!saveError) {
          if (dataSaved && refreshUserData) await refreshUserData();
          if (form.getValues('hasMoreInsurance') === "Yes") navigateToStep(5);
          else navigateToStep(6);
        }
    } else if (currentStep === 5) {
        if (clientId) {
            try {
              // Format the secondary subscriber DOB properly  
              const formattedSubscriberDobSecondary = formatDateForDB(values.client_subscriber_dob_secondary);
              console.log("[ProfileSetup] Formatted secondary subscriber DOB:", formattedSubscriberDobSecondary);
              
              const { error } = await supabase.from('clients').update({
                client_insurance_company_secondary: values.client_insurance_company_secondary,
                client_insurance_type_secondary: values.client_insurance_type_secondary,
                client_subscriber_name_secondary: values.client_subscriber_name_secondary,
                client_subscriber_relationship_secondary: values.client_subscriber_relationship_secondary,
                client_subscriber_dob_secondary: formattedSubscriberDobSecondary,
                client_group_number_secondary: values.client_group_number_secondary,
                client_policy_number_secondary: values.client_policy_number_secondary
              }).eq('id', clientId);
              
              if (error) throw error;
              toast({ title: "Information Saved", description: "Secondary insurance details updated."});
              dataSaved = true;
            } catch(e: any) {
              saveError = true;
              console.error("[ProfileSetup] Error saving step 5 data:", e);
              toast({ title: "Save Error", description: `Could not save secondary insurance details. ${e.message}`, variant: "destructive"});
            }
        }
        if (!saveError) {
          if (dataSaved && refreshUserData) await refreshUserData();
          navigateToStep(6);
        }
    } else if (currentStep === 6) {
      handleSubmit();
    }
  };

  const handleSubmit = async () => { 
    const values = form.getValues(); 
    if (!clientId) { toast({ title: "Error", description: "No client record found. Please contact support.", variant: "destructive" }); return; }
    try {
      const { error } = await supabase.from('clients').update({
          client_self_goal: values.client_self_goal || null, 
          client_referral_source: values.client_referral_source || null,
          client_status: 'Profile Complete', // Change status from "New" to "Profile Complete"
          client_is_profile_complete: true 
        }).eq('id', clientId);
      if (error) throw error; 
      console.log("[ProfileSetup] Profile completed successfully in DB. Refreshing auth context...");
      await refreshUserData(); 
      toast({ title: "Profile complete!", description: "Your information has been saved. Redirecting...", });
      console.log("[ProfileSetup] Navigating to /therapist-selection");
      navigate('/therapist-selection');
    } catch (error: any) { console.error("[ProfileSetup] Error updating profile (final step) or refreshing context:", error); toast({ title: "Error updating profile", description: error.message || "An unexpected error occurred.", variant: "destructive" }); }
  };

  const renderStepOne = () => { 
    const { formState } = form; const isStep1Valid = formState.isValid; 
    return ( <Form {...form}><div className="space-y-6"><div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <FormFieldWrapper control={form.control} name="client_first_name" label="First Name" required={true} />
            <FormFieldWrapper control={form.control} name="client_last_name" label="Last Name" required={true} />
            <FormFieldWrapper control={form.control} name="client_preferred_name" label="Preferred Name (optional)" />
            <FormFieldWrapper control={form.control} name="client_email" label="Email" type="email" readOnly={true} required={true} />
            <FormFieldWrapper control={form.control} name="client_phone" label="Phone" type="tel" required={true} />
            <FormFieldWrapper
              control={form.control} name="client_relationship"
              label="What is your relationship with the patient?" type="select"
              options={["Self", "Parent/Guardian", "Spouse", "Child", "Other"]} required={true}
              onValueCommit={(value) => handleImmediateSave('client_relationship' as keyof ProfileFormValues, value)}
            />
        </div><div className="flex justify-center mt-8">
            {isFormLoading ? ( <Button type="button" size="lg" disabled className="bg-valorwell-600 hover:bg-valorwell-700 text-white font-medium py-2 px-8 rounded-md flex items-center gap-2">Loading profile...</Button>
            ) : ( <Button type="button" size="lg" onClick={handleConfirmIdentity} disabled={!isStep1Valid} className="bg-valorwell-600 hover:bg-valorwell-700 text-white font-medium py-2 px-8 rounded-md flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"> <Check className="h-5 w-5" /> I confirm that this is me </Button> )}
        </div></div></Form>
    );
  };
  const renderStepTwo = () => { 
    const { formState } = form; const isStep2Valid = formState.isValid; 
    return ( <Form {...form}><div className="space-y-6"><div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <DateField control={form.control} name="client_date_of_birth" label="Date of Birth" required={true}/>
            
            <FormFieldWrapper 
              control={form.control} 
              name="client_gender" 
              label="Birth Gender" 
              type="select" 
              options={["Male", "Female", "Prefer not to say"]} 
              required={true}
              onValueCommit={(name, value) => handleImmediateSave(name as keyof ProfileFormValues, value)}
            />
            
            <FormFieldWrapper 
              control={form.control} 
              name="client_gender_identity" 
              label="Gender Identity" 
              type="select" 
              options={["Male", "Female", "Non-binary", "Transgender", "Prefer not to say", "Other"]} 
              required={true}
              onValueCommit={(name, value) => handleImmediateSave(name as keyof ProfileFormValues, value)}
            />
            
            {/* Address Section - Added new fields */}
            <FormFieldWrapper 
              control={form.control} 
              name="client_address" 
              label="Street Address" 
              required={true}
              onValueCommit={(name, value) => handleImmediateSave(name as keyof ProfileFormValues, value)}
            />
            
            <FormFieldWrapper 
              control={form.control} 
              name="client_city" 
              label="City" 
              required={true}
              onValueCommit={(name, value) => handleImmediateSave(name as keyof ProfileFormValues, value)}
            />
            
            <FormFieldWrapper 
              control={form.control} 
              name="client_state" 
              label="State" 
              type="select" 
              options={[
                "Alabama", "Alaska", "Arizona", "Arkansas", "California", "Colorado", 
                "Connecticut", "Delaware", "Florida", "Georgia", "Hawaii", "Idaho", 
                "Illinois", "Indiana", "Iowa", "Kansas", "Kentucky", "Louisiana", 
                "Maine", "Maryland", "Massachusetts", "Michigan", "Minnesota", 
                "Mississippi", "Missouri", "Montana", "Nebraska", "Nevada", 
                "New Hampshire", "New Jersey", "New Mexico", "New York", 
                "North Carolina", "North Dakota", "Ohio", "Oklahoma", "Oregon", 
                "Pennsylvania", "Rhode Island", "South Carolina", "South Dakota", 
                "Tennessee", "Texas", "Utah", "Vermont", "Virginia", "Washington", 
                "West Virginia", "Wisconsin", "Wyoming"
              ]} 
              required={true}
              onValueCommit={(name, value) => handleImmediateSave(name as keyof ProfileFormValues, value)}
            />
            
            <FormFieldWrapper 
              control={form.control} 
              name="client_zip_code" 
              label="ZIP Code" 
              required={true}
              onValueCommit={(name, value) => handleImmediateSave(name as keyof ProfileFormValues, value)}
            />
            
            {/* Updated Time Zone field with custom US-only timezone options */}
            <FormFieldWrapper 
              control={form.control} 
              name="client_time_zone" 
              label="Time Zone" 
              type="select" 
              options={customTimezoneOptions.map(tz => tz.label)} 
              valueMapper={(label) => {
                // Convert label to IANA value
                const option = customTimezoneOptions.find(tz => tz.label === label);
                const value = option ? option.value : '';
                console.log(`[ProfileSetup] Time zone valueMapper - label: ${label}, mapped to: ${value}`);
                return value;
              }} 
              labelMapper={(value) => {
                // Convert IANA value to label
                const option = customTimezoneOptions.find(tz => tz.value === value);
                const label = option ? option.label : value;
                console.log(`[ProfileSetup] Time zone labelMapper - value: ${value}, mapped to: ${label}`);
                return label;
              }} 
              required={true}
              onValueCommit={(name, value) => {
                console.log(`[ProfileSetup] Time zone onValueCommit with value: ${value}`);
                handleImmediateSave(name as keyof ProfileFormValues, value);
              }}
            />
            
            <FormFieldWrapper 
              control={form.control} 
              name="client_vacoverage" 
              label="What type of VA Coverage do you have?" 
              type="select" 
              options={["CHAMPVA", "TRICARE", "VA Community Care", "None - I am a veteran", "None - I am not a veteran"]} 
              required={true}
              onValueCommit={(name, value) => handleImmediateSave(name as keyof ProfileFormValues, value)}
            />
        </div><div className="flex justify-between mt-8"> <Button type="button" variant="outline" onClick={handleGoBack} className="flex items-center gap-2"> <ArrowLeft className="h-4 w-4" /> Back </Button> <Button type="button" onClick={handleNext} disabled={!isStep2Valid} className="bg-valorwell-600 hover:bg-valorwell-700 text-white font-medium py-2 px-8 rounded-md flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"> Next <ArrowRight className="h-4 w-4" /> </Button> </div></div></Form> );
  };
  const renderStepThree = () => { 
    const vaCoverage = form.watch('client_vacoverage');
    return ( <Form {...form}><div className="space-y-6">
            {vaCoverage === 'CHAMPVA' && ( <SignupChampva form={form} onOtherInsuranceChange={handleOtherInsuranceChange}/> )}
            {vaCoverage === 'TRICARE' && ( <SignupTricare form={form} onOtherInsuranceChange={handleOtherInsuranceChange}/> )}
            {vaCoverage === 'VA Community Care' && ( <SignupVaCcn form={form} /> )}
            {vaCoverage === 'None - I am a veteran' && ( <SignupVeteran form={form} /> )}
            {vaCoverage === 'None - I am not a veteran' && ( <SignupNotAVeteran form={form} /> )}
        <div className="flex justify-between mt-8"> <Button type="button" variant="outline" onClick={handleGoBack} className="flex items-center gap-2"> <ArrowLeft className="h-4 w-4" /> Back </Button> <Button type="button" onClick={handleNext} className="bg-valorwell-600 hover:bg-valorwell-700 text-white font-medium py-2 px-8 rounded-md flex items-center gap-2"> Next <ArrowRight className="h-4 w-4" /> </Button> </div></div></Form> );
  };
  const renderStepFour = () => { 
    return ( <Form {...form}><div className="space-y-6"> <AdditionalInsurance form={form} onOtherInsuranceChange={handleOtherInsuranceChange} /> <div className="flex justify-between mt-8"> <Button type="button" variant="outline" onClick={handleGoBack} className="flex items-center gap-2"> <ArrowLeft className="h-4 w-4" /> Back </Button> <Button type="button" onClick={handleNext} className="bg-valorwell-600 hover:bg-valorwell-700 text-white font-medium py-2 px-8 rounded-md flex items-center gap-2"> Next <ArrowRight className="h-4 w-4" /> </Button> </div></div></Form> );
  };
  const renderStepFive = () => { 
    return ( <Form {...form}><div className="space-y-6"> <MoreAdditionalInsurance form={form} /> <div className="flex justify-between mt-8"> <Button type="button" variant="outline" onClick={handleGoBack} className="flex items-center gap-2"> <ArrowLeft className="h-4 w-4" /> Back </Button> <Button type="button" onClick={handleNext} className="bg-valorwell-600 hover:bg-valorwell-700 text-white font-medium py-2 px-8 rounded-md flex items-center gap-2"> Next <ArrowRight className="h-4 w-4" /> </Button> </div></div></Form> );
  };
  const renderStepSix = () => { 
    return ( <Form {...form}><div className="space-y-6"> <SignupLast form={form} /> <div className="flex justify-between mt-8"> <Button type="button" variant="outline" onClick={handleGoBack} className="flex items-center gap-2"> <ArrowLeft className="h-4 w-4" /> Back </Button> <Button type="button" onClick={handleSubmit} className="bg-valorwell-600 hover:bg-valorwell-700 text-white font-medium py-2 px-8 rounded-md flex items-center gap-2"> Complete Profile </Button> </div></div></Form> );
  };

  return (
    <Layout>
      <div className="max-w-5xl mx-auto">
        <Card className="border-valorwell-200 shadow-xl">
          <CardHeader className="bg-gradient-to-r from-valorwell-500 to-valorwell-600 text-white rounded-t-lg p-6">
            <CardTitle className="text-xl sm:text-2xl font-semibold">Profile Setup</CardTitle>
            <CardDescription className="text-valorwell-50">Tell us about yourself to get started</CardDescription>
          </CardHeader>
          <CardContent className="p-6 sm:p-8">
            <div className="mb-6">
              <div className="flex justify-between mb-2">
                <span className="text-sm text-valorwell-700">Step {currentStep} of 6</span>
                <span className="text-sm text-valorwell-700">{Math.round((currentStep / 6) * 100)}% Complete</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2.5">
                <div 
                  className="bg-valorwell-600 h-2.5 rounded-full" 
                  style={{ width: `${(currentStep / 6) * 100}%` }}
                ></div>
              </div>
            </div>
            
            {authError ? (
              <div className="flex justify-center items-center py-12">
                <div className="text-center bg-red-50 p-6 rounded-lg border border-red-200 max-w-md">
                  <div className="text-red-500 mb-4 flex justify-center">
                    <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="12" cy="12" r="10"></circle>
                      <line x1="12" y1="8" x2="12" y2="12"></line>
                      <line x1="12" y1="16" x2="12.01" y2="16"></line>
                    </svg>
                  </div>
                  <h3 className="text-xl font-medium text-red-800 mb-2">Authentication Error</h3>
                  <p className="text-red-600 mb-6">{authError}</p>
                  <button
                    onClick={() => window.location.reload()}
                    className="px-4 py-2 bg-valorwell-600 text-white rounded-md hover:bg-valorwell-700 transition-colors"
                  >
                    Refresh Page
                  </button>
                </div>
              </div>
            ) : isFormLoading ? (
              <div className="flex justify-center items-center py-12">
                <div className="text-center">
                  <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-valorwell-600 mx-auto mb-4"></div>
                  <p className="text-valorwell-700 mb-2">
                    {!authInitialized
                      ? "Initializing authentication..."
                      : isLoading
                        ? "Loading user data..."
                        : "Loading your profile information..."}
                  </p>
                  {loadingTimeout && (
                    <p className="text-sm text-amber-600">
                      This is taking longer than expected. Please wait...
                    </p>
                  )}
                </div>
              </div>
            ) : (
              <>
                {currentStep === 1 && renderStepOne()}
                {currentStep === 2 && renderStepTwo()}
                {currentStep === 3 && renderStepThree()}
                {currentStep === 4 && renderStepFour()}
                {currentStep === 5 && renderStepFive()}
                {currentStep === 6 && renderStepSix()}
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
};

export default ProfileSetup;
