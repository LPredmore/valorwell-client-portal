import { callValidatedRpc } from '../rpcClient';
import { CLIENT_JOURNEY_RPC } from '../contracts/rpcNames';
import { clientReadinessSchema, ClientReadiness } from '../contracts/readiness';
export function fetchClientReadiness(): Promise<ClientReadiness> {
  return callValidatedRpc(CLIENT_JOURNEY_RPC.fetchClientReadiness, {}, clientReadinessSchema);
}
export function advanceClientIntakeIfReady(idempotency_key: string): Promise<ClientReadiness> {
  return callValidatedRpc(CLIENT_JOURNEY_RPC.advanceClientIntakeIfReady, { idempotency_key }, clientReadinessSchema);
}
