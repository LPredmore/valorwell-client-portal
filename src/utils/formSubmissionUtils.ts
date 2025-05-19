
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import { v4 as uuidv4 } from 'uuid';

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
    
    console.log(`[formSubmissionUtils] PDF generated successfully, uploading to clinical_documents bucket path: ${filePath}`);
    
    // Step 2: Upload PDF to Supabase storage - using the clinical_documents bucket
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('clinical_documents')
      .upload(filePath, pdfBlob, {
        contentType: 'application/pdf',
        upsert: false
      });
    
    if (uploadError) {
      console.error('[formSubmissionUtils] Error uploading document:', uploadError);
      throw new Error(`Error uploading document: ${uploadError.message}`);
    }
    
    console.log('[formSubmissionUtils] Document uploaded successfully:', uploadData);
    
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
 * Process form elements to ensure their values are properly displayed in the PDF
 */
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
