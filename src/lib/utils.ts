
import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Utility function to get the text height based on content
 * @param text The text content to measure
 * @param width The width constraint
 * @param fontSize Font size in pixels
 * @param lineHeight Line height multiplier
 * @returns Height in pixels
 */
export function getTextHeight(text: string, width: number, fontSize = 14, lineHeight = 1.5): number {
  if (!text || !width) return fontSize * lineHeight;
  
  // Create a hidden div to measure text
  const element = document.createElement('div');
  element.style.position = 'absolute';
  element.style.visibility = 'hidden';
  element.style.width = `${width}px`;
  element.style.fontSize = `${fontSize}px`;
  element.style.lineHeight = String(lineHeight);
  element.style.whiteSpace = 'pre-wrap';
  element.textContent = text;
  
  document.body.appendChild(element);
  const height = element.offsetHeight;
  document.body.removeChild(element);
  
  return Math.max(height, fontSize * lineHeight);
}

/**
 * Adds data attributes to an element for PDF generation
 * @param props Original props
 * @param value The value to display in PDF
 * @returns Enhanced props with data attributes
 */
export function withPdfAttributes(props: any, value: string): any {
  return {
    ...props,
    'data-pdf-value': value,
    'data-pdf-visible': 'true',
  };
}

/**
 * Creates appropriate attributes for PDF rendering of form elements
 * @param value The value to display
 * @param fieldName Optional field name for reference
 * @returns Object with PDF data attributes
 */
export function createPdfAttributes(value: string, fieldName?: string): object {
  return {
    'data-pdf-value': value,
    'data-pdf-visible': 'true',
    'data-field-name': fieldName || '',
  };
}

/**
 * Validates if a string is a valid UUID format
 * @param val The string to validate
 * @returns True if valid UUID format, false otherwise
 */
export function isUuid(val: string | null | undefined): boolean {
  if (!val || typeof val !== 'string') return false;
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(val);
}

/**
 * Validates therapist assignment value before database operations
 * @param therapistId The therapist ID to validate
 * @param fieldName Optional field name for error context
 * @returns Validation result with success flag and error message
 */
export function validateTherapistAssignment(
  therapistId: string | null | undefined, 
  fieldName: string = 'therapist assignment'
): { isValid: boolean; error?: string; sanitizedValue: string | null } {
  // Allow null assignments (unassigned)
  if (!therapistId) {
    return { isValid: true, sanitizedValue: null };
  }

  // Validate UUID format
  if (!isUuid(therapistId)) {
    return {
      isValid: false,
      error: `Invalid ${fieldName}: must be a valid UUID format, not email or other text`,
      sanitizedValue: null
    };
  }

  return { isValid: true, sanitizedValue: therapistId };
}
