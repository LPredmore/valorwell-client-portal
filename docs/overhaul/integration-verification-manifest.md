# Integration verification manifest

This is the handoff for the later Supabase connection and permission audit. The Client Portal expects the raw RPC identifiers centralized in `src/integrations/supabase/contracts/rpcNames.ts`. All feature code should call adapter methods rather than raw Supabase RPC identifiers.

| Adapter method | Expected raw contract | Request | Response schema | Identity server-derived | Stable codes | Invalidations | Consumers | Live check required |
|---|---|---|---|---|---|---|---|---|
| `identityAdapter.fetchAuthenticatedClientContext` | `client_portal_fetch_authenticated_client_context` | authenticated session only | `authenticatedClientContextSchema` | Yes | canonical auth/identity errors | identity, readiness, policy, dashboard | Auth provider, route guard | RPC name, grants, RLS, duplicate-account behavior |
| `registrationAdapter.registerClient` | `client_portal_register_client` | `RegistrationRequest` | `registrationResultSchema` | Yes | duplicate/idempotent/validation | identity, readiness, dashboard | Registration/Profile setup | RPC args, idempotency, minor-client behavior |
| `readinessAdapter.fetchClientReadiness` | `client_portal_fetch_readiness` | authenticated session only | `clientReadinessSchema` | Yes | malformed/readiness incomplete | readiness, dashboard | Dashboard, guards, all flows | field names, contract version, state dimensions |
| `readinessAdapter.advanceClientIntakeIfReady` | `client_portal_advance_intake_if_ready` | idempotency key | `clientReadinessSchema` | Yes | readiness incomplete/idempotent | readiness, policy, dashboard | Intake | canonical gate transitions |
| `insuranceAdapter.fetchInsuranceRecords` | `client_portal_save_insurance` list operation | operation list | records schema | Yes | unauthorized/malformed | insurance records | Insurance UI | final list endpoint naming |
| `insuranceAdapter.saveClientInsurance` | `client_portal_save_insurance` | `SaveInsuranceRequest` | insurance mutation schema | Yes | validation/idempotent | insurance, eligibility, readiness, matching | Insurance UI | args and PHI handling |
| `insuranceAdapter.deleteClientInsurance` | `client_portal_delete_insurance` | insurance id, idempotency key | insurance mutation schema | Yes | unauthorized/stale | insurance, eligibility, readiness, matching | Insurance UI | permissions |
| `insuranceAdapter.verifyClientInsurance` | `client_portal_verify_insurance` | insurance id, idempotency key | `insuranceEligibilityStatusSchema` | Yes | active/inactive/member_not_found/no_coverage/technical/manual | eligibility, readiness, matching | Insurance UI | payer outcome mapping |
| `insuranceAdapter.fetchInsuranceEligibilityStatus` | `client_portal_fetch_insurance_eligibility` | authenticated session only | `insuranceEligibilityStatusSchema` | Yes | verification required/manual review | eligibility, readiness | Insurance/readiness | latest verification version |
| `insuranceAdapter.acknowledgeInsuranceDeferment` | `client_portal_acknowledge_insurance_deferment` | verification version, idempotency key | `insuranceEligibilityStatusSchema` | Yes | idempotent/stale | eligibility, readiness, matching | Insurance acknowledgement | acknowledgement persistence |
| `matchingAdapter.fetchMatchableClinicians` | `client_portal_fetch_matchable_clinicians` | authenticated session only | `matchableCliniciansResponseSchema` | Yes | stale/readiness/service blocked | therapist options, wait state | Matching | private provider data redaction |
| `matchingAdapter.fetchClientWaitState` | `client_portal_fetch_wait_state` | authenticated session only | `waitStateSchema` | Yes | malformed | wait state, dashboard | Matching wait path | provider-demand persistence |
| `relationshipAdapter.selectTherapist` | `client_portal_select_therapist` | staff id, option version, idempotency key | `therapistSelectionResultSchema` | Yes | stale option/unavailable/idempotent | scheduling surfaces | Therapist selection | transaction and branch persistence |
| `relationshipAdapter.fetchActiveTherapistRelationship` | `client_portal_fetch_active_relationship` | authenticated session only | `activeTherapistRelationshipSchema` | Yes | missing/malformed | relationship, scheduling | Scheduling | persisted branch/deadline source |
| `schedulingAdapter.fetchAvailableAppointmentSlots` | `client_portal_fetch_available_slots` | relationship id | slots response schema | Yes | stale/service blocked | slots | Scheduling | timezone/DST/filtering |
| `appointmentAdapter.fetchAppointments` | `client_portal_fetch_appointments` | authenticated session only | appointments response schema | Yes | unauthorized | appointments | Dashboard/appointments | historical access and closed-client permissions |
| `appointmentAdapter.bookAppointment` | `client_portal_book_appointment` | relationship id, slot id, slot version, idempotency key | `appointmentMutationResultSchema` | Yes | booking contention/stale slot/idempotent | scheduling surfaces | Booking | no double active appointments |
| `appointmentAdapter.cancelAppointment` | `client_portal_cancel_appointment` | appointment id, reason, idempotency key | `appointmentMutationResultSchema` | Yes | appointment changed/service policy | scheduling surfaces | Cancellation | blocked-care cancellation permissions |
| `appointmentAdapter.rescheduleAppointment` | `client_portal_reschedule_appointment` | appointment id, replacement slot/version, idempotency key | `appointmentMutationResultSchema` | Yes | appointment changed/stale slot | scheduling surfaces | Rescheduling | original appointment state changes |
| `policyAdapter.fetchPermittedActions` | `client_portal_fetch_permitted_actions` | authenticated session only | `permittedActionsSchema` | Yes | service blocked/unauthorized | policy, dashboard | Guards/buttons | Do Not Contact and service blocked rules |
| `policyAdapter.requestReactivation` | `client_portal_request_reactivation` | reason code, idempotency key | `reactivationResultSchema` | Yes | idempotent/service blocked | identity, readiness, policy, dashboard | Reactivation | no direct lifecycle reopening |
| `messagingAdapter.fetchMessages` | `client_portal_fetch_messages` | authenticated session only | messages response schema | Yes | unauthorized | messages | Dashboard/messages | message-preview redaction |

## Later live-connection checks only
- Raw RPC names match.
- Argument names and shapes match.
- Response fields and contract versions match schemas.
- Authenticated client role has execute permission.
- Cross-client rejection and RLS behavior are correct.
- Edge Function authentication and real appointment mutation side effects are correct.
- Production smoke testing succeeds.
