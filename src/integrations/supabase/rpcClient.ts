import { z } from 'zod';
import { supabase } from './client';
import { ClientJourneyRpcName } from './contracts/rpcNames';
import { CanonicalClientError, normalizeUnknownError, toCanonicalClientError } from './contracts/errors';

type RpcArgs = Record<string, unknown>;
type RpcCallable = (fn: string, args?: RpcArgs) => Promise<{ data: unknown; error: unknown }>;
const rpc = supabase.rpc.bind(supabase) as unknown as RpcCallable;

export class ClientJourneyRpcError extends Error {
  readonly safeError: CanonicalClientError;
  constructor(safeError: CanonicalClientError) {
    super(safeError.code);
    this.name = 'ClientJourneyRpcError';
    this.safeError = safeError;
  }
}

export async function callValidatedRpc<T>(name: ClientJourneyRpcName, args: RpcArgs, schema: z.ZodType<T>): Promise<T> {
  let result: { data: unknown; error: unknown };
  try {
    result = await rpc(name, args);
  } catch (error: unknown) {
    throw new ClientJourneyRpcError(normalizeUnknownError(error));
  }
  if (result.error) throw new ClientJourneyRpcError(normalizeUnknownError(result.error));
  const parsed = schema.safeParse(result.data);
  if (!parsed.success) throw new ClientJourneyRpcError(toCanonicalClientError('MALFORMED_CONTRACT_RESPONSE'));
  return parsed.data;
}
