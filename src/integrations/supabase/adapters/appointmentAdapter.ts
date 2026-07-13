import { z } from 'zod';
import { callValidatedRpc } from '../rpcClient';
import { CLIENT_JOURNEY_RPC } from '../contracts/rpcNames';
import { appointmentMutationResultSchema, appointmentSchema } from '../contracts/appointment';
const appointmentsResponseSchema = z.object({ appointments: z.array(appointmentSchema), contract_version: z.string() });
export function fetchAppointments() { return callValidatedRpc(CLIENT_JOURNEY_RPC.fetchAppointments, {}, appointmentsResponseSchema); }
export function bookAppointment(request: { relationship_id: string; slot_id: string; slot_version: string; idempotency_key: string }) { return callValidatedRpc(CLIENT_JOURNEY_RPC.bookAppointment, { request }, appointmentMutationResultSchema); }
export function cancelAppointment(request: { appointment_id: string; reason_code?: string; idempotency_key: string }) { return callValidatedRpc(CLIENT_JOURNEY_RPC.cancelAppointment, { request }, appointmentMutationResultSchema); }
export function rescheduleAppointment(request: { appointment_id: string; replacement_slot_id: string; replacement_slot_version: string; idempotency_key: string }) { return callValidatedRpc(CLIENT_JOURNEY_RPC.rescheduleAppointment, { request }, appointmentMutationResultSchema); }
