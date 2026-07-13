import { z } from 'zod';
export const schedulingBranchSchema = z.enum(['self_scheduling','therapist_led']);
export const matchableClinicianSchema = z.object({ staff_id: z.string().uuid(), display_name: z.string(), image_url: z.string().url().nullable(), bio: z.string().nullable(), treatment_approaches: z.array(z.string()), scheduling_branch: schedulingBranchSchema, next_available_at: z.string().datetime().nullable(), option_version: z.string() });
export type MatchableClinician = z.infer<typeof matchableClinicianSchema>;
export const matchableCliniciansResponseSchema = z.object({ options: z.array(matchableClinicianSchema), contract_version: z.string() });
export const waitStateSchema = z.object({ active: z.boolean(), entered_at: z.string().datetime().nullable(), reason_category: z.string().nullable(), client_message: z.string(), next_action: z.string(), release_state: z.string().nullable(), options_available: z.boolean(), contract_version: z.string() });
export type WaitState = z.infer<typeof waitStateSchema>;
