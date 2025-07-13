import React, { useState, useEffect } from 'react';
import { useAuth } from '@/context/NewAuthContext';
import { useForm } from 'react-hook-form';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import MyInsurance from '@/components/patient/MyInsurance';
import { ClientDetails } from '@/types/client';

const insuranceTypes = ["PPO", "HMO", "EPO", "POS", "Medicare", "Medicaid", "CHIP", "TRICARE", "Other"];
const relationshipTypes = ["Self", "Spouse", "Child", "Other"];

const InsuranceTab = () => {
  const { clientProfile, isLoading, userId } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  
  // Debug: Log client profile data
  useEffect(() => {
    if (clientProfile) {
      console.log("InsuranceTab - Client profile loaded:", {
        insurance_company: clientProfile.client_insurance_company_primary,
        insurance_type: clientProfile.client_insurance_type_primary,
        policy_number: clientProfile.client_policy_number_primary
      });
    }
  }, [clientProfile]);
  
  // Set up form
  const form = useForm<ClientDetails>({
    defaultValues: {
      ...clientProfile
    }
  });
  
  // Update form when client profile data changes
  useEffect(() => {
    if (clientProfile) {
      form.reset(clientProfile);
      console.log("Form reset with client profile data", form.getValues());
      console.log("Insurance type primary:", clientProfile.client_insurance_type_primary);
    }
  }, [clientProfile, form]);
  
  // Handle saving profile data
  const handleSaveProfile = async () => {
    try {
      setIsSaving(true);
      
      const formValues = form.getValues();
      console.log("Saving insurance data:", formValues);
      console.log("Insurance type being saved:", formValues.client_insurance_type_primary);
      
      const { error } = await supabase
        .from('clients')
        .update({
          // Insurance-related fields only
          client_insurance_company_primary: formValues.client_insurance_company_primary,
          client_insurance_type_primary: formValues.client_insurance_type_primary,
          client_policy_number_primary: formValues.client_policy_number_primary,
          client_group_number_primary: formValues.client_group_number_primary,
          client_subscriber_name_primary: formValues.client_subscriber_name_primary,
          client_subscriber_relationship_primary: formValues.client_subscriber_relationship_primary,
          client_subscriber_dob_primary: formValues.client_subscriber_dob_primary,
          
          client_insurance_company_secondary: formValues.client_insurance_company_secondary,
          client_insurance_type_secondary: formValues.client_insurance_type_secondary,
          client_policy_number_secondary: formValues.client_policy_number_secondary,
          client_group_number_secondary: formValues.client_group_number_secondary,
          client_subscriber_name_secondary: formValues.client_subscriber_name_secondary,
          client_subscriber_relationship_secondary: formValues.client_subscriber_relationship_secondary,
          client_subscriber_dob_secondary: formValues.client_subscriber_dob_secondary,
          
          client_insurance_company_tertiary: formValues.client_insurance_company_tertiary,
          client_insurance_type_tertiary: formValues.client_insurance_type_tertiary,
          client_policy_number_tertiary: formValues.client_policy_number_tertiary,
          client_group_number_tertiary: formValues.client_group_number_tertiary,
          client_subscriber_name_tertiary: formValues.client_subscriber_name_tertiary,
          client_subscriber_relationship_tertiary: formValues.client_subscriber_relationship_tertiary,
          client_subscriber_dob_tertiary: formValues.client_subscriber_dob_tertiary,
          
          client_vacoverage: formValues.client_vacoverage,
          client_champva: formValues.client_champva,
          client_tricare_beneficiary_category: formValues.client_tricare_beneficiary_category,
          client_tricare_sponsor_name: formValues.client_tricare_sponsor_name,
          client_tricare_sponsor_branch: formValues.client_tricare_sponsor_branch,
          client_tricare_sponsor_id: formValues.client_tricare_sponsor_id,
          client_tricare_plan: formValues.client_tricare_plan,
          client_tricare_region: formValues.client_tricare_region,
          client_tricare_policy_id: formValues.client_tricare_policy_id,
          client_tricare_has_referral: formValues.client_tricare_has_referral,
          client_tricare_referral_number: formValues.client_tricare_referral_number
        })
        .eq('id', userId);
        
      if (error) {
        throw new Error(error.message);
      }
      
      toast.success("Insurance information updated successfully");
      setIsEditing(false);
    } catch (error) {
      console.error("Error saving insurance data:", error);
      toast.error("Failed to update insurance information");
    } finally {
      setIsSaving(false);
    }
  };
  
  // Handle cancel edit
  const handleCancelEdit = () => {
    form.reset(clientProfile);
    setIsEditing(false);
  };

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-semibold">My Insurance</h2>
      
      {isLoading ? (
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : (
        <MyInsurance 
          clientData={clientProfile}
          loading={isLoading}
          isEditing={isEditing}
          setIsEditing={setIsEditing}
          form={form}
          isSaving={isSaving}
          handleSaveProfile={handleSaveProfile}
          handleCancelEdit={handleCancelEdit}
          insuranceTypes={insuranceTypes}
          relationshipTypes={relationshipTypes}
        />
      )}
    </div>
  );
};

export default InsuranceTab;