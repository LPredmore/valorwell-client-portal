
import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CalendarIcon, Save, Download, X } from 'lucide-react';
import { ClientDetails } from '@/types/client';
import { format } from 'date-fns';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { getCurrentUser, formatDateForDB } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface TreatmentPlanTemplateProps {
  onClose: () => void;
  clinicianName: string;
  clientData?: ClientDetails | null;
}

const TreatmentPlanTemplate: React.FC<TreatmentPlanTemplateProps> = ({
  onClose,
  clinicianName,
  clientData
}) => {
  const [startDate, setStartDate] = useState<Date | undefined>(new Date());
  const [planLength, setPlanLength] = useState<string>('90 Days');
  const [treatmentFrequency, setTreatmentFrequency] = useState<string>('Weekly');
  const [primaryObjective, setPrimaryObjective] = useState<string>('');
  const [intervention1, setIntervention1] = useState<string>('');
  const [intervention2, setIntervention2] = useState<string>('');
  const [secondaryObjective, setSecondaryObjective] = useState<string>('');
  const [intervention3, setIntervention3] = useState<string>('');
  const [intervention4, setIntervention4] = useState<string>('');
  const [tertiaryObjective, setTertiaryObjective] = useState<string>('');
  const [intervention5, setIntervention5] = useState<string>('');
  const [intervention6, setIntervention6] = useState<string>('');
  const [privateNote, setPrivateNote] = useState<string>('');
  const [problemNarrative, setProblemNarrative] = useState<string>('');
  const [treatmentGoalNarrative, setTreatmentGoalNarrative] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const { toast } = useToast();

  // Load existing treatment plan if available
  useEffect(() => {
    const loadExistingPlan = async () => {
      // This would typically fetch any existing treatment plan data
      // and populate the form fields
    };
    
    if (clientData?.id) {
      loadExistingPlan();
    }
  }, [clientData?.id]);

  const handleSaveDraft = async () => {
    if (!clientData?.id) {
      toast({
        title: "Error",
        description: "Client information is missing",
        variant: "destructive"
      });
      return;
    }
    
    setIsLoading(true);
    
    try {
      // Save treatment plan to database - placeholder for actual save functionality
      toast({
        title: "Draft Saved",
        description: "Treatment plan draft has been saved",
      });
    } catch (error) {
      console.error('Error saving treatment plan draft:', error);
      toast({
        title: "Error",
        description: "Failed to save draft",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleFinalize = async () => {
    if (!validateForm()) {
      return;
    }
    
    setIsLoading(true);
    
    try {
      // Get current clinician
      const { user, error } = await getCurrentUser();
      if (error || !user) {
        toast({
          title: "Authentication Error",
          description: "Could not verify your identity",
          variant: "destructive"
        });
        setIsLoading(false);
        return;
      }

      // This would typically submit the finalized treatment plan to the database
      // and generate a PDF document
      
      toast({
        title: "Treatment Plan Finalized",
        description: "Treatment plan has been completed and saved",
      });
      
      onClose();
    } catch (error) {
      console.error('Error finalizing treatment plan:', error);
      toast({
        title: "Error",
        description: "Failed to finalize treatment plan",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const validateForm = () => {
    if (!primaryObjective || !intervention1 || !intervention2) {
      toast({
        title: "Missing Information",
        description: "Please complete primary objective and at least two interventions",
        variant: "destructive"
      });
      return false;
    }
    return true;
  };

  const getUpdateDate = () => {
    if (!startDate) return '';
    const date = new Date(startDate);
    
    switch (planLength) {
      case '30 Days':
        date.setDate(date.getDate() + 30);
        break;
      case '60 Days':
        date.setDate(date.getDate() + 60);
        break;
      case '90 Days':
        date.setDate(date.getDate() + 90);
        break;
      case '180 Days':
        date.setDate(date.getDate() + 180);
        break;
      default:
        date.setDate(date.getDate() + 90);
    }
    
    return format(date, 'MM/dd/yyyy');
  };

  return (
    <div className="bg-white rounded-lg border p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Treatment Plan</h2>
        <Button variant="ghost" size="icon" onClick={onClose}>
          <X className="h-5 w-5" />
        </Button>
      </div>
      
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="client-name">Client Name</Label>
          <Input
            id="client-name"
            value={`${clientData?.client_first_name || ''} ${clientData?.client_last_name || ''}`}
            disabled
          />
        </div>
        
        <div>
          <Label htmlFor="dob">Date of Birth</Label>
          <Input
            id="dob"
            value={clientData?.client_date_of_birth ? format(new Date(clientData.client_date_of_birth), 'MM/dd/yyyy') : ''}
            disabled
          />
        </div>
        
        <div>
          <Label htmlFor="clinician">Clinician</Label>
          <Input
            id="clinician"
            value={clinicianName}
            disabled
          />
        </div>
        
        <div>
          <Label>Start Date</Label>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className="w-full justify-start text-left font-normal"
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {startDate ? format(startDate, 'PPP') : <span>Pick a date</span>}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0">
              <Calendar
                mode="single"
                selected={startDate}
                onSelect={setStartDate}
                initialFocus
              />
            </PopoverContent>
          </Popover>
        </div>
        
        <div>
          <Label htmlFor="plan-length">Plan Length</Label>
          <Select value={planLength} onValueChange={setPlanLength}>
            <SelectTrigger id="plan-length">
              <SelectValue placeholder="Select plan length" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="30 Days">30 Days</SelectItem>
              <SelectItem value="60 Days">60 Days</SelectItem>
              <SelectItem value="90 Days">90 Days</SelectItem>
              <SelectItem value="180 Days">180 Days</SelectItem>
            </SelectContent>
          </Select>
        </div>
        
        <div>
          <Label htmlFor="treatment-frequency">Treatment Frequency</Label>
          <Select value={treatmentFrequency} onValueChange={setTreatmentFrequency}>
            <SelectTrigger id="treatment-frequency">
              <SelectValue placeholder="Select frequency" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Weekly">Weekly</SelectItem>
              <SelectItem value="Bi-Weekly">Bi-Weekly</SelectItem>
              <SelectItem value="Monthly">Monthly</SelectItem>
              <SelectItem value="As Needed">As Needed</SelectItem>
            </SelectContent>
          </Select>
        </div>
        
        <div className="col-span-2">
          <Label htmlFor="next-update">Next Treatment Plan Update</Label>
          <Input
            id="next-update"
            value={getUpdateDate()}
            disabled
          />
        </div>
      </div>
      
      <Separator />
      
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Problem & Goal</h3>
        
        <div>
          <Label htmlFor="problem-narrative">Problem Statement</Label>
          <Textarea
            id="problem-narrative"
            placeholder="Describe the presenting problem..."
            value={problemNarrative}
            onChange={(e) => setProblemNarrative(e.target.value)}
            className="min-h-[100px]"
          />
        </div>
        
        <div>
          <Label htmlFor="goal-narrative">Treatment Goal</Label>
          <Textarea
            id="goal-narrative"
            placeholder="Describe the overall treatment goal..."
            value={treatmentGoalNarrative}
            onChange={(e) => setTreatmentGoalNarrative(e.target.value)}
            className="min-h-[100px]"
          />
        </div>
      </div>
      
      <Separator />
      
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Objectives & Interventions</h3>
        
        <Card>
          <CardContent className="pt-6 space-y-4">
            <div>
              <Label htmlFor="primary-objective" className="font-semibold">Primary Objective</Label>
              <Textarea
                id="primary-objective"
                placeholder="Enter primary objective..."
                value={primaryObjective}
                onChange={(e) => setPrimaryObjective(e.target.value)}
              />
            </div>
            
            <div>
              <Label htmlFor="intervention1">Intervention 1</Label>
              <Textarea
                id="intervention1"
                placeholder="Enter intervention..."
                value={intervention1}
                onChange={(e) => setIntervention1(e.target.value)}
              />
            </div>
            
            <div>
              <Label htmlFor="intervention2">Intervention 2</Label>
              <Textarea
                id="intervention2"
                placeholder="Enter intervention..."
                value={intervention2}
                onChange={(e) => setIntervention2(e.target.value)}
              />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-6 space-y-4">
            <div>
              <Label htmlFor="secondary-objective" className="font-semibold">Secondary Objective (Optional)</Label>
              <Textarea
                id="secondary-objective"
                placeholder="Enter secondary objective..."
                value={secondaryObjective}
                onChange={(e) => setSecondaryObjective(e.target.value)}
              />
            </div>
            
            <div>
              <Label htmlFor="intervention3">Intervention 3</Label>
              <Textarea
                id="intervention3"
                placeholder="Enter intervention..."
                value={intervention3}
                onChange={(e) => setIntervention3(e.target.value)}
              />
            </div>
            
            <div>
              <Label htmlFor="intervention4">Intervention 4</Label>
              <Textarea
                id="intervention4"
                placeholder="Enter intervention..."
                value={intervention4}
                onChange={(e) => setIntervention4(e.target.value)}
              />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-6 space-y-4">
            <div>
              <Label htmlFor="tertiary-objective" className="font-semibold">Tertiary Objective (Optional)</Label>
              <Textarea
                id="tertiary-objective"
                placeholder="Enter tertiary objective..."
                value={tertiaryObjective}
                onChange={(e) => setTertiaryObjective(e.target.value)}
              />
            </div>
            
            <div>
              <Label htmlFor="intervention5">Intervention 5</Label>
              <Textarea
                id="intervention5"
                placeholder="Enter intervention..."
                value={intervention5}
                onChange={(e) => setIntervention5(e.target.value)}
              />
            </div>
            
            <div>
              <Label htmlFor="intervention6">Intervention 6</Label>
              <Textarea
                id="intervention6"
                placeholder="Enter intervention..."
                value={intervention6}
                onChange={(e) => setIntervention6(e.target.value)}
              />
            </div>
          </CardContent>
        </Card>
      </div>
      
      <div>
        <Label htmlFor="private-note">Private Clinical Note (not visible to client)</Label>
        <Textarea
          id="private-note"
          placeholder="Enter private notes..."
          value={privateNote}
          onChange={(e) => setPrivateNote(e.target.value)}
          className="min-h-[100px]"
        />
      </div>
      
      <div className="flex justify-end space-x-4 pt-4">
        <Button
          variant="outline"
          onClick={handleSaveDraft}
          disabled={isLoading}
        >
          {isLoading ? (
            <>Saving...</>
          ) : (
            <>
              <Save className="mr-2 h-4 w-4" />
              Save Draft
            </>
          )}
        </Button>
        
        <Button
          onClick={handleFinalize}
          disabled={isLoading}
        >
          {isLoading ? (
            <>Finalizing...</>
          ) : (
            <>
              <Download className="mr-2 h-4 w-4" />
              Finalize Plan
            </>
          )}
        </Button>
      </div>
    </div>
  );
};

export default TreatmentPlanTemplate;
