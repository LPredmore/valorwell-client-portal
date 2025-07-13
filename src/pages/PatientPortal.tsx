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
      <div className="container mx-auto px-4 py-8">
        <Tabs defaultValue="dashboard" className="w-full">
          <TabsList className="grid w-full grid-cols-5 mb-8">
            <TabsTrigger value="dashboard" className="flex items-center gap-2">
              <Home className="h-4 w-4" />
              <span className="hidden sm:inline">Dashboard</span>
            </TabsTrigger>
            <TabsTrigger value="profile" className="flex items-center gap-2">
              <User className="h-4 w-4" />
              <span className="hidden sm:inline">My Profile</span>
            </TabsTrigger>
            <TabsTrigger value="documents" className="flex items-center gap-2">
              <FileText className="h-4 w-4" />
              <span className="hidden sm:inline">Documents</span>
            </TabsTrigger>
            <TabsTrigger value="insurance" className="flex items-center gap-2">
              <Shield className="h-4 w-4" />
              <span className="hidden sm:inline">Insurance</span>
            </TabsTrigger>
            <TabsTrigger value="therapist" className="flex items-center gap-2">
              <UserCheck className="h-4 w-4" />
              <span className="hidden sm:inline">Therapist</span>
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