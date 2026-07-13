import { callValidatedRpc } from '../rpcClient';
import { CLIENT_JOURNEY_RPC } from '../contracts/rpcNames';
import { activeTherapistRelationshipSchema, therapistSelectionResultSchema, TherapistSelectionRequest } from '../contracts/relationship';
export function selectTherapist(request: TherapistSelectionRequest) { return callValidatedRpc(CLIENT_JOURNEY_RPC.selectTherapist, { request }, therapistSelectionResultSchema); }
export function fetchActiveTherapistRelationship() { return callValidatedRpc(CLIENT_JOURNEY_RPC.fetchActiveTherapistRelationship, {}, activeTherapistRelationshipSchema); }
