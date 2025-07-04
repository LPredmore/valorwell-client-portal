
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import { v4 as uuidv4 } from 'uuid';

// Constant for the storage bucket name to ensure consistency
const CLINICAL_DOCUMENTS_BUCKET = 'clinical_documents';

/**
 * Handles document form submission by generating a PDF and updating related database records
 * 
 * @param formElementId - The ID of the DOM element containing the form to capture
 * @param documentInfo - Information about the document (client ID, document type, etc.)
 * @param documentName - Display name of the document
 * @param documentData - Data to be included in the document
 * @returns Object with success status and message
 */
export const handleFormSubmission = async (
  formElementId: string,
  documentInfo: {
    clientId: string;
    documentType: string;
    documentDate: Date;
    documentTitle: string;
    createdBy?: string;
  },
  documentName: string,
  documentData: any
) => {
  try {
    console.log(`[formSubmissionUtils] Starting submission for ${documentName}`, { 
      formElementId, 
      clientId: documentInfo.clientId,
      documentType: documentInfo.documentType
    });
    
    // Step 1: Generate PDF from form
    const formElement = document.getElementById(formElementId);
    if (!formElement) {
      console.error(`Form element with id "${formElementId}" not found`);
      throw new Error(`Form element with id "${formElementId}" not found`);
    }

    // Capture the form as a canvas
    const canvas = await html2canvas(formElement);
    
    // Create a new PDF document
    const pdf = new jsPDF({
      format: 'letter',
      unit: 'px'
    });
    
    // Calculate dimensions
    const imgWidth = 550;
    const imgHeight = canvas.height * imgWidth / canvas.width;
    
    // Add the image to the PDF
    pdf.addImage(
      canvas.toDataURL('image/png'), 
      'PNG', 
      20, 
      20, 
      imgWidth, 
      imgHeight
    );
    
    // Generate a unique filename with timestamp to prevent caching issues
    const timestamp = new Date().getTime();
    const filename = `${documentInfo.documentType}_${uuidv4()}_${timestamp}.pdf`;
    
    // Convert PDF to blob
    const pdfBlob = pdf.output('blob');
    
    // Define the file path within the clinical_documents bucket
    const filePath = `${documentInfo.clientId}/${filename}`;
    
    console.log(`[formSubmissionUtils] PDF generated successfully, uploading to ${CLINICAL_DOCUMENTS_BUCKET} bucket path: ${filePath}`);
    
    // Step 2: Upload PDF to Supabase storage - using the clinical_documents bucket
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from(CLINICAL_DOCUMENTS_BUCKET)
      .upload(filePath, pdfBlob, {
        contentType: 'application/pdf',
        upsert: false
      });
    
    if (uploadError) {
      console.error(`[formSubmissionUtils] Error uploading document to ${CLINICAL_DOCUMENTS_BUCKET}:`, uploadError);
      throw new Error(`Error uploading document: ${uploadError.message}`);
    }
    
    console.log(`[formSubmissionUtils] Document uploaded successfully to ${CLINICAL_DOCUMENTS_BUCKET}:`, uploadData);
    
    // Step 3: Save document record to clinical_documents table
    const { data: documentRecord, error: documentError } = await supabase
      .from('clinical_documents')
      .insert({
        client_id: documentInfo.clientId,
        document_type: documentInfo.documentType,
        document_title: documentInfo.documentTitle,
        document_date: documentInfo.documentDate.toISOString().split('T')[0],
        file_path: filePath,
        created_by: documentInfo.createdBy || documentInfo.clientId // Ensure created_by is a UUID, using clientId as fallback
      })
      .select()
      .single();
    
    if (documentError) {
      console.error('[formSubmissionUtils] Error saving document record:', documentError);
      throw new Error(`Error saving document record: ${documentError.message}`);
    }
    
    console.log('[formSubmissionUtils] Document record saved successfully:', documentRecord);
    
    // Step 4: Update the document assignment status to completed
    const { error: assignmentError } = await supabase
      .from('document_assignments')
      .update({ status: 'completed' })
      .eq('client_id', documentInfo.clientId)
      .eq('document_name', documentName);
    
    if (assignmentError) {
      console.error('[formSubmissionUtils] Error updating assignment status:', assignmentError);
      // Not throwing here as this is not critical - the document is already saved
      console.warn('Document saved but assignment status update failed');
    } else {
      console.log('[formSubmissionUtils] Document assignment status updated to completed');
    }
    
    // Step 5: If this is a client history form, save the form data to the client_history table
    if (documentInfo.documentType === 'client_history' && documentData) {
      const result = await saveClientHistory(documentInfo.clientId, documentData, filePath);
      if (!result.success) {
        console.warn('[formSubmissionUtils] Client history data save warning:', result.message);
      }
    }
    
    // Return the file path for database reference
    return {
      success: true,
      filePath: filePath,
      message: 'Document submitted successfully'
    };
    
  } catch (error) {
    console.error('[formSubmissionUtils] Document submission error:', error);
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Unknown error occurred'
    };
  }
};

/**
 * Save client history form data to the client_history table
 */
const saveClientHistory = async (clientId: string, formData: any, pdfPath: string) => {
  try {
    console.log('[saveClientHistory] Starting to save client history data', formData);

    // Extract relevant data from the form for main history record
    const historyData = {
      client_id: clientId,
      personal_strengths: formData.personalStrengths || null,
      hobbies: formData.hobbies || null,
      education_level: formData.educationLevel || null,
      occupation_details: formData.occupationDetails || null,
      sleep_hours: formData.sleepHours || null,
      current_issues: formData.currentIssues || null,
      progression_of_issues: formData.progressionOfIssues || null,
      relationship_problems: formData.relationshipProblems || null,
      counseling_goals: formData.counselingGoals || null,
      emergency_name: formData.emergencyName || null,
      emergency_phone: formData.emergencyPhone || null,
      emergency_relationship: formData.emergencyRelationship || null,
      signature: formData.signature || null,
      pdf_path: pdfPath,
      submission_date: new Date().toISOString().split('T')[0],
      // JSON data fields
      selected_medical_conditions: formData.selectedConditions ? JSON.stringify(formData.selectedConditions) : '[]',
      selected_symptoms: formData.selectedSymptoms ? JSON.stringify(formData.selectedSymptoms) : '[]',
      selected_childhood_experiences: formData.selectedChildhoodExperiences ? JSON.stringify(formData.selectedChildhoodExperiences) : '[]',
      // Additional fields
      is_married: formData.isMarried || false,
      has_past_spouses: formData.hasPastSpouses || false,
      takes_medications: formData.takesMedications || false,
      has_received_mental_health_treatment: formData.hasReceivedMentalHealthTreatment || false,
      hospitalized_psychiatric: formData.hospitalizedPsychiatric || false,
      psych_hold: formData.psychHold || false,
      attempted_suicide: formData.attemptedSuicide || false,
      is_family_same_as_household: formData.isFamilySameAsHousehold || false,
      alcohol_use: formData.alcoholUse || null,
      tobacco_use: formData.tobaccoUse || null,
      drug_use: formData.drugUse || null,
      chronic_health_problems: formData.chronicHealthProblems || null,
      additional_info: formData.additionalInfo || null,
      childhood_elaboration: formData.childhoodElaboration || null,
      life_changes: formData.lifeChanges || null
    };
    
    console.log('[saveClientHistory] Main history data prepared:', historyData);
    
    // Save to client_history table
    const { data: historyRecord, error: historyError } = await supabase
      .from('client_history')
      .insert(historyData)
      .select()
      .single();
    
    if (historyError) {
      console.error('[saveClientHistory] Error saving client history:', historyError);
      return { success: false, message: `Error saving client history: ${historyError.message}` };
    }
    
    console.log('[saveClientHistory] Client history main record saved successfully:', historyRecord);
    
    // Save related data if the main record was saved successfully
    const historyId = historyRecord.id;
    
    // Save family members if provided
    if (formData.familyMembers && Array.isArray(formData.familyMembers) && formData.familyMembers.length > 0) {
      const familyData = formData.familyMembers.map((member: any) => ({
        history_id: historyId,
        relationship_type: member.relationshipType || null,
        name: member.name || null,
        personality: member.personality || null,
        relationship_growing: member.relationshipGrowing || null,
        relationship_now: member.relationshipNow || null
      }));
      
      const { error: familyError } = await supabase
        .from('client_history_family')
        .insert(familyData);
      
      if (familyError) {
        console.error('[saveClientHistory] Error saving family members:', familyError);
        // Continue despite error - not critical
      } else {
        console.log(`[saveClientHistory] Successfully saved ${familyData.length} family members`);
      }
    }
    
    // Save household members if provided
    if (formData.householdMembers && Array.isArray(formData.householdMembers) && formData.householdMembers.length > 0) {
      const householdData = formData.householdMembers.map((member: any) => ({
        history_id: historyId,
        relationship_type: member.relationshipType || null,
        name: member.name || null,
        personality: member.personality || null,
        relationship_now: member.relationshipNow || null
      }));
      
      const { error: householdError } = await supabase
        .from('client_history_household')
        .insert(householdData);
      
      if (householdError) {
        console.error('[saveClientHistory] Error saving household members:', householdError);
        // Continue despite error - not critical
      } else {
        console.log(`[saveClientHistory] Successfully saved ${householdData.length} household members`);
      }
    }
    
    // Save current spouse if married
    if (formData.isMarried && formData.currentSpouse) {
      const spouseData = {
        history_id: historyId,
        name: formData.currentSpouse.name || null,
        personality: formData.currentSpouse.personality || null,
        relationship: formData.currentSpouse.relationship || null
      };
      
      const { error: spouseError } = await supabase
        .from('client_history_current_spouse')
        .insert(spouseData);
      
      if (spouseError) {
        console.error('[saveClientHistory] Error saving current spouse:', spouseError);
        // Continue despite error - not critical
      } else {
        console.log('[saveClientHistory] Successfully saved current spouse');
      }
    }
    
    // Save previous spouses if provided
    if (formData.hasPastSpouses && formData.previousSpouses && 
        Array.isArray(formData.previousSpouses) && formData.previousSpouses.length > 0) {
      const spousesData = formData.previousSpouses.map((spouse: any) => ({
        history_id: historyId,
        name: spouse.name || null,
        personality: spouse.personality || null,
        relationship: spouse.relationship || null
      }));
      
      const { error: spousesError } = await supabase
        .from('client_history_spouses')
        .insert(spousesData);
      
      if (spousesError) {
        console.error('[saveClientHistory] Error saving previous spouses:', spousesError);
        // Continue despite error - not critical
      } else {
        console.log(`[saveClientHistory] Successfully saved ${spousesData.length} previous spouses`);
      }
    }
    
    // Save medications if provided
    if (formData.takesMedications && formData.medications && 
        Array.isArray(formData.medications) && formData.medications.length > 0) {
      const medicationsData = formData.medications.map((med: any) => ({
        history_id: historyId,
        name: med.name || null,
        purpose: med.purpose || null,
        duration: med.duration || null
      }));
      
      const { error: medsError } = await supabase
        .from('client_history_medications')
        .insert(medicationsData);
      
      if (medsError) {
        console.error('[saveClientHistory] Error saving medications:', medsError);
        // Continue despite error - not critical
      } else {
        console.log(`[saveClientHistory] Successfully saved ${medicationsData.length} medications`);
      }
    }
    
    // Save mental health treatments if provided
    if (formData.hasReceivedMentalHealthTreatment && formData.treatments && 
        Array.isArray(formData.treatments) && formData.treatments.length > 0) {
      const treatmentsData = formData.treatments.map((treatment: any) => ({
        history_id: historyId,
        provider: treatment.provider || null,
        year: treatment.year || null,
        reason: treatment.reason || null,
        length: treatment.length || null
      }));
      
      const { error: treatmentsError } = await supabase
        .from('client_history_treatments')
        .insert(treatmentsData);
      
      if (treatmentsError) {
        console.error('[saveClientHistory] Error saving treatments:', treatmentsError);
        // Continue despite error - not critical
      } else {
        console.log(`[saveClientHistory] Successfully saved ${treatmentsData.length} treatments`);
      }
    }
    
    return { success: true, message: 'Client history saved successfully' };
    
  } catch (error) {
    console.error('[saveClientHistory] Error:', error);
    return { success: false, message: error instanceof Error ? error.message : 'Unknown error occurred' };
  }
};

// Export constant for bucket name so it can be imported elsewhere
export { CLINICAL_DOCUMENTS_BUCKET };

// Keep processFormElementsForPDF function as is
const processFormElementsForPDF = (element: HTMLElement) => {
  // Process all inputs
  const inputs = element.querySelectorAll('input');
  inputs.forEach(input => {
    if (input.type === 'text' || input.type === 'date') {
      // Create a visible text representation of the input value
      const valueSpan = document.createElement('div');
      valueSpan.className = 'pdf-value-display';
      valueSpan.textContent = input.value || '';
      
      // Replace the input with the span
      if (input.parentNode) {
        input.parentNode.replaceChild(valueSpan, input);
      }
    }
  });
  
  // Process textareas - replace with div to maintain line breaks and content size
  const textareas = element.querySelectorAll('textarea');
  textareas.forEach(textarea => {
    // Create a div to represent the textarea content
    const contentDiv = document.createElement('div');
    contentDiv.className = 'pdf-value-display';
    
    // Preserve content and line breaks
    contentDiv.textContent = textarea.value || '';
    contentDiv.style.whiteSpace = 'pre-wrap';
    
    // Add more height for textareas with substantial content
    const lineCount = (textarea.value.match(/\n/g) || []).length + 1;
    if (lineCount > 2 || textarea.value.length > 100) {
      contentDiv.style.minHeight = Math.min(Math.max(lineCount * 20, 60), 300) + 'px';
    }
    
    // Replace the textarea with the content div
    if (textarea.parentNode) {
      textarea.parentNode.replaceChild(contentDiv, textarea);
    }
  });
  
  return element;
};
