
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
    createdBy: string;
  },
  documentName: string,
  documentData: any
) => {
  try {
    // Step 1: Generate PDF from form
    const formElement = document.getElementById(formElementId);
    if (!formElement) {
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
    
    // Generate a unique filename
    const filename = `${documentInfo.documentType}_${uuidv4()}.pdf`;
    
    // Convert PDF to blob
    const pdfBlob = pdf.output('blob');
    
    // Step 2: Upload PDF to Supabase storage
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('client_documents')
      .upload(`${documentInfo.clientId}/${filename}`, pdfBlob, {
        contentType: 'application/pdf',
        upsert: false
      });
    
    if (uploadError) {
      console.error('Error uploading document:', uploadError);
      throw new Error(`Error uploading document: ${uploadError.message}`);
    }
    
    // Get the public URL for the uploaded file
    const { data: urlData } = await supabase.storage
      .from('client_documents')
      .getPublicUrl(`${documentInfo.clientId}/${filename}`);
    
    const documentUrl = urlData.publicUrl;
    
    // Step 3: Create document record in database
    const { data: docData, error: docError } = await supabase
      .from('documents')
      .insert({
        client_id: documentInfo.clientId,
        document_type: documentInfo.documentType,
        document_title: documentInfo.documentTitle,
        document_url: documentUrl,
        document_date: documentInfo.documentDate,
        created_by: documentInfo.createdBy,
        document_data: documentData
      })
      .select()
      .single();
    
    if (docError) {
      console.error('Error creating document record:', docError);
      throw new Error(`Error creating document record: ${docError.message}`);
    }
    
    // Step 4: Update document assignments if needed
    const { data: assignmentData, error: assignmentError } = await supabase
      .from('document_assignments')
      .update({ 
        status: 'completed',
        completed_date: new Date(),
        document_id: docData.id
      })
      .match({ 
        client_id: documentInfo.clientId, 
        document_name: documentName,
        status: 'assigned' 
      });
    
    if (assignmentError) {
      console.error('Error updating document assignment:', assignmentError);
      // This is not a critical error as the document was created successfully
      console.warn('Could not update document assignment status');
    }
    
    return {
      success: true,
      documentId: docData.id,
      message: 'Document submitted successfully'
    };
    
  } catch (error) {
    console.error('Document submission error:', error);
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Unknown error occurred'
    };
  }
};
