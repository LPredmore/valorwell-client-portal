
import React from 'react';
import { Input } from "@/components/ui/input";
import { DiagnosisSelector } from "@/components/DiagnosisSelector";

interface ClientInfoSectionProps {
  formState: any;
  handleChange: (field: string, value: string | string[]) => void;
}

export const ClientInfoSection: React.FC<ClientInfoSectionProps> = ({
  formState,
  handleChange
}) => {
  // Safety check for null formState
  if (!formState) {
    console.warn('[ClientInfoSection] Received null formState');
    return <div className="text-red-600 p-4">Error: Missing form data</div>;
  }

  // Safely convert string diagnosis to array for DiagnosisSelector
  const diagnosisArray = (() => {
    if (!formState.diagnosis) {
      return [];
    }
    
    if (typeof formState.diagnosis === 'string') {
      return formState.diagnosis.split(',').map((d: string) => d.trim()).filter(Boolean);
    }
    
    if (Array.isArray(formState.diagnosis)) {
      return formState.diagnosis;
    }
    
    return [];
  })();
  
  const isDiagnosisEmpty = !diagnosisArray.length;
  
  // Log diagnosis data for debugging
  console.log('[ClientInfoSection] Diagnosis data:', {
    originalValue: formState.diagnosis,
    parsedArray: diagnosisArray,
    isEmpty: isDiagnosisEmpty
  });

  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Patient Name</label>
          <Input
            placeholder="Enter patient name"
            value={formState.patientName || ''}
            onChange={(e) => handleChange('patientName', e.target.value)}
            readOnly
            className="bg-gray-100"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Patient DOB</label>
          <Input
            placeholder="MM/DD/YYYY"
            value={formState.patientDOB || ''}
            onChange={(e) => handleChange('patientDOB', e.target.value)}
            readOnly
            className="bg-gray-100"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Clinician Name</label>
          <Input
            placeholder="Enter clinician name"
            value={formState.clinicianName || ''}
            onChange={(e) => handleChange('clinicianName', e.target.value)}
            readOnly
            className="bg-gray-100"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Diagnosis</label>
          {isDiagnosisEmpty ? (
            <DiagnosisSelector 
              value={diagnosisArray}
              onChange={(value) => handleChange('diagnosis', value)}
            />
          ) : (
            <Input
              placeholder="Select diagnosis code"
              value={Array.isArray(formState.diagnosis) ? formState.diagnosis.join(', ') : (formState.diagnosis || '')}
              readOnly
              className="bg-gray-100"
            />
          )}
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Plan Type</label>
          <Input
            placeholder="Select plan length"
            value={formState.planType || ''}
            onChange={(e) => handleChange('planType', e.target.value)}
            readOnly
            className="bg-gray-100"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Treatment Frequency</label>
          <Input
            placeholder="Select frequency"
            value={formState.treatmentFrequency || ''}
            onChange={(e) => handleChange('treatmentFrequency', e.target.value)}
            readOnly
            className="bg-gray-100"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Session Date</label>
          <Input
            type="date"
            value={formState.sessionDate || ''}
            onChange={(e) => handleChange('sessionDate', e.target.value)}
            placeholder="Select date"
            readOnly
            className="bg-gray-100"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Medications</label>
          <Input
            placeholder="List current medications"
            value={formState.medications || ''}
            onChange={(e) => handleChange('medications', e.target.value)}
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Session Type</label>
          <Input
            placeholder="Enter session type"
            value={formState.sessionType || ''}
            onChange={(e) => handleChange('sessionType', e.target.value)}
          />
        </div>
      </div>

      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-1">Person's in Attendance</label>
        <Input
          placeholder="List all attendees"
          value={formState.personsInAttendance || ''}
          onChange={(e) => handleChange('personsInAttendance', e.target.value)}
        />
      </div>
    </>
  );
};
