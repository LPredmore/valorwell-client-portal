import React, { useState, useRef } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Video, Shield, AlertTriangle, Calendar, FileText, Check } from 'lucide-react';
import { format } from 'date-fns';
import { useUser } from '@/context/UserContext';
import { useNavigate } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';
import { handleFormSubmission } from '@/utils/formSubmissionUtils';
import { supabase } from '@/integrations/supabase/client';

// Form validation schema
const formSchema = z.object({
  signature: z.string().min(1, { message: "Your signature is required" }),
  date: z.string(),
});

type FormData = z.infer<typeof formSchema>;

interface InformedConsentTemplateProps {
  clientData?: any;
  onClose?: () => void;
}

const InformedConsentTemplate: React.FC<InformedConsentTemplateProps> = ({ 
  clientData,
  onClose 
}) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { userId } = useUser();
  const navigate = useNavigate();
  const { toast } = useToast();
  const formRef = useRef<HTMLDivElement>(null);

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
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
      // Prepare document data for PDF generation
      const documentData = {
        ...data,
        clientName: clientData?.client_first_name && clientData?.client_last_name 
          ? `${clientData.client_first_name} ${clientData.client_last_name}` 
          : "Client",
        signatureDate: format(new Date(), 'MMMM d, yyyy')
      };

      // Create document info for PDF generation
      const documentInfo = {
        clientId: userId,
        documentType: 'informed_consent',
        documentDate: new Date(),
        documentTitle: 'Informed Consent for Telehealth Services',
        createdBy: userId
      };

      // Use the shared form submission utility to handle PDF generation and document assignment updates
      const result = await handleFormSubmission(
        'informed-consent-form',
        documentInfo,
        'Informed Consent',
        documentData
      );

      if (result.success) {
        toast({
          title: "Success",
          description: "Your informed consent has been submitted successfully.",
        });

        if (onClose) {
          onClose();
        } else {
          navigate('/patient-dashboard');
        }
      } else {
        toast({
          title: "Error",
          description: result.message || "There was a problem submitting your informed consent.",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error("Error submitting informed consent:", error);
      toast({
        title: "Error",
        description: "There was a problem submitting your informed consent. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="w-full max-w-5xl mx-auto pb-12" ref={formRef} id="informed-consent-form">
      <Card className="overflow-hidden">
        <CardHeader className="bg-zinc-50 border-b border-zinc-200">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-2xl flex items-center gap-2">
                <FileText className="h-6 w-6 text-valorwell-600" />
                Informed Consent for Telehealth Services
              </CardTitle>
              <CardDescription>
                Please review and sign the telehealth consent form below
              </CardDescription>
            </div>
          </div>
        </CardHeader>

        <CardContent className="pt-6">
          <div className="prose max-w-none">
            <div className="bg-blue-50 border-l-4 border-blue-500 p-4 mb-6">
              <p className="text-sm text-blue-700">
                This form provides information about engaging in therapy services via telehealth. 
                Please read it carefully before signing.
              </p>
            </div>
            
            <section className="mb-6">
              <h3 className="text-lg font-medium flex items-center gap-2 mb-2">
                <Video className="h-5 w-5 text-valorwell-600" /> 
                What Is Telehealth?
              </h3>
              <p className="text-zinc-700">
                Telehealth involves the use of electronic communications to provide behavioral health services remotely. 
                This may include real-time video conferencing, phone calls, or other secure communication tools. 
                Telehealth allows for the delivery of therapy services without an in-person visit.
              </p>
            </section>
            
            <section className="mb-6">
              <h3 className="text-lg font-medium flex items-center gap-2 mb-2">
                <Shield className="h-5 w-5 text-valorwell-600" /> 
                Technology and Privacy
              </h3>
              <p className="text-zinc-700">
                Our telehealth sessions will be conducted through our own proprietary health record system, 
                which is HIPAA-compliant and encrypted to protect your privacy. Clinical notes from telehealth 
                sessions will be maintained in a secure, HIPAA-compliant electronic health record. Clients may 
                request access to their records in accordance with applicable law.
              </p>
              <p className="text-zinc-700 mt-2">
                While we use best practices to maintain privacy and data security, telehealth carries inherent 
                risks, including the potential for technical failure, unauthorized access, and loss of confidentiality. 
                You acknowledge and accept these risks.
              </p>
            </section>

            <section className="mb-6">
              <h3 className="text-lg font-medium flex items-center gap-2 mb-2">
                Benefits and Limitations
              </h3>
              <p className="text-zinc-700">
                Telehealth offers increased accessibility and convenience. However, it may not be appropriate 
                in all situations. Your provider will assess whether telehealth is a suitable form of care for 
                your specific needs. If at any time telehealth is deemed clinically inappropriate, alternative 
                arrangements may be recommended.
              </p>
            </section>

            <section className="mb-6">
              <h3 className="text-lg font-medium flex items-center gap-2 mb-2">
                Client Responsibilities
              </h3>
              <p className="text-zinc-700">
                To maintain the effectiveness and confidentiality of telehealth sessions, clients agree to conduct 
                sessions in a private, distraction-free environment. Clients will not attend sessions while operating 
                a vehicle.
              </p>
              <p className="text-zinc-700 mt-2">
                You are responsible for ensuring a stable internet connection and appropriate technology for video 
                or phone sessions. You agree to take steps to secure your own devices and communication channels 
                (e.g., using a private internet connection and updated security software).
              </p>
            </section>

            <section className="mb-6">
              <h3 className="text-lg font-medium flex items-center gap-2 mb-2">
                <AlertTriangle className="h-5 w-5 text-valorwell-600" /> 
                Emergencies and Crisis Situations
              </h3>
              <p className="text-zinc-700">
                In the event of a crisis or emergency, you agree to contact emergency services (911) or go to the 
                nearest emergency room. You also agree to inform your provider of your physical location at the 
                beginning of each session in case emergency services need to be contacted.
              </p>
              <p className="text-zinc-700 mt-2">
                Please note that telehealth is not appropriate for all emergency situations, and your provider may 
                not be able to provide immediate crisis support remotely.
              </p>
            </section>

            <section className="mb-6">
              <h3 className="text-lg font-medium flex items-center gap-2 mb-2">
                Confidentiality
              </h3>
              <p className="text-zinc-700">
                Information shared in telehealth sessions is confidential and subject to the same limitations and 
                protections as in-person therapy. These include exceptions required by law, such as the duty to report 
                imminent risk of harm to self or others, suspected abuse, or court-ordered disclosures.
              </p>
            </section>

            <section className="mb-6">
              <h3 className="text-lg font-medium flex items-center gap-2 mb-2">
                Voluntary Participation and Withdrawal
              </h3>
              <p className="text-zinc-700">
                Participation in telehealth is voluntary. You have the right to withdraw your consent to telehealth 
                services at any time without affecting your right to future care or treatment.
              </p>
            </section>

            <section className="mb-6">
              <h3 className="text-lg font-medium flex items-center gap-2 mb-2">
                <Check className="h-5 w-5 text-valorwell-600" /> 
                Acknowledgment and Consent
              </h3>
              <p className="text-zinc-700">
                By signing below, you acknowledge that you have read and understood the information 
                provided above. You consent to engage in telehealth services under the terms described.
              </p>
            </section>

            <Form {...form}>
              <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
                <FormField
                  control={form.control}
                  name="signature"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="font-medium">Electronic Signature</FormLabel>
                      <FormControl>
                        <Textarea 
                          placeholder="Type your full legal name as your signature" 
                          {...field}
                          className="h-20 resize-none"
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
                      <FormLabel className="font-medium">Date</FormLabel>
                      <FormControl>
                        <div className="flex items-center gap-2">
                          <Calendar className="h-4 w-4 text-zinc-500" />
                          <span className="text-zinc-800">{format(new Date(), 'MMMM d, yyyy')}</span>
                        </div>
                      </FormControl>
                    </FormItem>
                  )}
                />

                <div className="flex justify-end">
                  <Button 
                    type="submit" 
                    className="w-full md:w-auto"
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? "Submitting..." : "I Consent and Agree"}
                  </Button>
                </div>
              </form>
            </Form>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default InformedConsentTemplate;
