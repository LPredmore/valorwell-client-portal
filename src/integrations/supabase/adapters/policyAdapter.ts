import { callValidatedRpc } from '../rpcClient';
import { CLIENT_JOURNEY_RPC } from '../contracts/rpcNames';
import { permittedActionsSchema, reactivationResultSchema } from '../contracts/policy';
export function fetchPermittedActions() { return callValidatedRpc(CLIENT_JOURNEY_RPC.fetchPermittedActions, {}, permittedActionsSchema); }
export function requestReactivation(request: { reason_code: string; idempotency_key: string }) { return callValidatedRpc(CLIENT_JOURNEY_RPC.requestReactivation, { request }, reactivationResultSchema); }
