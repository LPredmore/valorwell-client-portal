import { z } from 'zod';
import { callValidatedRpc } from '../rpcClient';
import { CLIENT_JOURNEY_RPC } from '../contracts/rpcNames';
import { appointmentSlotSchema } from '../contracts/appointment';
const slotsResponseSchema = z.object({ slots: z.array(appointmentSlotSchema), timezone: z.string(), contract_version: z.string() });
export function fetchAvailableAppointmentSlots(relationship_id: string) { return callValidatedRpc(CLIENT_JOURNEY_RPC.fetchAvailableAppointmentSlots, { relationship_id }, slotsResponseSchema); }
