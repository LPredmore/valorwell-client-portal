import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { format } from 'date-fns';
import { Loader2, Video, Shield, AlertTriangle, Calendar, FileText, Check } from 'lucide-react';

interface InformedConsentData {
  document_date: string;
  client_name?: string;
}

interface InformedConsentViewDialogProps {
  isOpen: boolean;
  onClose: () => void;
  data: InformedConsentData | null;
  isLoading: boolean;
}

const InformedConsentViewDialog: React.FC<InformedConsentViewDialogProps> = ({
  isOpen,
  onClose,
  data,
  isLoading
}) => {
  if (!isOpen) return null;
  
  if (isLoading) {
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <div className="flex justify-center items-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-valorwell-600" />
          </div>
        </DialogContent>
      </Dialog>
    );
  }
  
  if (!data) {
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>Informed Consent</DialogTitle>
          </DialogHeader>
          <div className="py-6 text-center">
            <p>No informed consent data found.</p>
          </div>
          <DialogFooter>
            <Button onClick={onClose}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }
  
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl flex items-center gap-2">
            <FileText className="h-6 w-6 text-valorwell-600" />
            Informed Consent for Telehealth Services
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6 pt-4">
          {/* Completion Status */}
          <Card className="border-green-200 bg-green-50">
            <CardContent className="pt-6">
              <div className="flex items-center gap-2">
                <Check className="h-5 w-5 text-green-600" />
                <div>
                  <p className="font-medium text-green-800">Consent Completed</p>
                  <p className="text-sm text-green-700">
                    Signed on {format(new Date(data.document_date), 'MMMM d, yyyy')}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Introduction */}
          <div className="bg-blue-50 border-l-4 border-blue-500 p-4">
            <p className="text-sm text-blue-700">
              This form provides information about engaging in therapy services via telehealth. 
              Below is the consent form that was reviewed and agreed to.
            </p>
          </div>
          
          {/* What Is Telehealth Section */}
          <Card>
            <CardContent className="pt-6">
              <h3 className="text-lg font-medium flex items-center gap-2 mb-4">
                <Video className="h-5 w-5 text-valorwell-600" /> 
                What Is Telehealth?
              </h3>
              <p className="text-muted-foreground">
                Telehealth involves the use of electronic communications to provide behavioral health services remotely. 
                This may include real-time video conferencing, phone calls, or other secure communication tools. 
                Telehealth allows for the delivery of therapy services without an in-person visit.
              </p>
            </CardContent>
          </Card>
          
          {/* Technology and Privacy Section */}
          <Card>
            <CardContent className="pt-6">
              <h3 className="text-lg font-medium flex items-center gap-2 mb-4">
                <Shield className="h-5 w-5 text-valorwell-600" /> 
                Technology and Privacy
              </h3>
              <div className="space-y-3 text-muted-foreground">
                <p>
                  Our telehealth sessions will be conducted through our own proprietary health record system, 
                  which is HIPAA-compliant and encrypted to protect your privacy. Clinical notes from telehealth 
                  sessions will be maintained in a secure, HIPAA-compliant electronic health record. Clients may 
                  request access to their records in accordance with applicable law.
                </p>
                <p>
                  While we use best practices to maintain privacy and data security, telehealth carries inherent 
                  risks, including the potential for technical failure, unauthorized access, and loss of confidentiality. 
                  You acknowledge and accept these risks.
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Benefits and Limitations Section */}
          <Card>
            <CardContent className="pt-6">
              <h3 className="text-lg font-medium mb-4">Benefits and Limitations</h3>
              <p className="text-muted-foreground">
                Telehealth offers increased accessibility and convenience. However, it may not be appropriate 
                in all situations. Your provider will assess whether telehealth is a suitable form of care for 
                your specific needs. If at any time telehealth is deemed clinically inappropriate, alternative 
                arrangements may be recommended.
              </p>
            </CardContent>
          </Card>

          {/* Client Responsibilities Section */}
          <Card>
            <CardContent className="pt-6">
              <h3 className="text-lg font-medium mb-4">Client Responsibilities</h3>
              <div className="space-y-3 text-muted-foreground">
                <p>
                  To maintain the effectiveness and confidentiality of telehealth sessions, clients agree to conduct 
                  sessions in a private, distraction-free environment. Clients will not attend sessions while operating 
                  a vehicle.
                </p>
                <p>
                  You are responsible for ensuring a stable internet connection and appropriate technology for video 
                  or phone sessions. You agree to take steps to secure your own devices and communication channels 
                  (e.g., using a private internet connection and updated security software).
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Emergency and Crisis Section */}
          <Card>
            <CardContent className="pt-6">
              <h3 className="text-lg font-medium flex items-center gap-2 mb-4">
                <AlertTriangle className="h-5 w-5 text-valorwell-600" /> 
                Emergencies and Crisis Situations
              </h3>
              <div className="space-y-3 text-muted-foreground">
                <p>
                  In the event of a crisis or emergency, you agree to contact emergency services (911) or go to the 
                  nearest emergency room. You also agree to inform your provider of your physical location at the 
                  beginning of each session in case emergency services need to be contacted.
                </p>
                <p>
                  Please note that telehealth is not appropriate for all emergency situations, and your provider may 
                  not be able to provide immediate crisis support remotely.
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Confidentiality Section */}
          <Card>
            <CardContent className="pt-6">
              <h3 className="text-lg font-medium mb-4">Confidentiality</h3>
              <p className="text-muted-foreground">
                Information shared in telehealth sessions is confidential and subject to the same limitations and 
                protections as in-person therapy. These include exceptions required by law, such as the duty to report 
                imminent risk of harm to self or others, suspected abuse, or court-ordered disclosures.
              </p>
            </CardContent>
          </Card>

          {/* Voluntary Participation Section */}
          <Card>
            <CardContent className="pt-6">
              <h3 className="text-lg font-medium mb-4">Voluntary Participation and Withdrawal</h3>
              <p className="text-muted-foreground">
                Participation in telehealth is voluntary. You have the right to withdraw your consent to telehealth 
                services at any time without affecting your right to future care or treatment.
              </p>
            </CardContent>
          </Card>

          {/* Acknowledgment Section */}
          <Card>
            <CardContent className="pt-6">
              <h3 className="text-lg font-medium flex items-center gap-2 mb-4">
                <Check className="h-5 w-5 text-valorwell-600" /> 
                Acknowledgment and Consent
              </h3>
              <p className="text-muted-foreground mb-4">
                By signing below, you acknowledge that you have read and understood the information 
                provided above. You consent to engage in telehealth services under the terms described.
              </p>
              
              {/* Signature Status */}
              <div className="bg-gray-50 rounded-lg p-4 border">
                <div className="flex items-center gap-2 mb-2">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <span className="font-medium">Electronically Signed</span>
                </div>
                <p className="text-sm text-muted-foreground">
                  This consent form was completed and electronically signed on{' '}
                  {format(new Date(data.document_date), 'MMMM d, yyyy')}
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
        
        <DialogFooter>
          <Button onClick={onClose}>Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default InformedConsentViewDialog;