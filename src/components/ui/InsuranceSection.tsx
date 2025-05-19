
import React from 'react';
import { FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon, Shield } from "lucide-react";
import { cn } from "@/lib/utils";
import { UseFormReturn } from "react-hook-form";

interface InsuranceSectionProps {
  title: string;
  prefix: string;
  form: UseFormReturn<any>;
  isEditing: boolean;
  insuranceTypes: string[];
  relationshipTypes: string[];
}

const InsuranceSection: React.FC<InsuranceSectionProps> = ({
  title,
  prefix,
  form,
  isEditing,
  insuranceTypes,
  relationshipTypes
}) => {
  // Determine the suffix based on title
  const getSuffix = () => {
    if (title.includes('Primary')) return '_primary';
    if (title.includes('Secondary')) return '_secondary';
    if (title.includes('Tertiary')) return '_tertiary';
    return '';
  };
  
  const suffix = getSuffix();
  
  // Check if this insurance section has data or if we're in edit mode
  const hasInsuranceData = () => {
    const company = form.getValues(`${prefix}insurance_company${suffix}`);
    const type = form.getValues(`${prefix}insurance_type${suffix}`);
    const policyNumber = form.getValues(`${prefix}policy_number${suffix}`);
    
    // Show section if any insurance data exists or if we're in editing mode
    return !!(company || type || policyNumber) || isEditing;
  };
  
  // Debug log to see what's happening
  console.log(`Insurance ${title} - company: ${form.getValues(`${prefix}insurance_company${suffix}`)}, type: ${form.getValues(`${prefix}insurance_type${suffix}`)}`);
  
  if (!hasInsuranceData()) {
    return null;
  }
  
  return (
    <div className="mb-6 border rounded-lg p-4">
      <h3 className="text-lg font-semibold mb-4 flex items-center">
        <Shield className="h-5 w-5 mr-2 text-valorwell-600" />
        {title}
      </h3>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <FormField
          control={form.control}
          name={`${prefix}insurance_company${suffix}`}
          render={({ field }) => (
            <FormItem>
              <FormLabel>Insurance Company</FormLabel>
              <FormControl>
                <Input {...field} readOnly={!isEditing} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        
        <FormField
          control={form.control}
          name={`${prefix}insurance_type${suffix}`}
          render={({ field }) => (
            <FormItem>
              <FormLabel>Insurance Type</FormLabel>
              <Select
                disabled={!isEditing}
                onValueChange={field.onChange}
                defaultValue={field.value || ""}
                value={field.value || ""}
              >
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {insuranceTypes.map((type) => (
                    <SelectItem key={type} value={type}>
                      {type}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />
        
        <FormField
          control={form.control}
          name={`${prefix}policy_number${suffix}`}
          render={({ field }) => (
            <FormItem>
              <FormLabel>Policy Number</FormLabel>
              <FormControl>
                <Input {...field} readOnly={!isEditing} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        
        <FormField
          control={form.control}
          name={`${prefix}group_number${suffix}`}
          render={({ field }) => (
            <FormItem>
              <FormLabel>Group Number</FormLabel>
              <FormControl>
                <Input {...field} readOnly={!isEditing} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        
        <FormField
          control={form.control}
          name={`${prefix}subscriber_name${suffix}`}
          render={({ field }) => (
            <FormItem>
              <FormLabel>Subscriber Name</FormLabel>
              <FormControl>
                <Input {...field} readOnly={!isEditing} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        
        <FormField
          control={form.control}
          name={`${prefix}subscriber_relationship${suffix}`}
          render={({ field }) => (
            <FormItem>
              <FormLabel>Subscriber Relationship</FormLabel>
              <Select
                disabled={!isEditing}
                onValueChange={field.onChange}
                defaultValue={field.value || ""}
                value={field.value || ""}
              >
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select relationship" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {relationshipTypes.map((relation) => (
                    <SelectItem key={relation} value={relation}>
                      {relation}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />
        
        <FormField
          control={form.control}
          name={`${prefix}subscriber_dob${suffix}`}
          render={({ field }) => (
            <FormItem className="flex flex-col">
              <FormLabel>Subscriber Date of Birth</FormLabel>
              <Popover>
                <PopoverTrigger asChild>
                  <FormControl>
                    <Button
                      variant={"outline"}
                      className={cn(
                        "w-full pl-3 text-left font-normal",
                        !field.value && "text-muted-foreground"
                      )}
                      disabled={!isEditing}
                    >
                      {field.value ? (
                        format(new Date(field.value), "PPP")
                      ) : (
                        <span>Pick a date</span>
                      )}
                      <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                    </Button>
                  </FormControl>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={field.value ? new Date(field.value) : undefined}
                    onSelect={field.onChange}
                    disabled={date =>
                      date > new Date() || date < new Date("1900-01-01")
                    }
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>
    </div>
  );
};

export default InsuranceSection;
