export const PRIVACY_EVENT_CATALOG_VERSION = '2026-07-client-journey-v1';
export type DurationBucket = 'lt_1s' | '1_3s' | '3_10s' | '10_30s' | 'gt_30s';
export type PrivacySafeEventName =
  | 'identity_loaded' | 'readiness_loaded' | 'registration_submitted' | 'intake_step_submitted' | 'insurance_verified'
  | 'insurance_acknowledged' | 'matching_options_loaded' | 'wait_state_displayed' | 'therapist_selection_submitted'
  | 'appointment_booking_submitted' | 'appointment_cancelled' | 'appointment_rescheduled' | 'reactivation_requested' | 'client_journey_error';
export interface PrivacySafeEvent { event_name: PrivacySafeEventName; catalog_version: typeof PRIVACY_EVENT_CATALOG_VERSION; app_version?: string; route?: string; contract_version?: string; stable_result_code?: string; stable_error_code?: string; redacted_correlation_id?: string; duration_bucket?: DurationBucket; }
const prohibited = ['name','email','phone','address','dob','ssn','member','policy','payer','diagnosis','clinical','message','client_id','appointment_id','raw','token'];
export function createPrivacySafeEvent(event: Omit<PrivacySafeEvent, 'catalog_version'>): PrivacySafeEvent { return { ...event, catalog_version: PRIVACY_EVENT_CATALOG_VERSION }; }
export function assertPrivacySafeProperties(properties: Record<string, unknown>): void {
  for (const key of Object.keys(properties)) {
    const normalized = key.toLowerCase();
    if (prohibited.some(term => normalized.includes(term))) throw new Error(`Unsafe analytics property rejected: ${key}`);
  }
}
