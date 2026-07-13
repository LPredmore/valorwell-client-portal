# Remaining connection checks

Only live Supabase connection and permission checks remain in this document:

- Raw RPC names match `src/integrations/supabase/contracts/rpcNames.ts`.
- RPC argument names and request envelopes match each adapter.
- RPC response fields match the Zod schemas exactly.
- Generated Supabase types align with finalized contracts.
- Client role has execute permission for every expected RPC.
- Cross-client access is rejected.
- RLS behavior protects all table access behind RPCs.
- Edge Function authentication and authorization are correct where applicable.
- Real appointment mutation side effects are correct.
- Real production smoke testing succeeds at `client.valorwell.org` after the audit.

No unfinished Client Portal implementation work should be added to this file.
