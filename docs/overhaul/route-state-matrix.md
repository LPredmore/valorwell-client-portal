# Route state matrix

Implementation: `src/routing/clientJourneyRouter.ts`.

| State | Route decision |
|---|---|
| Unauthenticated | `/login` |
| Signup incomplete | `/profile-setup` |
| Service blocked | `/patient-portal/service-unavailable` |
| Closed | `/patient-portal/records` |
| Server-reported next action | `readiness.next_required_action.route` |
| Matching wait | `/patient-portal/matching/wait` |
| Matching options | `/patient-portal/matching` |
| Matched self-scheduling | `/patient-portal/scheduling` |
| Matched therapist-led | `/patient-portal/scheduling/therapist-led` |
| Scheduled | `/patient-portal/appointments` |
| Default authorized | requested route or `/patient-portal` |
