
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from '@/components/ui/checkbox';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import * as z from 'zod';
import { useAuth } from '@/context/NewAuthContext';
import { useToast } from '@/hooks/use-toast';
import { FileText, Save, Calendar } from 'lucide-react';
import { format } from 'date-fns';
import { handleFormSubmission } from '@/utils/formSubmissionUtils';

// Form validation schema
const formSchema = z.object({
  personalStrengths: z.string().optional(),
  hobbies: z.string().optional(),
  educationLevel: z.string().optional(),
  occupationDetails: z.string().optional(),
  sleepHours: z.string().optional(),
  currentIssues: z.string().min(1, { message: "Please describe your current issues" }),
  progressionOfIssues: z.string().optional(),
  relationshipProblems: z.string().optional(),
  counselingGoals: z.string().min(1, { message: "Please describe your counseling goals" }),
  emergencyName: z.string().min(1, { message: "Emergency contact name is required" }),
  emergencyPhone: z.string().min(1, { message: "Emergency contact phone is required" }),
  emergencyRelationship: z.string().min(1, { message: "Emergency contact relationship is required" }),
  signature: z.string().min(1, { message: "Your signature is required" }),
});

type FormData = z.infer<typeof formSchema>;

interface ClientHistoryTemplateProps {
  clientData?: any;
  onClose?: () => void;
  onSubmit?: (data: any) => void;
}

const ClientHistoryTemplate: React.FC<ClientHistoryTemplateProps> = ({ clientData, onClose, onSubmit }) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { userId } = useAuth();
  const { toast } = useToast();
  
  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      personalStrengths: '',
      hobbies: '',
      educationLevel: '',
      occupationDetails: '',
      sleepHours: '',
      currentIssues: '',
      progressionOfIssues: '',
      relationshipProblems: '',
      counselingGoals: '',
      emergencyName: '',
      emergencyPhone: '',
      emergencyRelationship: '',
      signature: '',
    }
  });
  
  // Medical conditions that could be selected
  const medicalConditions = [
    "Anxiety", "Depression", "ADHD", "Insomnia", "Chronic Pain", 
    "High Blood Pressure", "Diabetes", "Thyroid Issues"
  ];
  
  const [selectedConditions, setSelectedConditions] = useState<string[]>([]);
  
  const toggleCondition = (condition: string) => {
    setSelectedConditions(current => 
      current.includes(condition)
        ? current.filter(c => c !== condition)
        : [...current, condition]
    );
  };
  
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
      // Add selected conditions to the form data
      const enrichedData = {
        ...data,
        selectedConditions,
        formElementId: 'client-history-form'
      };
      
      // If the parent component provides onSubmit, use it
      if (onSubmit) {
        onSubmit(enrichedData);
        setIsSubmitting(false);
        return;
      }
      
      // Document info for PDF generation
      const documentInfo = {
        clientId: userId,
        documentType: 'client_history',
        documentDate: new Date(),
        documentTitle: 'Client History Form',
        createdBy: userId // Using userId instead of string 'client'
      };
      
      // Submit the form data
      const result = await handleFormSubmission(
        'client-history-form',
        documentInfo,
        'Client History Form',
        enrichedData
      );
      
      if (result.success) {
        toast({
          title: "Success",
          description: "Your client history has been submitted successfully.",
        });
        
        // Call onClose if provided
        if (onClose) {
          onClose();
        }
      } else {
        throw new Error(result.message || "Unknown error");
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
  
  // Education level options
  const educationLevels = [
    { value: "some-high-school", label: "Some High School" },
    { value: "high-school", label: "High School Graduate" },
    { value: "some-college", label: "Some College" },
    { value: "associates", label: "Associate's Degree" },
    { value: "bachelors", label: "Bachelor's Degree" },
    { value: "masters", label: "Master's Degree" },
    { value: "doctorate", label: "Doctorate or Professional Degree" }
  ];

  return (
    <div className="w-full max-w-5xl mx-auto pb-12" id="client-history-form">
      <Card className="overflow-hidden">
        <CardHeader className="bg-zinc-50 border-b border-zinc-200">
          <CardTitle className="text-2xl flex items-center gap-2">
            <FileText className="h-6 w-6 text-valorwell-600" />
            Client History Form
          </CardTitle>
          <CardDescription>
            Please provide information about your background and treatment goals
          </CardDescription>
        </CardHeader>

        <CardContent className="pt-6">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-medium mb-4">Personal Information</h3>
                  <div className="grid gap-4 md:grid-cols-2">
                    <FormField
                      control={form.control}
                      name="personalStrengths"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Personal Strengths</FormLabel>
                          <FormControl>
                            <Textarea 
                              placeholder="What are your personal strengths?" 
                              {...field}
                              className="resize-none"
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
                          <FormLabel>Hobbies & Interests</FormLabel>
                          <FormControl>
                            <Textarea 
                              placeholder="What do you enjoy doing in your free time?" 
                              {...field}
                              className="resize-none"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  
                  <div className="grid gap-4 md:grid-cols-2 mt-4">
                    <FormField
                      control={form.control}
                      name="educationLevel"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Education Level</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select your education level" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {educationLevels.map(level => (
                                <SelectItem key={level.value} value={level.value}>
                                  {level.label}
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
                      name="occupationDetails"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Occupation</FormLabel>
                          <FormControl>
                            <Input placeholder="Your current occupation" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </div>
                
                <div>
                  <h3 className="text-lg font-medium mb-4">Health Information</h3>
                  <div className="grid gap-4 md:grid-cols-2">
                    <FormField
                      control={form.control}
                      name="sleepHours"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Average Hours of Sleep</FormLabel>
                          <FormControl>
                            <Input 
                              type="number" 
                              placeholder="Hours per night" 
                              min={0} 
                              max={24} 
                              {...field} 
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  
                  <div className="mt-4">
                    <Label className="text-base">Medical Conditions (Select all that apply)</Label>
                    <div className="grid gap-2 md:grid-cols-2 mt-2">
                      {medicalConditions.map(condition => (
                        <div className="flex items-center space-x-2" key={condition}>
                          <Checkbox 
                            id={`condition-${condition}`} 
                            checked={selectedConditions.includes(condition)}
                            onCheckedChange={() => toggleCondition(condition)}
                          />
                          <label
                            htmlFor={`condition-${condition}`}
                            className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                          >
                            {condition}
                          </label>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
                
                <div>
                  <h3 className="text-lg font-medium mb-4">Current Concerns</h3>
                  
                  <FormField
                    control={form.control}
                    name="currentIssues"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Current Issues/Concerns</FormLabel>
                        <FormControl>
                          <Textarea 
                            placeholder="Please describe your current concerns or issues" 
                            {...field}
                            className="h-24 resize-none"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <div className="mt-4">
                    <FormField
                      control={form.control}
                      name="progressionOfIssues"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Progression of Issues</FormLabel>
                          <FormControl>
                            <Textarea 
                              placeholder="How and when did these issues begin or develop?" 
                              {...field}
                              className="h-24 resize-none"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </div>
                
                <div>
                  <h3 className="text-lg font-medium mb-4">Treatment Goals</h3>
                  <FormField
                    control={form.control}
                    name="counselingGoals"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Counseling Goals</FormLabel>
                        <FormControl>
                          <Textarea 
                            placeholder="What do you hope to achieve in counseling?" 
                            {...field}
                            className="h-24 resize-none"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <div className="mt-4">
                    <FormField
                      control={form.control}
                      name="relationshipProblems"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Relationship Issues</FormLabel>
                          <FormControl>
                            <Textarea 
                              placeholder="Any relationship difficulties you'd like to discuss?" 
                              {...field}
                              className="resize-none"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </div>
                
                <div>
                  <h3 className="text-lg font-medium mb-4">Emergency Contact</h3>
                  <div className="grid gap-4 md:grid-cols-3">
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
                            <Input placeholder="Phone number" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="emergencyRelationship"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Relationship</FormLabel>
                          <FormControl>
                            <Input placeholder="Relationship to you" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </div>
                
                <div>
                  <h3 className="text-lg font-medium mb-4">Acknowledgement</h3>
                  
                  <div className="bg-zinc-50 p-4 rounded-md border border-zinc-200 mb-4">
                    <p className="text-sm text-zinc-700">
                      By signing below, I confirm that the information provided in this form 
                      is accurate and complete to the best of my knowledge. I understand that 
                      this information will be used to guide my treatment planning.
                    </p>
                  </div>
                  
                  <div className="grid gap-4 md:grid-cols-2">
                    <FormField
                      control={form.control}
                      name="signature"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Signature</FormLabel>
                          <FormControl>
                            <Input placeholder="Type your full name as signature" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <div>
                      <Label>Date</Label>
                      <div className="flex items-center gap-2 mt-2">
                        <Calendar className="h-4 w-4 text-zinc-500" />
                        <span className="text-zinc-800">{format(new Date(), 'MMMM d, yyyy')}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex justify-end">
                {onClose && (
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={onClose}
                    disabled={isSubmitting}
                    className="mr-2"
                  >
                    Cancel
                  </Button>
                )}
                <Button 
                  type="submit" 
                  disabled={isSubmitting}
                >
                  {isSubmitting ? "Submitting..." : "Submit Client History"}
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
};

export default ClientHistoryTemplate;
