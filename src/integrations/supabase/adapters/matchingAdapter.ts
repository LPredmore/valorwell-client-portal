import { callValidatedRpc } from '../rpcClient';
import { CLIENT_JOURNEY_RPC } from '../contracts/rpcNames';
import { matchableCliniciansResponseSchema, waitStateSchema } from '../contracts/matching';
export function fetchMatchableClinicians() { return callValidatedRpc(CLIENT_JOURNEY_RPC.fetchMatchableClinicians, {}, matchableCliniciansResponseSchema); }
export function fetchClientWaitState() { return callValidatedRpc(CLIENT_JOURNEY_RPC.fetchClientWaitState, {}, waitStateSchema); }
