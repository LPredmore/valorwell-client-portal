
import React from 'react';
import { Textarea } from "@/components/ui/textarea";

interface PHQ9AssessmentSectionProps {
  phq9Data: any;
}

export const PHQ9AssessmentSection: React.FC<PHQ9AssessmentSectionProps> = ({
  phq9Data
}) => {
  // Enhanced safety check - guard against null/undefined props
  if (!phq9Data) {
    console.log("[PHQ9AssessmentSection] No PHQ-9 data provided, component not rendered");
    return null; // Don't render anything if no PHQ-9 data is available
  }
  
  // Parse score safely with error handling
  let phq9Score: number | undefined = undefined;
  if (phq9Data.total_score !== undefined) {
    try {
      phq9Score = typeof phq9Data.total_score === 'number' 
        ? phq9Data.total_score 
        : parseFloat(phq9Data.total_score);
      
      // Validate if score is a valid number
      if (isNaN(phq9Score)) {
        console.warn("[PHQ9AssessmentSection] Invalid PHQ-9 score:", phq9Data.total_score);
        phq9Score = undefined;
      }
    } catch (e) {
      console.error("[PHQ9AssessmentSection] Error parsing PHQ-9 score:", e);
      phq9Score = undefined;
    }
  }
  
  return (
    <div className="mb-6 mt-6 pdf-section">
      <h4 className="text-md font-medium text-gray-800 mb-4">PHQ-9 Assessment</h4>
      
      {phq9Data.phq9_narrative && (
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">PHQ-9 Narrative</label>
          <Textarea 
            className="min-h-[100px] bg-gray-100 resize-y" 
            value={phq9Data.phq9_narrative || ''} 
            readOnly 
            data-field-name="PHQ-9 Narrative"
          />
        </div>
      )}

      {phq9Score !== undefined && (
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">PHQ-9 Score</label>
          <div className="bg-gray-100 border border-gray-300 rounded px-3 py-2 text-sm"
               data-pdf-value={`${phq9Score} - ${getScoreInterpretation(phq9Score)}`}>
            {phq9Score} - {getScoreInterpretation(phq9Score)}
          </div>
          {/* Hidden div for PDF output */}
          <div className="hidden pdf-only">
            {phq9Score} - {getScoreInterpretation(phq9Score)}
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 gap-4">
        <div>
          {/* Additional PHQ-9 data can be added here if needed */}
        </div>
        <div>
          {/* Additional PHQ-9 data can be added here if needed */}
        </div>
      </div>
    </div>
  );
};

// Helper function to interpret PHQ-9 scores
function getScoreInterpretation(score: number): string {
  if (score >= 0 && score <= 4) return "None-minimal depression";
  if (score >= 5 && score <= 9) return "Mild depression";
  if (score >= 10 && score <= 14) return "Moderate depression";
  if (score >= 15 && score <= 19) return "Moderately severe depression";
  if (score >= 20) return "Severe depression";
  return "Score interpretation unavailable";
}
