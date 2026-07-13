import { z } from 'zod';
export const permittedActionsSchema = z.object({ view_records: z.boolean(), view_billing: z.boolean(), view_messages: z.boolean(), initiate_message: z.boolean(), select_therapist: z.boolean(), view_slots: z.boolean(), book_appointment: z.boolean(), cancel_appointment: z.boolean(), reschedule_appointment: z.boolean(), request_reactivation: z.boolean(), contract_version: z.string() });
export type PermittedActions = z.infer<typeof permittedActionsSchema>;
export const reactivationResultSchema = z.object({ success: z.boolean(), idempotent: z.boolean(), stable_result_code: z.string(), client_message: z.string(), next_action: z.string(), contract_version: z.string() });
export type ReactivationResult = z.infer<typeof reactivationResultSchema>;
