import { z } from 'zod';
export const lifecycleStageSchema = z.enum(['Registration','Intake','Matching','Matched','Scheduled','EarlyCare','EstablishedCare','Closed']);
export const clientStateDimensionsSchema = z.object({
  lifecycle_stage: lifecycleStageSchema,
  engagement_state: z.string(), eligibility_state: z.string(), contact_policy: z.string(), service_policy: z.string(), care_cadence: z.string().nullable(),
  at_risk: z.boolean(), closure_reason: z.string().nullable(), closed_at: z.string().datetime().nullable(),
});
export type ClientStateDimensions = z.infer<typeof clientStateDimensionsSchema>;
export const clientReadinessSchema = clientStateDimensionsSchema.extend({
  client_id: z.string().uuid(), tenant_id: z.string().uuid(), registration_complete: z.boolean(), intake_form_complete: z.boolean(), required_consents_complete: z.boolean(), intake_complete: z.boolean(), emergency_contact_complete: z.boolean(), insurance_pathway_ready: z.boolean(), payer_order_clear: z.boolean(), service_allowed: z.boolean(), care_requirements_complete: z.boolean(), therapist_selection_ready: z.boolean(), first_session_ready: z.boolean(), missing_gates: z.array(z.string()), next_required_action: z.object({ code: z.string(), route: z.string(), label: z.string(), message: z.string() }).nullable(), pathway_code: z.string().nullable(), evidence: z.record(z.unknown()).default({}), contract_version: z.string(), evaluated_at: z.string().datetime(),
});
export type ClientReadiness = z.infer<typeof clientReadinessSchema>;
