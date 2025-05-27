
/**
 * Enhanced email validation and encoding utilities
 * Handles special characters in email addresses properly
 */

/**
 * Validates email format and handles special characters
 */
export const validateEmail = (email: string): { isValid: boolean; message?: string } => {
  if (!email) {
    return { isValid: false, message: "Email is required" };
  }

  // Basic email regex that handles most special characters
  const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;
  
  if (!emailRegex.test(email)) {
    return { isValid: false, message: "Please enter a valid email address" };
  }

  return { isValid: true };
};

/**
 * Properly encodes email for API requests
 * Handles special characters like + signs and dots
 */
export const encodeEmailForAPI = (email: string): string => {
  // Trim whitespace and convert to lowercase for consistency
  const cleanEmail = email.trim().toLowerCase();
  
  // Log for debugging purposes
  console.log("[EmailValidation] Processing email:", {
    original: email,
    cleaned: cleanEmail,
    hasPlus: cleanEmail.includes('+'),
    hasDots: cleanEmail.includes('.'),
    hasSpecialChars: /[!#$%&'*+/=?^_`{|}~-]/.test(cleanEmail)
  });
  
  return cleanEmail;
};

/**
 * Checks if an email has known problematic characters for certain systems
 */
export const hasProblematicChars = (email: string): { hasIssues: boolean; issues: string[] } => {
  const issues: string[] = [];
  
  // Check for plus signs (sometimes causes issues with email systems)
  if (email.includes('+')) {
    issues.push('Contains plus sign (+) - may cause issues with some email systems');
  }
  
  // Check for multiple consecutive dots
  if (email.includes('..')) {
    issues.push('Contains consecutive dots (..) - invalid email format');
  }
  
  // Check for dots at beginning or end of local part
  const [localPart] = email.split('@');
  if (localPart && (localPart.startsWith('.') || localPart.endsWith('.'))) {
    issues.push('Dots at beginning or end of email address - invalid format');
  }
  
  return {
    hasIssues: issues.length > 0,
    issues
  };
};

/**
 * Suggests alternative email formats if the current one might have issues
 */
export const suggestEmailAlternatives = (email: string): string[] => {
  const alternatives: string[] = [];
  
  // If email has plus sign, suggest version without it
  if (email.includes('+')) {
    const [localPart, domain] = email.split('@');
    const baseLocal = localPart.split('+')[0];
    alternatives.push(`${baseLocal}@${domain}`);
  }
  
  return alternatives;
};

export default {
  validateEmail,
  encodeEmailForAPI,
  hasProblematicChars,
  suggestEmailAlternatives
};
