import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Calendar, User } from 'lucide-react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { getUserTimeZone } from '@/utils/timeZoneUtils';
import { TimeZoneService } from '@/utils/timeZoneService';
import PHQ9Template from '@/components/templates/PHQ9Template';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { formatInClientTimezone, getSafeTimezone, DATE_FORMATS } from '@/utils/dateFormatting';

interface MyPortalProps {
  clientData: any | null;
  clinicianName: string | null;
  loading: boolean;
}

const MyPortal: React.FC<MyPortalProps> = ({
  clientData,
  clinicianName,
  loading
}) => {
  const [clinicianData, setClinicianData] = useState<any>(null);
  const { toast } = useToast();

  // Memoize client timezone to prevent recalculation on every render
  const clientTimeZone = useMemo(() => {
    return getSafeTimezone(clientData?.client_time_zone);
  }, [clientData?.client_time_zone]);

  useEffect(() => {
    const fetchClinicianData = async () => {
      if (!clientData?.client_assigned_therapist) return;
      try {
        const { data, error } = await supabase
          .from('clinicians')
          .select('*')
          .eq('id', clientData.client_assigned_therapist)
          .single();
          
        if (error) {
          console.error('Error fetching clinician data:', error);
          return;
        }
        
        if (data) {
          console.log('Fetched clinician data:', data);
          setClinicianData(data);
        }
      } catch (error) {
        console.error('Error:', error);
      }
    };
    
    fetchClinicianData();
  }, [clientData]);

  const timeZoneDisplay = TimeZoneService.getTimeZoneDisplayName(clientTimeZone);

  return (
    <div className="grid grid-cols-1 gap-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Your Therapist</CardTitle>
        </CardHeader>
        <CardContent>
          {clientData && clientData.client_assigned_therapist && clinicianData ? (
            <div className="bg-gray-50 p-4 rounded-md mb-4">
              <div className="flex flex-row gap-6 items-start">
                <Avatar className="h-48 w-48 border-2 border-white shadow-md rounded-md flex-shrink-0">
                  {clinicianData.clinician_image_url ? (
                    <AvatarImage 
                      src={clinicianData.clinician_image_url} 
                      alt={clinicianName || 'Therapist'} 
                      className="object-cover h-full w-full" 
                    />
                  ) : (
                    <AvatarFallback className="text-4xl font-medium bg-valorwell-100 text-valorwell-700 h-full w-full">
                      {clinicianData.clinician_first_name?.[0] || ''}
                      {clinicianData.clinician_last_name?.[0] || ''}
                    </AvatarFallback>
                  )}
                </Avatar>
                
                <div className="flex-1">
                  {clinicianData.clinician_bio && (
                    <>
                      <h4 className="font-medium text-lg mb-2">About {clinicianName}</h4>
                      <p className="text-gray-700 text-sm whitespace-pre-line">{clinicianData.clinician_bio}</p>
                    </>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <User className="h-12 w-12 text-gray-300 mb-3" />
              <h3 className="text-lg font-medium">No Assigned Therapist</h3>
              <p className="text-sm text-gray-500 mt-1">
                You don't have an assigned therapist yet. Please contact the clinic for assistance.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Welcome to Your Portal</CardTitle>
          <CardDescription>Access your documents, profile, and insurance information</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Button variant="outline" className="h-20 flex flex-col items-center justify-center">
              <Calendar className="h-6 w-6 mb-2" />
              <span>My Documents</span>
            </Button>
            <Button variant="outline" className="h-20 flex flex-col items-center justify-center">
              <User className="h-6 w-6 mb-2" />
              <span>My Profile</span>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default MyPortal;