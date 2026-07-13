import { callValidatedRpc } from '../rpcClient';
import { CLIENT_JOURNEY_RPC } from '../contracts/rpcNames';
import { RegistrationRequest, registrationResultSchema, RegistrationResult } from '../contracts/registration';
export function registerClient(request: RegistrationRequest): Promise<RegistrationResult> {
  return callValidatedRpc(CLIENT_JOURNEY_RPC.registerClient, { request }, registrationResultSchema);
}
