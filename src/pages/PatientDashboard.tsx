
import React, { useState, useEffect } from 'react';
import NewLayout from '@/components/layout/NewLayout';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle 
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Calendar, Loader2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/NewAuthContext';
import { toast } from 'sonner';

const PatientDashboard = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('dashboard');
  const { clientStatus, authState, isLoading } = useAuth();
  
  useEffect(() => {
    console.log("[PatientDashboard] Current state: clientStatus=", clientStatus, "isLoading=", isLoading, "authState=", authState);
    
    // Redirect to profile setup if client status is "New" and loading is complete
    if (!isLoading && clientStatus === 'New') {
      console.log("[PatientDashboard] User has New status, redirecting to profile setup");
      toast.info("Please complete your profile setup first");
      navigate('/profile-setup', { replace: true });
    }
  }, [clientStatus, navigate, isLoading, authState]);
  
  // If still loading, show loading indicator with timeout handling
  const [showLoadingTimeout, setShowLoadingTimeout] = useState(false);
  
  useEffect(() => {
    let timeoutId: NodeJS.Timeout | null = null;
    
    if (isLoading) {
      timeoutId = setTimeout(() => {
        setShowLoadingTimeout(true);
      }, 5000); // Show timeout message after 5 seconds
    }
    
    return () => {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    };
  }, [isLoading]);
  
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen flex-col">
        <Loader2 className="h-12 w-12 animate-spin text-blue-500 mb-4" />
        <p className="text-gray-600">Loading your dashboard...</p>
        
        {showLoadingTimeout && (
          <div className="mt-6 text-center max-w-md px-4">
            <p className="text-amber-600 mb-2">This is taking longer than expected.</p>
            <p className="text-gray-600 mb-4">There might be an issue with your connection.</p>
            <Button
              onClick={() => window.location.reload()}
              variant="outline"
            >
              Refresh Page
            </Button>
          </div>
        )}
      </div>
    );
  }
  
  return (
    <NewLayout>
      <div className="container mx-auto max-w-6xl">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-semibold">Patient Portal</h1>
          <div className="flex items-center space-x-2">
            {/* This would normally contain user info/avatar */}
          </div>
        </div>
        
        <Tabs 
          value={activeTab} 
          onValueChange={setActiveTab}
          className="w-full"
        >
          <TabsList className="border-b w-full justify-start mb-6 bg-transparent p-0">
            <TabsTrigger 
              value="dashboard" 
              className="data-[state=active]:border-b-2 data-[state=active]:border-blue-600 data-[state=active]:text-blue-600 rounded-none px-4 py-2"
              onClick={() => navigate('/patient-dashboard')}
            >
              Dashboard
            </TabsTrigger>
            <TabsTrigger 
              value="profile" 
              className="data-[state=active]:border-b-2 data-[state=active]:border-blue-600 data-[state=active]:text-blue-600 rounded-none px-4 py-2"
              onClick={() => navigate('/patient-profile')}
            >
              Profile
            </TabsTrigger>
            <TabsTrigger 
              value="past-appointments" 
              className="data-[state=active]:border-b-2 data-[state=active]:border-blue-600 data-[state=active]:text-blue-600 rounded-none px-4 py-2"
              onClick={() => {}} // This would navigate to past appointments
            >
              Past Appointments
            </TabsTrigger>
            <TabsTrigger 
              value="documents" 
              className="data-[state=active]:border-b-2 data-[state=active]:border-blue-600 data-[state=active]:text-blue-600 rounded-none px-4 py-2"
              onClick={() => navigate('/patient-documents')}
            >
              Documents
            </TabsTrigger>
            <TabsTrigger 
              value="insurance" 
              className="data-[state=active]:border-b-2 data-[state=active]:border-blue-600 data-[state=active]:text-blue-600 rounded-none px-4 py-2"
              onClick={() => {}} // This would navigate to insurance
            >
              Insurance
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="dashboard">
            <div className="space-y-6">
              {/* Today's Appointments */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg">Today's Appointments</CardTitle>
                  <CardDescription>Sessions scheduled for today</CardDescription>
                </CardHeader>
                <CardContent className="pt-2">
                  <div className="flex flex-col items-center justify-center py-8 text-center">
                    <Calendar className="h-16 w-16 text-gray-300 mb-4" />
                    <h3 className="text-lg font-medium">No appointments today</h3>
                    <p className="text-sm text-gray-500 mt-1">Check your upcoming appointments below</p>
                  </div>
                </CardContent>
              </Card>
              
              {/* Therapist Information */}
              <Card>
                <CardHeader className="pb-2 flex flex-row items-center justify-between">
                  <div>
                    <CardTitle className="text-lg">Your Therapist</CardTitle>
                  </div>
                  <Button variant="outline" size="sm">
                    Book New Appointment
                  </Button>
                </CardHeader>
                <CardContent className="pt-2">
                  <div className="flex items-start gap-4">
                    <img 
                      src="/lovable-uploads/d25ee8dc-45f2-4bb9-aaa0-8115fc74374e.png" 
                      alt="Therapist" 
                      className="w-32 h-32 object-cover rounded-md"
                    />
                    <div>
                      <h3 className="font-semibold mb-2">About NotReal Therapist, LPC</h3>
                      <p className="text-gray-700">I'm here to help people be awesome and cool</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              {/* Upcoming Appointments */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg">Upcoming Appointments</CardTitle>
                  <CardDescription>Your scheduled sessions</CardDescription>
                </CardHeader>
                <CardContent className="pt-2">
                  <div className="flex flex-col items-center justify-center py-8 text-center">
                    <Calendar className="h-16 w-16 text-gray-300 mb-4" />
                    <h3 className="text-lg font-medium">No upcoming appointments</h3>
                    <p className="text-sm text-gray-500 mt-1">Schedule a session with your therapist</p>
                    <Button className="mt-4">
                      Book Appointment
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </NewLayout>
  );
};

export default PatientDashboard;
