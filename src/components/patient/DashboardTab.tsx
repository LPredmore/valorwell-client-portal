import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from '@/context/NewAuthContext';
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const DashboardTab = () => {
  const { user } = useAuth();
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
        const { data: client, error: clientError } = await supabase
          .from('clients')
          .select('*')
          .eq('id', user.id)
          .single();
        
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
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Please log in</h1>
          <p className="text-muted-foreground">You need to be logged in to view your dashboard.</p>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-gray-900 mx-auto"></div>
          <p className="mt-4 text-lg">Loading your dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="mb-8">
        <h2 className="text-3xl font-bold mb-2">
          Welcome back{clientData?.client_first_name ? `, ${clientData.client_first_name}` : ''}!
        </h2>
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
            Use the tabs above to access your documents, update your profile, 
            manage your insurance information, and select your therapist.
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

export default DashboardTab;