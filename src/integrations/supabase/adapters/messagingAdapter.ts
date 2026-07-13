import { z } from 'zod';
import { callValidatedRpc } from '../rpcClient';
import { CLIENT_JOURNEY_RPC } from '../contracts/rpcNames';
const messagesResponseSchema = z.object({ messages: z.array(z.object({ message_id: z.string(), sent_at: z.string().datetime(), display_sender: z.string(), preview: z.string() })), contract_version: z.string() });
export function fetchMessages() { return callValidatedRpc(CLIENT_JOURNEY_RPC.fetchMessages, {}, messagesResponseSchema); }
