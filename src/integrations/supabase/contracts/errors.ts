import { z } from 'zod';

export const clientErrorCodeSchema = z.enum([
  'AUTHENTICATION_REQUIRED','SESSION_EXPIRED','UNAUTHORIZED','RECORD_MISSING','DUPLICATE_SUBMISSION','STALE_DATA','STALE_OPTION','STALE_SLOT','THERAPIST_UNAVAILABLE','READINESS_INCOMPLETE','INSURANCE_VERIFICATION_REQUIRED','PAYER_ORDER_REVIEW_REQUIRED','SERVICE_BLOCKED','BOOKING_CONTENTION','APPOINTMENT_ALREADY_CHANGED','VALIDATION_FAILURE','RATE_LIMITED','NETWORK_UNAVAILABLE','TIMEOUT','MALFORMED_CONTRACT_RESPONSE','UNEXPECTED_TECHNICAL_FAILURE'
]);
export type ClientErrorCode = z.infer<typeof clientErrorCodeSchema>;

export const canonicalClientErrorSchema = z.object({
  code: clientErrorCodeSchema,
  title: z.string().min(1),
  message: z.string().min(1),
  next_action: z.string().min(1),
  retryable: z.boolean(),
  correlation_id: z.string().optional(),
});
export type CanonicalClientError = z.infer<typeof canonicalClientErrorSchema>;

const ERROR_COPY: Record<ClientErrorCode, Omit<CanonicalClientError, 'code' | 'correlation_id'>> = {
  AUTHENTICATION_REQUIRED: { title: 'Please sign in', message: 'Sign in to continue with your ValorWell portal.', next_action: 'Sign in and return to this page.', retryable: false },
  SESSION_EXPIRED: { title: 'Session expired', message: 'Your session ended to protect your privacy.', next_action: 'Sign in again to continue.', retryable: false },
  UNAUTHORIZED: { title: 'Access unavailable', message: 'This information is not available from this account.', next_action: 'Return to your portal home or contact ValorWell support.', retryable: false },
  RECORD_MISSING: { title: 'Information unavailable', message: 'We could not find the information needed for this step.', next_action: 'Refresh the page or contact ValorWell support.', retryable: true },
  DUPLICATE_SUBMISSION: { title: 'Already received', message: 'We already received this request.', next_action: 'Refresh to see the latest status.', retryable: false },
  STALE_DATA: { title: 'Information changed', message: 'This page has older information than the current portal state.', next_action: 'Refresh and try again.', retryable: true },
  STALE_OPTION: { title: 'Therapist option changed', message: 'This therapist option needs to be refreshed before selection.', next_action: 'Refresh therapist options and choose again.', retryable: true },
  STALE_SLOT: { title: 'Appointment time changed', message: 'That appointment time is no longer current.', next_action: 'Choose a fresh appointment time.', retryable: true },
  THERAPIST_UNAVAILABLE: { title: 'Therapist unavailable', message: 'That therapist is no longer available for selection.', next_action: 'Review the updated therapist options.', retryable: true },
  READINESS_INCOMPLETE: { title: 'More setup needed', message: 'A required setup step is not complete yet.', next_action: 'Complete the next required portal step.', retryable: false },
  INSURANCE_VERIFICATION_REQUIRED: { title: 'Insurance verification needed', message: 'Insurance needs to be verified before therapist selection.', next_action: 'Review your insurance step.', retryable: false },
  PAYER_ORDER_REVIEW_REQUIRED: { title: 'Insurance review needed', message: 'Other health insurance or payer order requires ValorWell review.', next_action: 'Continue any allowed setup while ValorWell reviews this.', retryable: false },
  SERVICE_BLOCKED: { title: 'Service unavailable', message: 'New care-start actions are not available at this time.', next_action: 'Use the available support, records, billing, or appointment options.', retryable: false },
  BOOKING_CONTENTION: { title: 'Time no longer available', message: 'Someone else booked that appointment time first.', next_action: 'Choose another available time.', retryable: true },
  APPOINTMENT_ALREADY_CHANGED: { title: 'Appointment already changed', message: 'This appointment changed before your request was completed.', next_action: 'Refresh appointments and try again if still allowed.', retryable: true },
  VALIDATION_FAILURE: { title: 'Please review the form', message: 'Some information needs attention before continuing.', next_action: 'Correct the highlighted fields and submit again.', retryable: false },
  RATE_LIMITED: { title: 'Please wait', message: 'Too many requests were made in a short time.', next_action: 'Wait a moment and try again.', retryable: true },
  NETWORK_UNAVAILABLE: { title: 'Connection problem', message: 'We could not reach ValorWell securely.', next_action: 'Check your connection and try again.', retryable: true },
  TIMEOUT: { title: 'Request timed out', message: 'ValorWell did not respond in time.', next_action: 'Try again.', retryable: true },
  MALFORMED_CONTRACT_RESPONSE: { title: 'Technical issue', message: 'Sorry there was a technical error. Don’t worry, it’s not you. It’s us. The ValorWell Team has been notified.', next_action: 'Refresh or continue any available setup steps.', retryable: true },
  UNEXPECTED_TECHNICAL_FAILURE: { title: 'Technical issue', message: 'Sorry there was a technical error. Don’t worry, it’s not you. It’s us. The ValorWell Team has been notified.', next_action: 'Try again or contact ValorWell support.', retryable: true },
};

export function toCanonicalClientError(code: ClientErrorCode, correlation_id?: string): CanonicalClientError {
  return { code, ...ERROR_COPY[code], correlation_id };
}

export function normalizeUnknownError(error: unknown, correlation_id?: string): CanonicalClientError {
  if (typeof navigator !== 'undefined' && !navigator.onLine) return toCanonicalClientError('NETWORK_UNAVAILABLE', correlation_id);
  if (error && typeof error === 'object' && 'code' in error) {
    const candidate = (error as { code?: unknown }).code;
    if (typeof candidate === 'string' && clientErrorCodeSchema.safeParse(candidate).success) return toCanonicalClientError(candidate as ClientErrorCode, correlation_id);
  }
  return toCanonicalClientError('UNEXPECTED_TECHNICAL_FAILURE', correlation_id);
}
