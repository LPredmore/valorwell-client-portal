import { z } from 'zod';
export const registrationRequestSchema = z.object({ idempotency_key: z.string().min(8), first_name: z.string().min(1), last_name: z.string().min(1), preferred_name: z.string().nullable().optional(), phone: z.string().nullable().optional(), time_zone: z.string().min(1) });
export type RegistrationRequest = z.infer<typeof registrationRequestSchema>;
export const registrationResultSchema = z.object({ success: z.boolean(), idempotent: z.boolean(), client_id: z.string().uuid(), signup_complete: z.boolean(), next_required_action: z.object({ code: z.string(), route: z.string(), label: z.string(), message: z.string() }).nullable(), contract_version: z.string() });
export type RegistrationResult = z.infer<typeof registrationResultSchema>;
