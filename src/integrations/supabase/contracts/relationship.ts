import { z } from 'zod';
import { schedulingBranchSchema } from './matching';
export const therapistSelectionRequestSchema = z.object({ staff_id: z.string().uuid(), option_version: z.string(), idempotency_key: z.string().min(8) });
export type TherapistSelectionRequest = z.infer<typeof therapistSelectionRequestSchema>;
export const therapistSelectionResultSchema = z.object({ success: z.boolean(), idempotent: z.boolean(), relationship_id: z.string().uuid(), client_id: z.string().uuid(), staff_id: z.string().uuid(), lifecycle_stage: z.string(), scheduling_branch: schedulingBranchSchema, therapist_led_deadline_at: z.string().datetime().nullable(), contract_version: z.string() });
export type TherapistSelectionResult = z.infer<typeof therapistSelectionResultSchema>;
export const activeTherapistRelationshipSchema = z.object({ assigned_staff_id: z.string().uuid(), relationship_id: z.string().uuid(), scheduling_branch: schedulingBranchSchema, therapist_led_deadline_at: z.string().datetime().nullable(), started_at: z.string().datetime(), first_scheduled_appointment_id: z.string().uuid().nullable(), contract_version: z.string() }).nullable();
export type ActiveTherapistRelationship = z.infer<typeof activeTherapistRelationshipSchema>;
