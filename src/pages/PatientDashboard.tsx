import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { FileText, User, Shield } from "lucide-react";
import { useAuth } from '@/context/NewAuthContext';
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import NewLayout from "@/components/layout/NewLayout";
import { formatInClientTimezone } from "@/utils/dateFormatting";
const PatientDashboard = () => {
  const {
    user
  } = useAuth();
  const [isLoading, setIsLoading] = useState(true);
  const [clientData, setClientData] = useState<any>(null);
  useEffect(() => {
    const fetchClientData = async () => {
      setIsLoading(true);
      try {
        if (!user) {
          console.error("User is not authenticated.");
          return;
        }

        // Fetch client data
        const {
          data: client,
          error: clientError
        } = await supabase.from('clients').select('*').eq('id', user.id).single();
        if (clientError) {
          console.error("Error fetching client data:", clientError);
          toast.error("Failed to load client data.");
        } else {
          setClientData(client);
        }
      } finally {
        setIsLoading(false);
      }
    };
    fetchClientData();
  }, [user]);
  if (!user) {
    return <NewLayout>
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <h1 className="text-2xl font-bold mb-4">Please log in</h1>
            <p className="text-muted-foreground">You need to be logged in to view your dashboard.</p>
          </div>
        </div>
      </NewLayout>;
  }
  if (isLoading) {
    return <NewLayout>
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-gray-900 mx-auto"></div>
            <p className="mt-4 text-lg">Loading your dashboard...</p>
          </div>
        </div>
      </NewLayout>;
  }
  return <NewLayout>
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">
            Welcome back{clientData?.client_first_name ? `, ${clientData.client_first_name}` : ''}!
          </h1>
          
        </div>

        {/* Quick Links */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">My Documents</CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <p className="text-xs text-muted-foreground">
                Access your forms and assessments
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">My Profile</CardTitle>
              <User className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <p className="text-xs text-muted-foreground">
                Update your personal information
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Insurance</CardTitle>
              <Shield className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <p className="text-xs text-muted-foreground">
                Manage your insurance information
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Welcome Message */}
        <Card>
          <CardHeader>
            <CardTitle>Welcome to Your Patient Portal</CardTitle>
            <CardDescription>
              Your secure portal for managing your healthcare information and communicating with your care team.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">
              Use the navigation menu to access your documents, update your profile, 
              manage your insurance information, and select your therapist.
            </p>
          </CardContent>
        </Card>
      </div>
    </NewLayout>;
};
export default PatientDashboard;