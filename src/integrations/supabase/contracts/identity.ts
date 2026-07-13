import { z } from 'zod';
export const authenticatedClientContextSchema = z.object({
  user_id: z.string().uuid(), profile_id: z.string().uuid(), client_id: z.string().uuid(), tenant_id: z.string().uuid(),
  email: z.string().email(), is_active: z.boolean(), signup_complete: z.boolean(),
  first_name: z.string().nullable(), last_name: z.string().nullable(), preferred_name: z.string().nullable(), phone: z.string().nullable(), time_zone: z.string().min(1),
  contract_version: z.string().min(1).default('2026-07-valorwell-client-journey'),
});
export type AuthenticatedClientContext = z.infer<typeof authenticatedClientContextSchema>;
