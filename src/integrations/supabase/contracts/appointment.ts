import { z } from 'zod';
export const appointmentSchema = z.object({ appointment_id: z.string().uuid(), starts_at: z.string().datetime(), ends_at: z.string().datetime(), status: z.string(), display_status: z.string(), clinician_display_name: z.string().nullable(), timezone: z.string() });
export type Appointment = z.infer<typeof appointmentSchema>;
export const appointmentSlotSchema = z.object({ slot_id: z.string(), starts_at: z.string().datetime(), ends_at: z.string().datetime(), timezone: z.string(), slot_version: z.string() });
export type AppointmentSlot = z.infer<typeof appointmentSlotSchema>;
export const appointmentMutationResultSchema = z.object({ success: z.boolean(), idempotent: z.boolean(), appointment: appointmentSchema.nullable(), stable_result_code: z.string(), contract_version: z.string() });
export type AppointmentMutationResult = z.infer<typeof appointmentMutationResultSchema>;
