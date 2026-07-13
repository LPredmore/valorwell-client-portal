import { callValidatedRpc } from '../rpcClient';
import { CLIENT_JOURNEY_RPC } from '../contracts/rpcNames';
import { authenticatedClientContextSchema, AuthenticatedClientContext } from '../contracts/identity';
export function fetchAuthenticatedClientContext(): Promise<AuthenticatedClientContext> {
  return callValidatedRpc(CLIENT_JOURNEY_RPC.fetchAuthenticatedClientContext, {}, authenticatedClientContextSchema);
}
