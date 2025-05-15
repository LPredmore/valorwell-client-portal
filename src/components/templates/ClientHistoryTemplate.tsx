
import React, { useState, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { useUser } from '@/context/UserContext';
import { handleFormSubmission } from '@/utils/formSubmissionUtils';

// Basic form schema - can be expanded as needed
const formSchema = z.object({
  personalStrengths: z.string().min(1, { message: "Please describe your personal strengths" }),
  hobbies: z.string().optional(),
  educationLevel: z.string().min(1, { message: "Please select your education level" }),
  occupationDetails: z.string().min(1, { message: "Please provide occupation details" }),
  currentIssues: z.string().min(1, { message: "Please describe your current issues" }),
  sleepHours: z.string().min(1, { message: "Please indicate your average sleep hours" }),
  counselingGoals: z.string().min(1, { message: "Please describe your counseling goals" }),
  emergencyName: z.string().min(1, { message: "Emergency contact name is required" }),
  emergencyPhone: z.string().min(10, { message: "Valid emergency phone is required" }),
  emergencyRelationship: z.string().min(1, { message: "Relationship to emergency contact is required" }),
  additionalInfo: z.string().optional(),
  signature: z.string().min(1, { message: "Your signature is required" }),
  date: z.string(),
});

type FormData = z.infer<typeof formSchema>;

interface ClientHistoryTemplateProps {
  clientData?: any;
  onClose?: () => void;
}

const ClientHistoryTemplate: React.FC<ClientHistoryTemplateProps> = ({
  clientData,
  onClose
}) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { userId } = useUser();
  const { toast } = useToast();
  const formRef = useRef<HTMLDivElement>(null);

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      personalStrengths: "",
      hobbies: "",
      educationLevel: "",
      occupationDetails: "",
      currentIssues: "",
      sleepHours: "",
      counselingGoals: "",
      emergencyName: "",
      emergencyPhone: "",
      emergencyRelationship: "",
      additionalInfo: "",
      signature: "",
      date: format(new Date(), 'yyyy-MM-dd')
    }
  });

  const handleSubmit = async (data: FormData) => {
    if (!userId) {
      toast({
        title: "Error",
        description: "User ID not found. Please ensure you are logged in.",
        variant: "destructive"
      });
      return;
    }

    setIsSubmitting(true);
    
    try {
      // Prepare document info for PDF generation
      const documentInfo = {
        clientId: userId,
        documentType: 'client_history',
        documentDate: new Date(),
        documentTitle: 'Client History Form',
        createdBy: userId
      };

      // Use the shared form submission utility
      const result = await handleFormSubmission(
        'client-history-form',
        documentInfo,
        'Client History',
        data
      );

      if (result.success) {
        toast({
          title: "Success",
          description: "Your client history has been submitted successfully.",
        });

        if (onClose) {
          onClose();
        }
      } else {
        toast({
          title: "Error",
          description: result.message || "There was a problem submitting your client history.",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error("Error submitting client history:", error);
      toast({
        title: "Error",
        description: "There was a problem submitting your client history. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const educationLevels = [
    "High School",
    "Some College",
    "Associate's Degree",
    "Bachelor's Degree",
    "Master's Degree",
    "Doctoral Degree",
    "Professional Degree",
    "Other"
  ];

  const sleepOptions = [
    "Less than 4 hours",
    "4-5 hours",
    "6-7 hours",
    "8 hours",
    "More than 8 hours"
  ];

  return (
    <div className="w-full max-w-5xl mx-auto pb-12" id="client-history-form" ref={formRef}>
      <Card>
        <CardHeader className="bg-zinc-50 border-b border-zinc-200">
          <CardTitle className="text-2xl">Client History Form</CardTitle>
          <CardDescription>
            Please complete this form to help us better understand your background and needs
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-6">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
              <div className="space-y-6">
                <h3 className="text-lg font-medium">Personal Information</h3>

                <FormField
                  control={form.control}
                  name="personalStrengths"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>What do you consider to be your personal strengths?</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Describe your personal strengths..."
                          className="min-h-[100px]"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="hobbies"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>What are your interests and hobbies?</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Describe your interests and hobbies..."
                          className="min-h-[100px]"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="educationLevel"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Education Level</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select your education level" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {educationLevels.map((level) => (
                            <SelectItem key={level} value={level}>{level}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="occupationDetails"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Current occupation and work history</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Describe your current job and work history..."
                          className="min-h-[100px]"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="space-y-6">
                <h3 className="text-lg font-medium border-t pt-6">Current Concerns</h3>

                <FormField
                  control={form.control}
                  name="currentIssues"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>What issues are currently troubling you?</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Describe your current issues..."
                          className="min-h-[120px]"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="sleepHours"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>How much sleep do you typically get each night?</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select average sleep hours" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {sleepOptions.map((option) => (
                            <SelectItem key={option} value={option}>{option}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="counselingGoals"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>What are your goals for counseling?</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Describe what you hope to achieve through counseling..."
                          className="min-h-[120px]"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="space-y-6">
                <h3 className="text-lg font-medium border-t pt-6">Emergency Contact</h3>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <FormField
                    control={form.control}
                    name="emergencyName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Emergency Contact Name</FormLabel>
                        <FormControl>
                          <Input placeholder="Full name" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="emergencyPhone"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Emergency Contact Phone</FormLabel>
                        <FormControl>
                          <Input placeholder="Phone number" type="tel" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="emergencyRelationship"
                    render={({ field }) => (
                      <FormItem className="sm:col-span-2">
                        <FormLabel>Relationship to You</FormLabel>
                        <FormControl>
                          <Input placeholder="e.g. Spouse, Parent, Friend" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>

              <FormField
                control={form.control}
                name="additionalInfo"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Additional Information</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Any other information you'd like to share with your therapist..."
                        className="min-h-[100px]"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="space-y-4 border-t pt-6">
                <FormField
                  control={form.control}
                  name="signature"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Electronic Signature</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Type your full legal name"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="date"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Date</FormLabel>
                      <FormControl>
                        <div className="flex items-center gap-2">
                          <span className="text-zinc-800">{format(new Date(), 'MMMM d, yyyy')}</span>
                        </div>
                      </FormControl>
                    </FormItem>
                  )}
                />
              </div>

              <CardFooter className="flex justify-end px-0 pb-0">
                <Button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full md:w-auto"
                >
                  {isSubmitting ? "Submitting..." : "Submit Client History"}
                </Button>
              </CardFooter>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
};

export default ClientHistoryTemplate;
