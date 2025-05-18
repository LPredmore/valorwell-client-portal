
import React, { useState, useEffect } from 'react';
import { UseFormReturn } from 'react-hook-form';
import FormFieldWrapper from '@/components/ui/FormFieldWrapper';
import { Separator } from '@/components/ui/separator';
import { DateField } from '@/components/ui/DateField';
import { Card, CardContent } from '@/components/ui/card';

interface AdditionalInsuranceProps {
  form: UseFormReturn<any>;
  onOtherInsuranceChange?: (value: string) => void;
}

const AdditionalInsurance: React.FC<AdditionalInsuranceProps> = ({ form, onOtherInsuranceChange }) => {
  // Watch for changes to the hasMoreInsurance field
  const hasMoreInsurance = form.watch('hasMoreInsurance');
  
  // Call the callback when the value changes
  useEffect(() => {
    if (onOtherInsuranceChange && hasMoreInsurance) {
      onOtherInsuranceChange(hasMoreInsurance);
    }
  }, [hasMoreInsurance, onOtherInsuranceChange]);
  
  return (
    <div className="space-y-6">
      <h3 className="text-lg font-medium">Additional Insurance Information</h3>
      <p className="text-gray-600 mb-4">
        Please provide details about your other insurance coverage.
      </p>

      <Card className="mb-6">
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <FormFieldWrapper
              control={form.control}
              name="client_insurance_company_primary"
              label="Insurance Company Name"
              type="text"
            />
            
            <FormFieldWrapper
              control={form.control}
              name="client_insurance_type_primary"
              label="Insurance Plan Type"
              type="select"
              options={[
                "HMO", 
                "PPO", 
                "EPO", 
                "POS", 
                "HDHP", 
                "HSA", 
                "Medicare Advantage", 
                "Medicare", 
                "Medicaid"
              ]}
            />
            
            <FormFieldWrapper
              control={form.control}
              name="client_subscriber_name_primary"
              label="Subscriber Name"
              type="text"
            />
            
            <FormFieldWrapper
              control={form.control}
              name="client_subscriber_relationship_primary"
              label="Subscriber Relationship"
              type="select"
              options={["Self", "Child", "Spouse", "Other"]}
            />
            
            <DateField
              control={form.control}
              name="client_subscriber_dob_primary"
              label="Subscriber Date of Birth"
            />
            
            <FormFieldWrapper
              control={form.control}
              name="client_group_number_primary"
              label="Group Number"
              type="text"
            />
            
            <FormFieldWrapper
              control={form.control}
              name="client_policy_number_primary"
              label="Policy Number"
              type="text"
            />
          </div>
        </CardContent>
      </Card>
      
      <div className="space-y-6">
        <Separator className="my-4" />
        
        <FormFieldWrapper
          control={form.control}
          name="hasMoreInsurance"  
          label="Do you have any other Insurance you would like to add?"
          type="select"
          options={["Yes", "No"]}
          required={true}
        />
      </div>
    </div>
  );
};

export default AdditionalInsurance;
