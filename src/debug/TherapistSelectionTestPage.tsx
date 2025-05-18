import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/context/NewAuthContext';
import { TherapistSelectionDebugger } from './therapistSelectionDebugger';
import { supabase } from '@/integrations/supabase/client';

/**
 * A test page to verify the TherapistSelection functionality
 * This page allows testing the therapist filtering by state without
 * having to go through the entire user flow
 */
const TherapistSelectionTestPage = () => {
  const { clientProfile, userId } = useAuth();
  const [state, setState] = useState<string>(clientProfile?.client_state || '');
  const [age, setAge] = useState<number>(clientProfile?.client_age || 18);
  const [results, setResults] = useState<string[]>([]);
  const [loading, setLoading] = useState<boolean>(false);

  // Add a log entry to the results
  const addLog = (message: string) => {
    setResults(prev => [...prev, `[${new Date().toLocaleTimeString()}] ${message}`]);
  };

  // Clear the logs
  const clearLogs = () => {
    setResults([]);
  };

  // Run the verification tests
  const runTests = async () => {
    setLoading(true);
    addLog('Starting verification tests...');
    
    try {
      // Verify client state
      addLog(`Verifying client state for user ID: ${userId || 'unknown'}`);
      if (userId) {
        const { data, error } = await supabase
          .from('clients')
          .select('client_state, client_age')
          .eq('id', userId)
          .single();
        
        if (error) {
          addLog(`Error fetching client state: ${error.message}`);
        } else if (data) {
          addLog(`Client state from database: ${data.client_state || 'null'}`);
          addLog(`Client age from database: ${data.client_age || 'null'}`);
        } else {
          addLog('No client data found');
        }
      } else {
        addLog('No user ID available');
      }
      
      // Verify therapist filtering
      addLog(`Verifying therapist filtering for state: ${state}`);
      const { data: therapists, error: therapistsError } = await supabase
        .from('clinicians')
        .select('id, clinician_professional_name, clinician_licensed_states')
        .eq('clinician_status', 'Active');
      
      if (therapistsError) {
        addLog(`Error fetching therapists: ${therapistsError.message}`);
      } else {
        addLog(`Found ${therapists.length} total active therapists`);
        
        // Filter therapists by state
        const stateNormalized = state.toLowerCase().trim();
        const matchingTherapists = therapists.filter(therapist => 
          therapist.clinician_licensed_states && 
          therapist.clinician_licensed_states.some(s => {
            if (!s) return false;
            const therapistState = s.toLowerCase().trim();
            return therapistState.includes(stateNormalized) || stateNormalized.includes(therapistState);
          })
        );
        
        addLog(`Found ${matchingTherapists.length} therapists licensed in ${state}`);
        
        // Log the matching therapists
        matchingTherapists.forEach(therapist => {
          addLog(`Therapist ${therapist.clinician_professional_name} (${therapist.id}) is licensed in ${state}`);
        });
      }
      
      addLog('Verification tests completed');
    } catch (error: any) {
      addLog(`Error during verification: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Update client state in the database
  const updateClientState = async () => {
    if (!userId) {
      addLog('No user ID available');
      return;
    }
    
    setLoading(true);
    addLog(`Updating client state to: ${state}`);
    
    try {
      const { error } = await supabase
        .from('clients')
        .update({
          client_state: state,
          client_age: age
        })
        .eq('id', userId);
      
      if (error) {
        addLog(`Error updating client state: ${error.message}`);
      } else {
        addLog('Client state updated successfully');
      }
    } catch (error: any) {
      addLog(`Error during update: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto py-8">
      <h1 className="text-3xl font-bold mb-6">Therapist Selection Test Page</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Client Information</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <Label htmlFor="userId">User ID</Label>
                <Input id="userId" value={userId || ''} readOnly />
              </div>
              
              <div>
                <Label htmlFor="state">Client State</Label>
                <Input 
                  id="state" 
                  value={state} 
                  onChange={(e) => setState(e.target.value)}
                  placeholder="Enter state (e.g., TX, Texas)"
                />
              </div>
              
              <div>
                <Label htmlFor="age">Client Age</Label>
                <Input 
                  id="age" 
                  type="number" 
                  value={age} 
                  onChange={(e) => setAge(parseInt(e.target.value) || 18)}
                  min={0}
                  max={120}
                />
              </div>
              
              <Button 
                onClick={updateClientState} 
                disabled={loading}
                className="w-full"
              >
                {loading ? 'Updating...' : 'Update Client State'}
              </Button>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle>Verification Tests</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <Button 
                onClick={runTests} 
                disabled={loading}
                className="w-full"
              >
                {loading ? 'Running Tests...' : 'Run Verification Tests'}
              </Button>
              
              <Button 
                variant="outline" 
                onClick={clearLogs}
                className="w-full"
              >
                Clear Logs
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
      
      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Test Results</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="bg-gray-100 p-4 rounded-md h-96 overflow-y-auto font-mono text-sm">
            {results.length === 0 ? (
              <p className="text-gray-500">No test results yet. Run verification tests to see results.</p>
            ) : (
              results.map((log, index) => (
                <div key={index} className="py-1">
                  {log}
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default TherapistSelectionTestPage;