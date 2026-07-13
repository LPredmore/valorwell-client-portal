import { ClientReadiness } from '@/integrations/supabase/contracts/readiness';
import { PermittedActions } from '@/integrations/supabase/contracts/policy';
import { ActiveTherapistRelationship } from '@/integrations/supabase/contracts/relationship';
import { WaitState } from '@/integrations/supabase/contracts/matching';

export type ClientRouteDecision = { route: string; reason: string; blocked: boolean };
export function decideClientJourneyRoute(input: { authenticated: boolean; signupComplete?: boolean; readiness?: ClientReadiness; permittedActions?: PermittedActions; relationship?: ActiveTherapistRelationship; waitState?: WaitState; requestedRoute?: string }): ClientRouteDecision {
  if (!input.authenticated) return { route: '/login', reason: 'authentication_required', blocked: true };
  if (input.signupComplete === false) return { route: '/profile-setup', reason: 'signup_incomplete', blocked: true };
  const readiness = input.readiness;
  if (!readiness) return { route: '/patient-portal', reason: 'loading_or_recovery', blocked: false };
  if (readiness.service_policy === 'service_blocked') return { route: '/patient-portal/service-unavailable', reason: 'service_blocked', blocked: !input.permittedActions?.view_records };
  if (readiness.lifecycle_stage === 'Closed') return { route: '/patient-portal/records', reason: 'closed_access', blocked: false };
  if (readiness.next_required_action?.route) return { route: readiness.next_required_action.route, reason: readiness.next_required_action.code, blocked: false };
  if (readiness.lifecycle_stage === 'Matching' && input.waitState?.active && !input.waitState.options_available) return { route: '/patient-portal/matching/wait', reason: 'matching_wait', blocked: false };
  if (readiness.lifecycle_stage === 'Matching') return { route: '/patient-portal/matching', reason: 'matching_options', blocked: false };
  if (readiness.lifecycle_stage === 'Matched' && input.relationship?.scheduling_branch === 'self_scheduling') return { route: '/patient-portal/scheduling', reason: 'self_scheduling', blocked: false };
  if (readiness.lifecycle_stage === 'Matched' && input.relationship?.scheduling_branch === 'therapist_led') return { route: '/patient-portal/scheduling/therapist-led', reason: 'therapist_led', blocked: false };
  if (readiness.lifecycle_stage === 'Scheduled') return { route: '/patient-portal/appointments', reason: 'scheduled', blocked: false };
  return { route: input.requestedRoute ?? '/patient-portal', reason: 'default_authorized', blocked: false };
}
