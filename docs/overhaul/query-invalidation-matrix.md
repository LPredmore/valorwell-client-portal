# Query invalidation matrix

Implementation: `src/queries/clientJourneyKeys.ts` and `src/queries/invalidation.ts`.

| Mutation | Invalidated surfaces |
|---|---|
| Identity change/logout | all `clientJourney` query data removed |
| Registration | identity, readiness, policy, dashboard next action |
| Intake/consent/emergency contact | readiness, policy, dashboard next action |
| Insurance save/delete/verify/acknowledge | insurance records, eligibility, readiness, therapist options, wait state, dashboard next action |
| Therapist selection | identity, readiness, policy, active relationship, therapist options, wait state, appointments, slots, messages, billing display, dashboard next action |
| Appointment booking/cancel/reschedule | identity, readiness, policy, active relationship, therapist options, wait state, appointments, slots, messages, billing display, dashboard next action |
| Reactivation request | identity, readiness, policy, messages, dashboard next action |
