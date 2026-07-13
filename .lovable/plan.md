# ValorWell Client Portal Application Completion Plan

This plan supersedes prior placeholder-oriented plans. The Client Portal is implemented against the finalized server-authoritative Client Journey contracts and stops before live Supabase connectivity verification.

## Implementation inventory
- Complete and retained: base React/Vite shell, Supabase browser client initialization, existing portal entry routes while new canonical routing is adopted.
- Complete but moved behind an adapter: identity, readiness, insurance, matching, relationship, scheduling, appointment, policy, and messaging contract calls.
- Partial and completed: canonical DTOs, runtime schemas, safe errors, query keys, invalidation helpers, route decision function, privacy event catalog, test-only contract-provider guard, documentation handoff.
- Duplicated and consolidated: readiness, matching, insurance verification, appointment mutation, and identity contract definitions now have single permanent boundaries.
- Unsafe and replaced: feature-visible raw RPC identifiers are centralized in `rpcNames.ts`; low-level RPC compatibility lives only in `rpcClient.ts`.
- Legacy and removed from target architecture: browser-owned therapist matchability, legacy flat status routing, private-pay fallback behavior, raw backend errors, ClickUp dependencies, and storage-authoritative wait state.
- Obsolete and deleted by follow-up cleanup: old debug tooling and table-oriented feature code should be removed as screens complete adapter adoption.

## Required sequence
1. Complete Client Portal application behavior through adapter-backed screens and hooks.
2. Pass typecheck, build, lint, unit, integration, overhaul, accessibility, E2E, and legacy static checks.
3. Produce and maintain the Supabase integration verification manifest.
4. Stop before live Supabase contract verification.

Live Supabase RPC names, parameter names, RLS behavior, grants, and Edge Function permissions are intentionally reserved for the later connection audit.
