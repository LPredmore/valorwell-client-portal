# Client contract catalog

Canonical contracts live under `src/integrations/supabase/contracts/`:

- `identity.ts`: authenticated server-derived client context.
- `readiness.ts`: readiness gates and independent state dimensions.
- `insurance.ts`: records, eligibility outcomes, acknowledgement state, OHI/payer-order pathway.
- `matching.ts`: client-approved clinician options and wait state.
- `relationship.ts`: transactional therapist selection and persisted active relationship.
- `appointment.ts`: slots, appointments, appointment mutation results.
- `policy.ts`: explicit permitted actions and reactivation result.
- `errors.ts`: canonical client-safe error codes and copy.
- `rpcNames.ts`: every expected raw Supabase contract identifier.
