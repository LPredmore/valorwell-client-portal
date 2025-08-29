import React from 'react';
import NewLayout from '@/components/layout/NewLayout';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Home, User, FileText, Shield, UserCheck } from 'lucide-react';
import DashboardTab from '@/components/patient/DashboardTab';
import ProfileTab from '@/components/patient/ProfileTab';
import DocumentsTab from '@/components/patient/DocumentsTab';
import InsuranceTab from '@/components/patient/InsuranceTab';
import TherapistSelectionTab from '@/components/patient/TherapistSelectionTab';

const PatientPortal: React.FC = () => {
  return (
    <NewLayout>
      <div className="container mx-auto px-4 sm:px-6 py-4 sm:py-8">
        <Tabs defaultValue="dashboard" className="w-full">
          <TabsList className="grid w-full grid-cols-5 mb-6 sm:mb-8 h-auto">
            <TabsTrigger value="dashboard" className="flex flex-col sm:flex-row items-center gap-1 sm:gap-2 py-3 text-xs sm:text-sm">
              <Home className="h-4 w-4" />
              <span>Dashboard</span>
            </TabsTrigger>
            <TabsTrigger value="profile" className="flex flex-col sm:flex-row items-center gap-1 sm:gap-2 py-3 text-xs sm:text-sm">
              <User className="h-4 w-4" />
              <span>Profile</span>
            </TabsTrigger>
            <TabsTrigger value="documents" className="flex flex-col sm:flex-row items-center gap-1 sm:gap-2 py-3 text-xs sm:text-sm">
              <FileText className="h-4 w-4" />
              <span>Documents</span>
            </TabsTrigger>
            <TabsTrigger value="insurance" className="flex flex-col sm:flex-row items-center gap-1 sm:gap-2 py-3 text-xs sm:text-sm">
              <Shield className="h-4 w-4" />
              <span>Insurance</span>
            </TabsTrigger>
            <TabsTrigger value="therapist" className="flex flex-col sm:flex-row items-center gap-1 sm:gap-2 py-3 text-xs sm:text-sm">
              <UserCheck className="h-4 w-4" />
              <span>Therapist</span>
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="dashboard" className="mt-0">
            <DashboardTab />
          </TabsContent>
          
          <TabsContent value="profile" className="mt-0">
            <ProfileTab />
          </TabsContent>
          
          <TabsContent value="documents" className="mt-0">
            <DocumentsTab />
          </TabsContent>
          
          <TabsContent value="insurance" className="mt-0">
            <InsuranceTab />
          </TabsContent>
          
          <TabsContent value="therapist" className="mt-0">
            <TherapistSelectionTab />
          </TabsContent>
        </Tabs>
      </div>
    </NewLayout>
  );
};

export default PatientPortal;