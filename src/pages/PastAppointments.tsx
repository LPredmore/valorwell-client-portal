
import React, { useState, useEffect } from 'react';
import Layout from '@/components/layout/Layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import MyAppointments from '@/components/patient/MyAppointments';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/context/NewAuthContext';
import { getUserTimeZone } from '@/utils/timeZoneUtils';
import { TimeZoneService } from '@/utils/timeZoneService';

const PastAppointments: React.FC = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [timeZone, setTimeZone] = useState<string>(getUserTimeZone());

  useEffect(() => {
    // Set page title for accessibility
    document.title = 'Past Appointments | Valorwell';
    
    // Log page view for debugging
    console.log('PastAppointments page loaded');
  }, []);

  return (
    <Layout>
      <div className="container mx-auto p-6">
        <h1 className="text-2xl font-semibold mb-6">Past Appointments</h1>
        <div className="grid grid-cols-1 gap-6">
          <MyAppointments />
        </div>
      </div>
    </Layout>
  );
};

export default PastAppointments;
