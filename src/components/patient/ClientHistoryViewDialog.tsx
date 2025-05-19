
import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { format } from 'date-fns';
import { Loader2 } from 'lucide-react';

interface ClientHistoryData {
  main: any;
  family: any[];
  household: any[];
  spouses: any[];
  treatments: any[];
  medications: any[];
  currentSpouse: any | null;
}

interface ClientHistoryViewDialogProps {
  isOpen: boolean;
  onClose: () => void;
  data: ClientHistoryData | null;
  isLoading: boolean;
}

const ClientHistoryViewDialog: React.FC<ClientHistoryViewDialogProps> = ({
  isOpen,
  onClose,
  data,
  isLoading
}) => {
  if (!isOpen) return null;
  
  if (isLoading) {
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <div className="flex justify-center items-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-valorwell-600" />
          </div>
        </DialogContent>
      </Dialog>
    );
  }
  
  if (!data || !data.main) {
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>Client History</DialogTitle>
          </DialogHeader>
          <div className="py-6 text-center">
            <p>No client history data found.</p>
          </div>
          <DialogFooter>
            <Button onClick={onClose}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }
  
  // Process JSON fields safely
  const safeParseJson = (jsonString: string | null | undefined, defaultValue: any[] = []) => {
    if (!jsonString) return defaultValue;
    try {
      return typeof jsonString === 'string' ? JSON.parse(jsonString) : jsonString;
    } catch (e) {
      console.error('Error parsing JSON:', e);
      return defaultValue;
    }
  };
    
  // Process symptoms
  const selectedSymptoms = safeParseJson(data.main.selected_symptoms, []);
    
  // Process childhood experiences
  const selectedChildhoodExperiences = safeParseJson(data.main.selected_childhood_experiences, []);
    
  // Process medical conditions
  const selectedMedicalConditions = safeParseJson(data.main.selected_medical_conditions, []);
  
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Client History Form</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6 pt-4">
          {/* Current Issues Section */}
          <Card>
            <CardContent className="pt-6">
              <h3 className="text-lg font-medium mb-4">Current Issues</h3>
              
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium">What are the main issues you are currently experiencing?</label>
                  <div className="p-3 bg-gray-50 rounded mt-1 border">
                    {data.main.current_issues || "N/A"}
                  </div>
                </div>
                
                <div>
                  <label className="text-sm font-medium">How have these issues progressed over time?</label>
                  <div className="p-3 bg-gray-50 rounded mt-1 border">
                    {data.main.progression_of_issues || "N/A"}
                  </div>
                </div>
                
                <div>
                  <label className="text-sm font-medium">Have there been significant changes in your life recently?</label>
                  <div className="p-3 bg-gray-50 rounded mt-1 border">
                    {data.main.life_changes || "N/A"}
                  </div>
                </div>
                
                <div>
                  <label className="text-sm font-medium">What are your goals for counseling?</label>
                  <div className="p-3 bg-gray-50 rounded mt-1 border">
                    {data.main.counseling_goals || "N/A"}
                  </div>
                </div>
              </div>
              
              <h4 className="text-md font-medium mt-6 mb-2">I am experiencing these symptoms:</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                {selectedSymptoms.map((symptom: string, index: number) => (
                  <div key={index} className="flex items-center gap-2">
                    <div className="w-4 h-4 bg-valorwell-500 rounded-sm"></div>
                    <span>{symptom}</span>
                  </div>
                ))}
                {selectedSymptoms.length === 0 && (
                  <span className="text-gray-500 italic">No symptoms selected</span>
                )}
              </div>
            </CardContent>
          </Card>
          
          {/* Family Section */}
          <Card>
            <CardContent className="pt-6">
              <h3 className="text-lg font-medium mb-4">Family</h3>
              
              <h4 className="text-md font-medium mb-2">Family of Origin</h4>
              {data.family && data.family.length > 0 ? (
                <div className="space-y-4">
                  {data.family.map((member, index) => (
                    <div key={index} className="p-3 bg-gray-50 rounded border">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="text-sm font-medium">Relationship</label>
                          <div className="mt-1">{member.relationship_type || "N/A"}</div>
                        </div>
                        <div>
                          <label className="text-sm font-medium">Name</label>
                          <div className="mt-1">{member.name || "N/A"}</div>
                        </div>
                        <div>
                          <label className="text-sm font-medium">Personality</label>
                          <div className="mt-1">{member.personality || "N/A"}</div>
                        </div>
                        <div>
                          <label className="text-sm font-medium">Relationship Growing Up</label>
                          <div className="mt-1">{member.relationship_growing || "N/A"}</div>
                        </div>
                        <div>
                          <label className="text-sm font-medium">Relationship Now</label>
                          <div className="mt-1">{member.relationship_now || "N/A"}</div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-500 italic">No family members added</p>
              )}
              
              <h4 className="text-md font-medium mt-6 mb-2">Childhood Experiences</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                {selectedChildhoodExperiences.map((experience: string, index: number) => (
                  <div key={index} className="flex items-center gap-2">
                    <div className="w-4 h-4 bg-valorwell-500 rounded-sm"></div>
                    <span>{experience}</span>
                  </div>
                ))}
                {selectedChildhoodExperiences.length === 0 && (
                  <span className="text-gray-500 italic">No experiences selected</span>
                )}
              </div>
              
              <div className="mt-4">
                <label className="text-sm font-medium">Additional information about your childhood</label>
                <div className="p-3 bg-gray-50 rounded mt-1 border">
                  {data.main.childhood_elaboration || "N/A"}
                </div>
              </div>
            </CardContent>
          </Card>
          
          {/* Current Household Section */}
          <Card>
            <CardContent className="pt-6">
              <h3 className="text-lg font-medium mb-4">Current Household Members</h3>
              
              {data.household && data.household.length > 0 ? (
                <div className="space-y-4">
                  {data.household.map((member, index) => (
                    <div key={index} className="p-3 bg-gray-50 rounded border">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="text-sm font-medium">Relationship</label>
                          <div className="mt-1">{member.relationship_type || "N/A"}</div>
                        </div>
                        <div>
                          <label className="text-sm font-medium">Name</label>
                          <div className="mt-1">{member.name || "N/A"}</div>
                        </div>
                        <div>
                          <label className="text-sm font-medium">Personality</label>
                          <div className="mt-1">{member.personality || "N/A"}</div>
                        </div>
                        <div>
                          <label className="text-sm font-medium">Relationship Now</label>
                          <div className="mt-1">{member.relationship_now || "N/A"}</div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-500 italic">No household members added</p>
              )}
            </CardContent>
          </Card>
          
          {/* Educational & Occupational History */}
          <Card>
            <CardContent className="pt-6">
              <h3 className="text-lg font-medium mb-4">Educational & Occupational History</h3>
              
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium">Highest education level achieved</label>
                  <div className="p-3 bg-gray-50 rounded mt-1 border">
                    {data.main.education_level || "N/A"}
                  </div>
                </div>
                
                <div>
                  <label className="text-sm font-medium">Current occupation and work history</label>
                  <div className="p-3 bg-gray-50 rounded mt-1 border">
                    {data.main.occupation_details || "N/A"}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
          
          {/* Relationship History */}
          <Card>
            <CardContent className="pt-6">
              <h3 className="text-lg font-medium mb-4">Relationship History</h3>
              
              <div className="mb-4">
                <label className="text-sm font-medium">Are you currently married?</label>
                <div className="mt-1">
                  {data.main.is_married ? "Yes" : "No"}
                </div>
              </div>
              
              {data.main.is_married && data.currentSpouse && (
                <div className="p-3 bg-gray-50 rounded border mb-4">
                  <h4 className="font-medium mb-2">Current Spouse/Partner</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="text-sm font-medium">Name</label>
                      <div className="mt-1">{data.currentSpouse.name || "N/A"}</div>
                    </div>
                    <div>
                      <label className="text-sm font-medium">Personality</label>
                      <div className="mt-1">{data.currentSpouse.personality || "N/A"}</div>
                    </div>
                    <div>
                      <label className="text-sm font-medium">Relationship</label>
                      <div className="mt-1">{data.currentSpouse.relationship || "N/A"}</div>
                    </div>
                  </div>
                </div>
              )}
              
              <div className="mb-4">
                <label className="text-sm font-medium">Have you had previous significant relationships or marriages?</label>
                <div className="mt-1">
                  {data.main.has_past_spouses ? "Yes" : "No"}
                </div>
              </div>
              
              {data.main.has_past_spouses && data.spouses && data.spouses.length > 0 ? (
                <div className="space-y-4">
                  <h4 className="font-medium">Previous Spouses/Partners</h4>
                  {data.spouses.map((spouse, index) => (
                    <div key={index} className="p-3 bg-gray-50 rounded border">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="text-sm font-medium">Name</label>
                          <div className="mt-1">{spouse.name || "N/A"}</div>
                        </div>
                        <div>
                          <label className="text-sm font-medium">Personality</label>
                          <div className="mt-1">{spouse.personality || "N/A"}</div>
                        </div>
                        <div>
                          <label className="text-sm font-medium">Relationship</label>
                          <div className="mt-1">{spouse.relationship || "N/A"}</div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                data.main.has_past_spouses && <p className="text-gray-500 italic">No previous spouses/partners added</p>
              )}
              
              <div className="mt-4">
                <label className="text-sm font-medium">Describe any relationship problems you are experiencing</label>
                <div className="p-3 bg-gray-50 rounded mt-1 border">
                  {data.main.relationship_problems || "N/A"}
                </div>
              </div>
            </CardContent>
          </Card>
          
          {/* Medical & Mental Health History */}
          <Card>
            <CardContent className="pt-6">
              <h3 className="text-lg font-medium mb-4">Medical & Mental Health History</h3>
              
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium">Do you have any chronic health problems?</label>
                  <div className="p-3 bg-gray-50 rounded mt-1 border">
                    {data.main.chronic_health_problems || "N/A"}
                  </div>
                </div>
                
                <h4 className="text-md font-medium mb-2">Medical Conditions</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                  {selectedMedicalConditions.map((condition: string, index: number) => (
                    <div key={index} className="flex items-center gap-2">
                      <div className="w-4 h-4 bg-valorwell-500 rounded-sm"></div>
                      <span>{condition}</span>
                    </div>
                  ))}
                  {selectedMedicalConditions.length === 0 && (
                    <span className="text-gray-500 italic">No medical conditions selected</span>
                  )}
                </div>
                
                <div>
                  <label className="text-sm font-medium">Are you currently taking any medications?</label>
                  <div className="mt-1">
                    {data.main.takes_medications ? "Yes" : "No"}
                  </div>
                </div>
                
                {data.main.takes_medications && data.medications && data.medications.length > 0 ? (
                  <div className="space-y-2">
                    <h4 className="font-medium">Medications</h4>
                    {data.medications.map((medication, index) => (
                      <div key={index} className="p-3 bg-gray-50 rounded border">
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                          <div>
                            <label className="text-sm font-medium">Name</label>
                            <div className="mt-1">{medication.name || "N/A"}</div>
                          </div>
                          <div>
                            <label className="text-sm font-medium">Purpose</label>
                            <div className="mt-1">{medication.purpose || "N/A"}</div>
                          </div>
                          <div>
                            <label className="text-sm font-medium">Duration</label>
                            <div className="mt-1">{medication.duration || "N/A"}</div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  data.main.takes_medications && <p className="text-gray-500 italic">No medications added</p>
                )}
                
                <div>
                  <label className="text-sm font-medium">Have you ever received mental health treatment?</label>
                  <div className="mt-1">
                    {data.main.has_received_mental_health_treatment ? "Yes" : "No"}
                  </div>
                </div>
                
                {data.main.has_received_mental_health_treatment && data.treatments && data.treatments.length > 0 ? (
                  <div className="space-y-2">
                    <h4 className="font-medium">Previous Mental Health Treatments</h4>
                    {data.treatments.map((treatment, index) => (
                      <div key={index} className="p-3 bg-gray-50 rounded border">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <div>
                            <label className="text-sm font-medium">Provider</label>
                            <div className="mt-1">{treatment.provider || "N/A"}</div>
                          </div>
                          <div>
                            <label className="text-sm font-medium">Year</label>
                            <div className="mt-1">{treatment.year || "N/A"}</div>
                          </div>
                          <div>
                            <label className="text-sm font-medium">Reason</label>
                            <div className="mt-1">{treatment.reason || "N/A"}</div>
                          </div>
                          <div>
                            <label className="text-sm font-medium">Length of Treatment</label>
                            <div className="mt-1">{treatment.length || "N/A"}</div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  data.main.has_received_mental_health_treatment && <p className="text-gray-500 italic">No previous treatments added</p>
                )}
                
                <div>
                  <label className="text-sm font-medium">Have you ever been hospitalized for psychiatric reasons?</label>
                  <div className="mt-1">
                    {data.main.hospitalized_psychiatric ? "Yes" : "No"}
                  </div>
                </div>
                
                <div>
                  <label className="text-sm font-medium">Have you ever been on a psychiatric hold?</label>
                  <div className="mt-1">
                    {data.main.psych_hold ? "Yes" : "No"}
                  </div>
                </div>
                
                <div>
                  <label className="text-sm font-medium">Have you ever attempted suicide?</label>
                  <div className="mt-1">
                    {data.main.attempted_suicide ? "Yes" : "No"}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
          
          {/* Lifestyle & Habits Section */}
          <Card>
            <CardContent className="pt-6">
              <h3 className="text-lg font-medium mb-4">Lifestyle & Habits</h3>
              
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium">How many hours of sleep do you typically get?</label>
                  <div className="p-3 bg-gray-50 rounded mt-1 border">
                    {data.main.sleep_hours || "N/A"}
                  </div>
                </div>
                
                <div>
                  <label className="text-sm font-medium">Describe your alcohol use</label>
                  <div className="p-3 bg-gray-50 rounded mt-1 border">
                    {data.main.alcohol_use || "N/A"}
                  </div>
                </div>
                
                <div>
                  <label className="text-sm font-medium">Describe your tobacco use</label>
                  <div className="p-3 bg-gray-50 rounded mt-1 border">
                    {data.main.tobacco_use || "N/A"}
                  </div>
                </div>
                
                <div>
                  <label className="text-sm font-medium">Describe your drug use (recreational or medicinal)</label>
                  <div className="p-3 bg-gray-50 rounded mt-1 border">
                    {data.main.drug_use || "N/A"}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
          
          {/* Additional Information */}
          <Card>
            <CardContent className="pt-6">
              <h3 className="text-lg font-medium mb-4">Additional Information</h3>
              
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium">What are your personal strengths?</label>
                  <div className="p-3 bg-gray-50 rounded mt-1 border">
                    {data.main.personal_strengths || "N/A"}
                  </div>
                </div>
                
                <div>
                  <label className="text-sm font-medium">What activities or hobbies do you enjoy?</label>
                  <div className="p-3 bg-gray-50 rounded mt-1 border">
                    {data.main.hobbies || "N/A"}
                  </div>
                </div>
                
                <div>
                  <label className="text-sm font-medium">Additional information you would like to share</label>
                  <div className="p-3 bg-gray-50 rounded mt-1 border">
                    {data.main.additional_info || "N/A"}
                  </div>
                </div>
                
                <div>
                  <label className="text-sm font-medium">Emergency Contact</label>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-1">
                    <div className="p-3 bg-gray-50 rounded border">
                      <label className="text-xs font-medium">Name</label>
                      <div>{data.main.emergency_name || "N/A"}</div>
                    </div>
                    <div className="p-3 bg-gray-50 rounded border">
                      <label className="text-xs font-medium">Relationship</label>
                      <div>{data.main.emergency_relationship || "N/A"}</div>
                    </div>
                    <div className="p-3 bg-gray-50 rounded border">
                      <label className="text-xs font-medium">Phone</label>
                      <div>{data.main.emergency_phone || "N/A"}</div>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <div className="text-sm text-gray-500">
            <p>Form submitted on: {data.main.submission_date && format(new Date(data.main.submission_date), 'MMMM d, yyyy')}</p>
          </div>
        </div>
        
        <DialogFooter>
          <Button onClick={onClose}>Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ClientHistoryViewDialog;
