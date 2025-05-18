import React, { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Form } from '@/components/ui/form';
import { useToast } from '@/hooks/use-toast';
import { Pencil, Save, X } from 'lucide-react';
import { DebugUtils } from '@/utils/debugUtils';

const ClientDetails = () => {
  const { clientId } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const sessionId = useRef(DebugUtils.generateSessionId()).current;

  const [clientData, setClientData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchClientData = async () => {
      try {
        DebugUtils.log(sessionId, '[ClientDetails] Fetching client data', { clientId });
        const { data, error } = await supabase
          .from('clients')
          .select('*')
          .eq('id', clientId)
          .single();

        if (error) throw error;
        setClientData(data);
        setIsLoading(false);
        DebugUtils.log(sessionId, '[ClientDetails] Client data loaded', data);
      } catch (err) {
        DebugUtils.log(sessionId, '[ClientDetails] Error loading client data', { error: err }, true);
        setError(err);
        setIsLoading(false);
        toast({
          title: 'Error',
          description: 'Failed to load client data.',
          variant: 'destructive'
        });
      }
    };

    fetchClientData();
  }, [clientId, sessionId, toast]);

  const handleSaveChanges = async (updatedData) => {
    try {
      DebugUtils.log(sessionId, '[ClientDetails] Saving client data', updatedData);
      const { error } = await supabase
        .from('clients')
        .update(updatedData)
        .eq('id', clientId);

      if (error) throw error;

      setClientData(updatedData);
      setIsEditing(false);
      DebugUtils.log(sessionId, '[ClientDetails] Client data saved successfully', updatedData);
      toast({
        title: 'Success',
        description: 'Client details updated successfully.'
      });
    } catch (err) {
      DebugUtils.log(sessionId, '[ClientDetails] Error saving client data', { error: err }, true);
      toast({
        title: 'Error',
        description: 'Failed to save client details.',
        variant: 'destructive'
      });
    }
  };

  if (isLoading) {
    return <div>Loading client details...</div>;
  }

  if (error || !clientData) {
    return <div>Failed to load client data. Please try again later.</div>;
  }

  return (
    <div>
      <h1>Client Details</h1>
      <pre>{JSON.stringify(clientData, null, 2)}</pre>
      {isEditing ? (
        <Button onClick={() => handleSaveChanges(clientData)}>Save Changes</Button>
      ) : (
        <Button onClick={() => setIsEditing(true)}>Edit Client</Button>
      )}
      <Button variant="outline" onClick={() => navigate('/')}>Return to Dashboard</Button>
    </div>
  );
};

export default ClientDetails;
