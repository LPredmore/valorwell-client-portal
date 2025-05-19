
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import { v4 as uuidv4 } from 'uuid';

// Standardize on BUCKET_NAME constant to ensure consistency across the application
const BUCKET_NAME = 'clinical_documents';

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
    createdBy: string;
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
    
    // Generate a unique filename with proper structure: {clientId}/{documentType}/{uuid}_{timestamp}.pdf
    const timestamp = new Date().getTime();
    const uniqueId = uuidv4();
    const filename = `${uniqueId}_${timestamp}.pdf`;
    const filePath = `${documentInfo.clientId}/${documentInfo.documentType}/${filename}`;
    
    // Convert PDF to blob
    const pdfBlob = pdf.output('blob');
    
    console.log(`[formSubmissionUtils] PDF generated successfully, uploading to ${BUCKET_NAME} bucket path: ${filePath}`);
    
    // Step 2: Upload PDF to Supabase storage - using the standardized bucket name
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from(BUCKET_NAME)
      .upload(filePath, pdfBlob, {
        contentType: 'application/pdf',
        upsert: false
      });
    
    if (uploadError) {
      console.error(`[formSubmissionUtils] Error uploading document to ${BUCKET_NAME} bucket:`, uploadError);
      
      // Try again with alternate bucket as a fallback (in case we're dealing with legacy data)
      const fallbackBucket = 'documents';
      console.warn(`[formSubmissionUtils] Attempting fallback upload to '${fallbackBucket}' bucket`);
      
      const { data: fallbackData, error: fallbackError } = await supabase.storage
        .from(fallbackBucket)
        .upload(filePath, pdfBlob, {
          contentType: 'application/pdf',
          upsert: false
        });
        
      if (fallbackError) {
        console.error('[formSubmissionUtils] Fallback upload also failed:', fallbackError);
        throw new Error(`Error uploading document: ${uploadError.message}`);
      } else {
        console.log('[formSubmissionUtils] Fallback upload succeeded:', fallbackData);
      }
    } else {
      console.log('[formSubmissionUtils] Document uploaded successfully:', uploadData);
    }
    
    // Step 3: Create document record in database
    const { data: docData, error: docError } = await supabase
      .from('clinical_documents')
      .insert({
        client_id: documentInfo.clientId,
        document_type: documentInfo.documentType,
        document_title: documentInfo.documentTitle,
        document_date: documentInfo.documentDate.toISOString().split('T')[0],
        file_path: filePath,
        created_by: documentInfo.createdBy
      })
      .select()
      .single();
    
    if (docError) {
      console.error('[formSubmissionUtils] Error creating document record:', docError);
      throw new Error(`Error creating document record: ${docError.message}`);
    }
    
    console.log('[formSubmissionUtils] Document record created:', docData);
    
    // Step 4: Update document assignments if needed
    const { data: assignmentData, error: assignmentError } = await supabase
      .from('document_assignments')
      .update({ 
        status: 'completed',
        updated_at: new Date().toISOString()
      })
      .eq('client_id', documentInfo.clientId)
      .eq('document_name', documentName)
      .eq('status', 'not_started');
    
    if (assignmentError) {
      console.error('[formSubmissionUtils] Error updating document assignment:', assignmentError);
      // This is not a critical error as the document was created successfully
      console.warn('Could not update document assignment status');
    }
    
    return {
      success: true,
      documentId: docData.id,
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
