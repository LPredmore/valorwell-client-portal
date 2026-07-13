import { z } from 'zod';
export const insuranceOutcomeSchema = z.enum(['active','inactive','member_not_found','no_coverage_for_date','technical_error','manual_review']);
export const insuranceRecordSchema = z.object({ id: z.string().uuid(), display_name: z.string(), subscriber_relationship: z.string(), is_current: z.boolean(), status: z.string(), verification_version: z.string().nullable() });
export type InsuranceRecord = z.infer<typeof insuranceRecordSchema>;
export const insuranceEligibilityStatusSchema = z.object({
  outcome: insuranceOutcomeSchema, verification_current: z.boolean(), verification_version: z.string(), eligibility_state: z.string(), payer_order_clear: z.boolean(), has_other_coverage: z.boolean(), acknowledgement_required: z.boolean(), acknowledged: z.boolean(), intake_continuation_allowed: z.boolean(), therapist_selection_allowed: z.boolean(), client_message: z.string(), next_action: z.string(), exception_reference: z.string().nullable(), contract_version: z.string(),
});
export type InsuranceEligibilityStatus = z.infer<typeof insuranceEligibilityStatusSchema>;
export const saveInsuranceRequestSchema = z.object({ idempotency_key: z.string().min(8), insurance_id: z.string().uuid().optional(), payload: z.record(z.unknown()) });
export type SaveInsuranceRequest = z.infer<typeof saveInsuranceRequestSchema>;
