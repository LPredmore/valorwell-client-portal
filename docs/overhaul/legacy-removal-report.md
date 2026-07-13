# Legacy removal report

## Removed from the target architecture
- Feature-visible raw Client Journey RPC identifiers.
- Unvalidated adapter responses for the newly defined Client Journey contracts.
- Query-key scattering for new Client Journey data surfaces.
- Privacy-unsafe analytics event shapes for new Client Journey events.
- Production availability of the test-only contract provider.

## Static assertion coverage
`npm run check:legacy` currently blocks service-role references, raw `supabase.rpc()` outside the transport boundary, direct provider-demand writes, private-pay therapy copy, client-facing `Blacklisted`, and browser-computed therapist-led deadlines.

## Remaining legacy migration risk
The repository still contains older screens and utilities that should be replaced by the new adapter-backed hooks before claiming a complete user-facing cutover.
