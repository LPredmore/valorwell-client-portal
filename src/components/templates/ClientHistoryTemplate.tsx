import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { useForm } from 'react-hook-form';
import { FileText, X, ChevronLeft, Save, Plus } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { ClientDetails } from '@/types/client';

interface ClientHistoryTemplateProps {
  onClose: () => void;
  onSubmit: (data: any) => void;
  clientData?: ClientDetails | null;
}

// Define all the missing options and data structures
const relationshipTypes = [
  "Father", "Mother", "Stepfather", "Stepmother", "Brother", "Sister", 
  "Stepbrother", "Stepsister", "Grandfather", "Grandmother", "Spouse", 
  "Child", "Friend", "Other"
];

const educationOptions = [
  "Less than High School", "High School / GED", "Some College", "Associate's Degree",
  "Bachelor's Degree", "Master's Degree", "Doctoral Degree", "Professional Degree (MD, JD, etc.)"
];

const symptoms = {
  mood: [
    "Depressed Mood", "Anxiety", "Panic", "Irritability", "Mood Swings", 
    "Hopelessness", "Loneliness", "Overwhelmed", "Anger", "Grief"
  ],
  physical: [
    "Fatigue", "Sleep Issues", "Appetite Changes", "Weight Changes", 
    "Chronic Pain", "Headaches", "Muscle Tension", "Nausea", "Dizziness"
  ],
  behavioral: [
    "Isolation", "Avoidance", "Compulsive Behaviors", "Aggression", 
    "Self-Harm", "Impulsivity", "Hyperactivity", "Decreased Motivation"
  ],
  cognitive: [
    "Worry", "Racing Thoughts", "Indecisiveness", "Confusion", 
    "Poor Concentration", "Memory Problems", "Intrusive Thoughts", "Rumination"
  ],
  lifeStressors: [
    "Work Stress", "Financial Problems", "Relationship Issues", "Family Conflict", 
    "Health Concerns", "Loss/Grief", "Major Life Changes", "Trauma", "Legal Issues"
  ]
};

const medicalConditions = [
  "High Blood Pressure", "Diabetes", "Heart Disease", "Stroke", "Cancer",
  "Thyroid Problems", "Chronic Pain", "Respiratory Issues", "Gastrointestinal Issues",
  "Neurological Disorders", "Autoimmune Disorders", "Sleep Disorders"
];

const childhoodExperiences = [
  "Neglect", "Physical Abuse", "Sexual Abuse", "Emotional Abuse", 
  "Parental Divorce/Separation", "Family Substance Abuse",
  "Family Mental Illness", "Incarcerated Household Member", 
  "Domestic Violence", "Bullying", "Frequent Relocations"
];

interface FamilyMember {
  id: string;
  relationshipType: string;
  name: string;
  personality: string;
  relationshipGrowing?: string;
  relationshipNow: string;
}

interface PastTreatment {
  id: string;
  year: string;
  reason: string;
  length: string;
  provider: string;
}

interface Medication {
  id: string;
  name: string;
  purpose: string;
  duration: string;
}

interface PastSpouse {
  id: string;
  name: string;
  personality: string;
  relationship: string;
}

interface SymptomCategories {
  mood: string[];
  physical: string[];
  behavioral: string[];
  cognitive: string[];
  lifeStressors: string[];
}

const ClientHistoryTemplate: React.FC<ClientHistoryTemplateProps> = ({ onClose, onSubmit, clientData }) => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [family, setFamily] = useState<FamilyMember[]>([
    { id: '1', relationshipType: '', name: '', personality: '', relationshipGrowing: '', relationshipNow: '' }
  ]);
  const [currentHousehold, setCurrentHousehold] = useState<FamilyMember[]>([
    { id: '1', relationshipType: '', name: '', personality: '', relationshipNow: '' }
  ]);
  const [treatments, setTreatments] = useState<PastTreatment[]>([
    { id: '1', year: '', reason: '', length: '', provider: '' }
  ]);
  const [medications, setMedications] = useState<Medication[]>([
    { id: '1', name: '', purpose: '', duration: '' }
  ]);
  const [pastSpouses, setPastSpouses] = useState<PastSpouse[]>([
    { id: '1', name: '', personality: '', relationship: '' }
  ]);
  
  const [showPastSpouses, setShowPastSpouses] = useState(false);
  const [showTreatments, setShowTreatments] = useState(false);
  const [showMedications, setShowMedications] = useState(false);
  const [sameHousehold, setSameHousehold] = useState(false);
  const [isMarried, setIsMarried] = useState(false);
  const [selectedSymptoms, setSelectedSymptoms] = useState<string[]>([]);
  const [selectedChildhoodExperiences, setSelectedChildhoodExperiences] = useState<string[]>([]);
  const [selectedMedicalConditions, setSelectedMedicalConditions] = useState<string[]>([]);

  const form = useForm();

  // Add the missing handler functions
  const handleSymptomChange = (symptom: string, isChecked: boolean) => {
    if (isChecked) {
      setSelectedSymptoms([...selectedSymptoms, symptom]);
    } else {
      setSelectedSymptoms(selectedSymptoms.filter(s => s !== symptom));
    }
  };

  const handleChildhoodExperienceChange = (experience: string, isChecked: boolean) => {
    if (isChecked) {
      setSelectedChildhoodExperiences([...selectedChildhoodExperiences, experience]);
    } else {
      setSelectedChildhoodExperiences(selectedChildhoodExperiences.filter(e => e !== experience));
    }
  };

  const handleMedicalConditionChange = (condition: string, isChecked: boolean) => {
    if (isChecked) {
      setSelectedMedicalConditions([...selectedMedicalConditions, condition]);
    } else {
      setSelectedMedicalConditions(selectedMedicalConditions.filter(c => c !== condition));
    }
  };

  const handleAddFamily = () => {
    const newId = Date.now().toString();
    setFamily([...family, { id: newId, relationshipType: '', name: '', personality: '', relationshipGrowing: '', relationshipNow: '' }]);
  };

  const handleAddHousehold = () => {
    const newId = Date.now().toString();
    setCurrentHousehold([...currentHousehold, { id: newId, relationshipType: '', name: '', personality: '', relationshipNow: '' }]);
  };

  const handleAddSpouse = () => {
    const newId = Date.now().toString();
    setPastSpouses([...pastSpouses, { id: newId, name: '', personality: '', relationship: '' }]);
  };

  const handleAddTreatment = () => {
    const newId = Date.now().toString();
    setTreatments([...treatments, { id: newId, year: '', reason: '', length: '', provider: '' }]);
  };

  const handleAddMedication = () => {
    const newId = Date.now().toString();
    setMedications([...medications, { id: newId, name: '', purpose: '', duration: '' }]);
  };

  const fullName = clientData 
    ? `${clientData.client_first_name || ''} ${clientData.client_last_name || ''}`.trim() 
    : '';
  
  const formattedDOB = clientData?.client_date_of_birth || '';
  
  const handleSubmit = (formData: any) => {
    const submissionData = {
      ...formData,
      formElementId: 'client-history-form-content',
      fullName: fullName,
      dateOfBirth: formattedDOB,
      age: clientData?.client_age?.toString() || '',
      state: clientData?.client_state || '',
      phoneNumber: clientData?.client_phone || '',
      email: clientData?.client_email || '',
    };
    
    onSubmit(submissionData);
  };

  return (
    <div className="flex flex-col min-h-screen bg-gray-50 p-4 md:p-8">
      <div className="mb-6 flex items-center">
        <Button variant="ghost" onClick={onClose} className="mr-2">
          <ChevronLeft className="h-5 w-5 mr-1" />
          Back
        </Button>
        <h1 className="text-2xl font-bold">Client History Form</h1>
      </div>

      <form 
        id="client-history-form-content"
        onSubmit={(e) => { 
          e.preventDefault(); 
          handleSubmit({
            personalStrengths: (document.getElementById('strengths') as HTMLTextAreaElement)?.value,
            hobbies: (document.getElementById('hobbies') as HTMLTextAreaElement)?.value,
            educationLevel: (document.getElementById('education') as HTMLSelectElement)?.value,
            occupationDetails: (document.getElementById('occupation') as HTMLTextAreaElement)?.value,
            sleepHours: (document.getElementById('sleepHours') as HTMLInputElement)?.value,
            currentIssues: (document.getElementById('currentIssues') as HTMLTextAreaElement)?.value,
            progressionOfIssues: (document.getElementById('progressionOfIssues') as HTMLTextAreaElement)?.value,
            relationshipProblems: (document.getElementById('relationshipProblems') as HTMLTextAreaElement)?.value,
            counselingGoals: (document.getElementById('counselingGoals') as HTMLTextAreaElement)?.value,
            emergencyName: (document.getElementById('emergencyName') as HTMLInputElement)?.value,
            emergencyPhone: (document.getElementById('emergencyPhone') as HTMLInputElement)?.value,
            emergencyRelationship: (document.getElementById('emergencyRelationship') as HTMLInputElement)?.value,
            signature: (document.getElementById('signature') as HTMLInputElement)?.value,
            selectedConditions: selectedMedicalConditions
          }); 
        }} 
        className="space-y-8 mb-8"
      >
        <Card>
          <CardHeader>
            <CardTitle>Client Information</CardTitle>
            <CardDescription>Your personal information (auto-populated from your profile)</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="fullName">Full Name</Label>
                <Input id="fullName" value={fullName} readOnly className="bg-gray-100" />
              </div>
              <div>
                <Label htmlFor="dateOfBirth">Date of Birth</Label>
                <Input id="dateOfBirth" value={formattedDOB} readOnly className="bg-gray-100" />
              </div>
              <div>
                <Label htmlFor="age">Age</Label>
                <Input id="age" value={clientData?.client_age || ''} readOnly className="bg-gray-100" />
              </div>
              <div>
                <Label htmlFor="state">State</Label>
                <Input id="state" value={clientData?.client_state || ''} readOnly className="bg-gray-100" />
              </div>
              <div>
                <Label htmlFor="phoneNumber">Phone Number</Label>
                <Input id="phoneNumber" value={clientData?.client_phone || ''} readOnly className="bg-gray-100" />
              </div>
              <div>
                <Label htmlFor="email">Email Address</Label>
                <Input id="email" value={clientData?.client_email || ''} readOnly className="bg-gray-100" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Emergency Contact</CardTitle>
            <CardDescription>Person to contact in case of emergency</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="emergencyName">Name</Label>
                <Input id="emergencyName" placeholder="Enter emergency contact name" />
              </div>
              <div>
                <Label htmlFor="emergencyRelationship">Relationship</Label>
                <Input id="emergencyRelationship" placeholder="Enter relationship" />
              </div>
              <div>
                <Label htmlFor="emergencyPhone">Phone Number</Label>
                <Input id="emergencyPhone" placeholder="Enter emergency contact phone" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Current Status</CardTitle>
            <CardDescription>Information about your current situation and concerns</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div>
              <Label htmlFor="currentIssues">What current issues are you wanting to discuss with your counselor? Be as detailed as you can</Label>
              <Textarea id="currentIssues" className="mt-1 min-h-[120px]" placeholder="Describe your current issues..." />
            </div>
            
            <div>
              <Label htmlFor="progressionOfIssues">Describe when the client began exhibiting problems listed above. How has this progressed over time?</Label>
              <Textarea id="progressionOfIssues" className="mt-1 min-h-[120px]" placeholder="Describe the progression..." />
            </div>
            
            <div>
              <Label className="mb-2 block">Please check any of the following you have experienced in the past six months</Label>
              
              <div className="mb-6">
                <h4 className="text-md font-medium mb-2">Mood/Emotions</h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                  {symptoms.mood.map((symptom) => (
                    <div key={symptom} className="flex items-center space-x-2">
                      <Checkbox 
                        id={`mood-${symptom}`} 
                        onCheckedChange={(checked) => 
                          handleSymptomChange(symptom, checked === true)
                        }
                      />
                      <Label htmlFor={`mood-${symptom}`}>{symptom}</Label>
                    </div>
                  ))}
                </div>
              </div>
              
              <div className="mb-6">
                <h4 className="text-md font-medium mb-2">Physical</h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                  {symptoms.physical.map((symptom) => (
                    <div key={symptom} className="flex items-center space-x-2">
                      <Checkbox 
                        id={`physical-${symptom}`} 
                        onCheckedChange={(checked) => 
                          handleSymptomChange(symptom, checked === true)
                        }
                      />
                      <Label htmlFor={`physical-${symptom}`}>{symptom}</Label>
                    </div>
                  ))}
                </div>
              </div>
              
              <div className="mb-6">
                <h4 className="text-md font-medium mb-2">Behavioral/Social</h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                  {symptoms.behavioral.map((symptom) => (
                    <div key={symptom} className="flex items-center space-x-2">
                      <Checkbox 
                        id={`behavioral-${symptom}`} 
                        onCheckedChange={(checked) => 
                          handleSymptomChange(symptom, checked === true)
                        }
                      />
                      <Label htmlFor={`behavioral-${symptom}`}>{symptom}</Label>
                    </div>
                  ))}
                </div>
              </div>
              
              <div className="mb-6">
                <h4 className="text-md font-medium mb-2">Cognitive</h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                  {symptoms.cognitive.map((symptom) => (
                    <div key={symptom} className="flex items-center space-x-2">
                      <Checkbox 
                        id={`cognitive-${symptom}`} 
                        onCheckedChange={(checked) => 
                          handleSymptomChange(symptom, checked === true)
                        }
                      />
                      <Label htmlFor={`cognitive-${symptom}`}>{symptom}</Label>
                    </div>
                  ))}
                </div>
              </div>
              
              <div className="mb-6">
                <h4 className="text-md font-medium mb-2">Life Stressors</h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                  {symptoms.lifeStressors.map((symptom) => (
                    <div key={symptom} className="flex items-center space-x-2">
                      <Checkbox 
                        id={`stressor-${symptom}`} 
                        onCheckedChange={(checked) => 
                          handleSymptomChange(symptom, checked === true)
                        }
                      />
                      <Label htmlFor={`stressor-${symptom}`}>{symptom}</Label>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            
            <div>
              <Label className="mb-2 block">Have you ever been hospitalized for a psychiatric issue?</Label>
              <RadioGroup defaultValue="no" className="flex space-x-4">
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="yes" id="hospitalized-yes" />
                  <Label htmlFor="hospitalized-yes">Yes</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="no" id="hospitalized-no" />
                  <Label htmlFor="hospitalized-no">No</Label>
                </div>
              </RadioGroup>
            </div>
            
            <div>
              <Label className="mb-2 block">Have you ever attempted suicide?</Label>
              <RadioGroup defaultValue="no" className="flex space-x-4">
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="yes" id="suicide-yes" />
                  <Label htmlFor="suicide-yes">Yes</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="no" id="suicide-no" />
                  <Label htmlFor="suicide-no">No</Label>
                </div>
              </RadioGroup>
            </div>
            
            <div>
              <Label className="mb-2 block">Have you ever been placed on a psych hold?</Label>
              <RadioGroup defaultValue="no" className="flex space-x-4">
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="yes" id="psychhold-yes" />
                  <Label htmlFor="psychhold-yes">Yes</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="no" id="psychhold-no" />
                  <Label htmlFor="psychhold-no">No</Label>
                </div>
              </RadioGroup>
            </div>
            
            <div>
              <Label htmlFor="lifeChanges">Has there been any significant life change that has occurred recently or around the time that symptoms started to occur?</Label>
              <Textarea id="lifeChanges" className="mt-1 min-h-[120px]" placeholder="Describe any significant life changes..." />
            </div>
            
            <div>
              <Label htmlFor="additionalInfo">Is there anything else that you would like to mention or clarify about the above information?</Label>
              <Textarea id="additionalInfo" className="mt-1 min-h-[120px]" placeholder="Add any additional information..." />
            </div>
            
            <div>
              <Label htmlFor="counselingGoals">What are your goals for counseling? What would success look like for you?</Label>
              <Textarea id="counselingGoals" className="mt-1 min-h-[120px]" placeholder="Describe your counseling goals..." />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Family History</CardTitle>
            <CardDescription>Information about your family background</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div>
              <Label className="mb-4 block">Your Family (as you experienced them growing up)</Label>
              {family.map((member, index) => (
                <div key={member.id} className="mb-6 p-4 border rounded-md bg-gray-50">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                    <div>
                      <Label htmlFor={`familyType-${index}`}>Relationship Type</Label>
                      <Select>
                        <SelectTrigger id={`familyType-${index}`}>
                          <SelectValue placeholder="Select relationship type" />
                        </SelectTrigger>
                        <SelectContent>
                          {relationshipTypes.map(type => (
                            <SelectItem key={type} value={type}>{type}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label htmlFor={`familyName-${index}`}>Name</Label>
                      <Input id={`familyName-${index}`} placeholder="Enter name" />
                    </div>
                    <div>
                      <Label htmlFor={`familyPersonality-${index}`}>Their Personality</Label>
                      <Input id={`familyPersonality-${index}`} placeholder="Describe their personality" />
                    </div>
                    <div>
                      <Label htmlFor={`familyRelationshipGrowing-${index}`}>How was Your Relationship while Growing Up?</Label>
                      <Input id={`familyRelationshipGrowing-${index}`} placeholder="Describe your relationship" />
                    </div>
                    <div>
                      <Label htmlFor={`familyRelationshipNow-${index}`}>How is Your Relationship Now?</Label>
                      <Input id={`familyRelationshipNow-${index}`} placeholder="Describe your current relationship" />
                    </div>
                  </div>
                  {family.length > 1 && (
                    <Button 
                      type="button" 
                      variant="outline" 
                      size="sm"
                      onClick={() => setFamily(family.filter(f => f.id !== member.id))}
                    >
                      <X className="h-4 w-4 mr-1" /> Remove
                    </Button>
                  )}
                </div>
              ))}
              <Button 
                type="button" 
                variant="outline" 
                className="mt-2" 
                onClick={handleAddFamily}
              >
                <Plus className="h-4 w-4 mr-1" /> Add Family Member
              </Button>
            </div>
            
            <div>
              <Label className="mb-2 block">Childhood Experience (Check all that Apply)</Label>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                {childhoodExperiences.map((experience) => (
                  <div key={experience} className="flex items-center space-x-2">
                    <Checkbox 
                      id={`childhood-${experience}`} 
                      onCheckedChange={(checked) => 
                        handleChildhoodExperienceChange(experience, checked === true)
                      }
                    />
                    <Label htmlFor={`childhood-${experience}`}>{experience}</Label>
                  </div>
                ))}
              </div>
              
              <div className="mt-4">
                <Label htmlFor="childhoodElaboration">
                  If you checked any of the boxes above, please feel free to elaborate on them here, and discuss any other childhood experiences that would help your therapist better help you.
                </Label>
                <Textarea 
                  id="childhoodElaboration" 
                  className="mt-2 min-h-[120px]" 
                  placeholder="Please elaborate on your childhood experiences..."
                />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Current Information</CardTitle>
            <CardDescription>Information about your current living situation</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div>
              <Label className="mb-2 block">Is your Family listed above the same as your Current Household?</Label>
              <RadioGroup 
                defaultValue="no" 
                className="flex space-x-4" 
                onValueChange={(value) => setSameHousehold(value === "yes")}
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="yes" id="sameHousehold-yes" />
                  <Label htmlFor="sameHousehold-yes">Yes</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="no" id="sameHousehold-no" />
                  <Label htmlFor="sameHousehold-no">No</Label>
                </div>
              </RadioGroup>
            </div>
            
            {!sameHousehold && (
              <div>
                <Label className="mb-4 block">Members of Your Current Household</Label>
                {currentHousehold.map((member, index) => (
                  <div key={member.id} className="mb-6 p-4 border rounded-md bg-gray-50">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                      <div>
                        <Label htmlFor={`householdType-${index}`}>Relationship Type</Label>
                        <Select>
                          <SelectTrigger id={`householdType-${index}`}>
                            <SelectValue placeholder="Select relationship type" />
                          </SelectTrigger>
                          <SelectContent>
                            {relationshipTypes.map(type => (
                              <SelectItem key={type} value={type}>{type}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label htmlFor={`householdName-${index}`}>Name</Label>
                        <Input id={`householdName-${index}`} placeholder="Enter name" />
                      </div>
                      <div>
                        <Label htmlFor={`householdPersonality-${index}`}>Their Personality</Label>
                        <Input id={`householdPersonality-${index}`} placeholder="Describe their personality" />
                      </div>
                      <div>
                        <Label htmlFor={`householdRelationship-${index}`}>How is Your Relationship?</Label>
                        <Input id={`householdRelationship-${index}`} placeholder="Describe your relationship" />
                      </div>
                    </div>
                    {currentHousehold.length > 1 && (
                      <Button 
                        type="button" 
                        variant="outline" 
                        size="sm"
                        onClick={() => setCurrentHousehold(currentHousehold.filter(h => h.id !== member.id))}
                      >
                        <X className="h-4 w-4 mr-1" /> Remove
                      </Button>
                    )}
                  </div>
                ))}
                <Button 
                  type="button" 
                  variant="outline" 
                  className="mt-2" 
                  onClick={handleAddHousehold}
                >
                  <Plus className="h-4 w-4 mr-1" /> Add Household Member
                </Button>
              </div>
            )}
            
            <div>
              <Label htmlFor="occupation">What is your current occupation? What do you do? How long have you been doing it?</Label>
              <Textarea id="occupation" placeholder="Describe your current occupation..." />
            </div>
            
            <div>
              <Label htmlFor="education">Highest Level of Education Completed</Label>
              <Select>
                <SelectTrigger id="education">
                  <SelectValue placeholder="Select education level" />
                </SelectTrigger>
                <SelectContent>
                  {educationOptions.map(option => (
                    <SelectItem key={option} value={option}>{option}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Relationship History</CardTitle>
            <CardDescription>Information about your past and current relationships</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div>
              <Label className="mb-2 block">Are you Married?</Label>
              <RadioGroup 
                defaultValue="no" 
                className="flex space-x-4"
                onValueChange={(value) => setIsMarried(value === "yes")}
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="yes" id="married-yes" />
                  <Label htmlFor="married-yes">Yes</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="no" id="married-no" />
                  <Label htmlFor="married-no">No</Label>
                </div>
              </RadioGroup>
            </div>
            
            {isMarried && (
              <div className="p-4 border rounded-md bg-gray-50">
                <h4 className="font-medium mb-3">Current Spouse</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="spouseName">Name</Label>
                    <Input id="spouseName" placeholder="Enter name" />
                  </div>
                  <div>
                    <Label htmlFor="spousePersonality">Their Personality</Label>
                    <Input id="spousePersonality" placeholder="Describe their personality" />
                  </div>
                  <div>
                    <Label htmlFor="spouseRelationship">How is Your Relationship?</Label>
                    <Input id="spouseRelationship" placeholder="Describe your relationship" />
                  </div>
                </div>
              </div>
            )}
            
            <div>
              <Label className="mb-2 block">Have you ever been Married Before?</Label>
              <RadioGroup 
                defaultValue="no" 
                className="flex space-x-4"
                onValueChange={(value) => setShowPastSpouses(value === "yes")}
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="yes" id="pastMarried-yes" />
                  <Label htmlFor="pastMarried-yes">Yes</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="no" id="pastMarried-no" />
                  <Label htmlFor="pastMarried-no">No</Label>
                </div>
              </RadioGroup>
            </div>
            
            {showPastSpouses && (
              <div>
                <Label className="mb-4 block">Past Spouse(s)</Label>
                {pastSpouses.map((spouse, index) => (
                  <div key={spouse.id} className="mb-6 p-4 border rounded-md bg-gray-50">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                      <div>
                        <Label htmlFor={`pastSpouseName-${index}`}>Name</Label>
                        <Input id={`pastSpouseName-${index}`} placeholder="Enter name" />
                      </div>
                      <div>
                        <Label htmlFor={`pastSpousePersonality-${index}`}>Their Personality</Label>
                        <Input id={`pastSpousePersonality-${index}`} placeholder="Describe their personality" />
                      </div>
                      <div>
                        <Label htmlFor={`pastSpouseRelationship-${index}`}>How was Your Relationship?</Label>
                        <Input id={`pastSpouseRelationship-${index}`} placeholder="Describe your relationship" />
                      </div>
                    </div>
                    {pastSpouses.length > 1 && (
                      <Button 
                        type="button" 
                        variant="outline" 
                        size="sm"
                        onClick={() => setPastSpouses(pastSpouses.filter(s => s.id !== spouse.id))}
                      >
                        <X className="h-4 w-4 mr-1" /> Remove
                      </Button>
                    )}
                  </div>
                ))}
                <Button 
                  type="button" 
                  variant="outline" 
                  className="mt-2" 
                  onClick={handleAddSpouse}
                >
                  <Plus className="h-4 w-4 mr-1" /> Add Past Spouse
                </Button>
              </div>
            )}
            
            <div>
              <Label htmlFor="relationshipProblems">Describe any typical problems experienced in past or current marriages or co-habitation relationships</Label>
              <Textarea id="relationshipProblems" placeholder="Describe any relationship problems..." className="min-h-[120px]" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Medical and Mental Health History</CardTitle>
            <CardDescription>Information about your medical and mental health background</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div>
              <Label className="mb-2 block">Have you ever received Mental Health Treatment before?</Label>
              <RadioGroup 
                defaultValue="no" 
                className="flex space-x-4"
                onValueChange={(value) => setShowTreatments(value === "yes")}
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="yes" id="mentalHealth-yes" />
                  <Label htmlFor="mentalHealth-yes">Yes</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="no" id="mentalHealth-no" />
                  <Label htmlFor="mentalHealth-no">No</Label>
                </div>
              </RadioGroup>
            </div>
            
            {showTreatments && (
              <div>
                <Label className="mb-4 block">Please list any current or past mental health professionals who have treated you as well as any psychiatric hospitalizations or addiction treatment facilities you have experienced</Label>
                {treatments.map((treatment, index) => (
                  <div key={treatment.id} className="mb-6 p-4 border rounded-md bg-gray-50">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                      <div>
                        <Label htmlFor={`treatmentYear-${index}`}>Last Year Treatment was Received</Label>
                        <Input id={`treatmentYear-${index}`} placeholder="Enter year" />
                      </div>
                      <div>
                        <Label htmlFor={`treatmentReason-${index}`}>Reason for Treatment</Label>
                        <Input id={`treatmentReason-${index}`} placeholder="Enter reason" />
                      </div>
                      <div>
                        <Label htmlFor={`treatmentLength-${index}`}>Treatment Length</Label>
                        <Input id={`treatmentLength-${index}`} placeholder="Enter length" />
                      </div>
                      <div>
                        <Label htmlFor={`treatmentProvider-${index}`}>Provider/Hospital Name</Label>
                        <Input id={`treatmentProvider-${index}`} placeholder="Enter provider name" />
                      </div>
                    </div>
                    {treatments.length > 1 && (
                      <Button 
                        type="button" 
                        variant="outline" 
                        size="sm"
                        onClick={() => setTreatments(treatments.filter(t => t.id !== treatment.id))}
                      >
                        <X className="h-4 w-4 mr-1" /> Remove
                      </Button>
                    )}
                  </div>
                ))}
                <Button 
                  type="button" 
                  variant="outline" 
                  className="mt-2" 
                  onClick={handleAddTreatment}
                >
                  <Plus className="h-4 w-4 mr-1" /> Add Treatment
                </Button>
              </div>
            )}
            
            <div>
              <Label className="mb-2 block">Please Check any of the following that apply</Label>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                {medicalConditions.map((condition) => (
                  <div key={condition} className="flex items-center space-x-2">
                    <Checkbox 
                      id={`medical-${condition}`} 
                      onCheckedChange={(checked) => 
                        handleMedicalConditionChange(condition, checked === true)
                      }
                    />
                    <Label htmlFor={`medical-${condition}`}>{condition}</Label>
                  </div>
                ))}
              </div>
            </div>
            
            <div>
              <Label htmlFor="chronicHealth">List any other chronic health problems or concerns</Label>
              <Textarea id="chronicHealth" placeholder="Describe any chronic health problems..." className="min-h-[120px]" />
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label htmlFor="sleepHours">Average hours slept each night?</Label>
                <Input id="sleepHours" placeholder="Enter hours" />
              </div>
              <div>
                <Label htmlFor="alcoholUse">Average Weekly Alcoholic Beverages Consumed</Label>
                <Input id="alcoholUse" placeholder="Enter number" />
              </div>
              <div>
                <Label htmlFor="tobaccoUse">Tobacco Use per Day</Label>
                <Input id="tobaccoUse" placeholder="Enter amount" />
              </div>
            </div>
            
            <div>
              <Label htmlFor="drugUse">Recreational Drugs used in the Past Year</Label>
              <Textarea id="drugUse" placeholder="List any drugs used..." />
            </div>
            
            <div>
              <Label className="mb-2 block">Do you take any prescription medications?</Label>
              <RadioGroup 
                defaultValue="no" 
                className="flex space-x-4"
                onValueChange={(value) => setShowMedications(value === "yes")}
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="yes" id="medications-yes" />
                  <Label htmlFor="medications-yes">Yes</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="no" id="medications-no" />
                  <Label htmlFor="medications-no">No</Label>
                </div>
              </RadioGroup>
            </div>
            
            {showMedications && (
              <div>
                <Label className="mb-4 block">Medications</Label>
                {medications.map((medication, index) => (
                  <div key={medication.id} className="mb-6 p-4 border rounded-md bg-gray-50">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                      <div>
                        <Label htmlFor={`medicationName-${index}`}>Name of Medication</Label>
                        <Input id={`medicationName-${index}`} placeholder="Enter medication name" />
                      </div>
                      <div>
                        <Label htmlFor={`medicationPurpose-${index}`}>Purpose</Label>
                        <Input id={`medicationPurpose-${index}`} placeholder="Enter purpose" />
                      </div>
                      <div>
                        <Label htmlFor={`medicationDuration-${index}`}>How long have you taken this?</Label>
                        <Input id={`medicationDuration-${index}`} placeholder="Enter duration" />
                      </div>
                    </div>
                    {medications.length > 1 && (
                      <Button 
                        type="button" 
                        variant="outline" 
                        size="sm"
                        onClick={() => setMedications(medications.filter(m => m.id !== medication.id))}
                      >
                        <X className="h-4 w-4 mr-1" /> Remove
                      </Button>
                    )}
                  </div>
                ))}
                <Button 
                  type="button" 
                  variant="outline" 
                  className="mt-2" 
                  onClick={handleAddMedication}
                >
                  <Plus className="h-4 w-4 mr-1" /> Add Medication
                </Button>
              </div>
            )}
            
            <div>
              <Label htmlFor="strengths">Tell me about your personal strengths and important accomplishments</Label>
              <Textarea id="strengths" placeholder="Describe your personal strengths and accomplishments..." className="min-h-[120px]" />
            </div>
            
            <div>
              <Label htmlFor="hobbies">Please list any hobbies or activities you participate in</Label>
              <Textarea id="hobbies" placeholder="List hobbies and activities..." className="min-h-[120px]" />
            </div>
            
            <div>
              <Label htmlFor="additionalInfo2">What else would you like me to know?</Label>
              <Textarea id="additionalInfo2" placeholder="Any additional information..." className="min-h-[120px]" />
            </div>
            
            <div>
              <Label htmlFor="signature">Signature (type your name as the person signing this)</Label>
              <Input id="signature" placeholder="Type your full name" />
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-end gap-4">
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit">
            <Save className="h-4 w-4 mr-1" />
            Submit Form
          </Button>
        </div>
      </form>
    </div>
  );
};

export default ClientHistoryTemplate;
