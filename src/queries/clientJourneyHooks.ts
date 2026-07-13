import { useQuery } from '@tanstack/react-query';
import { identityAdapter, readinessAdapter, insuranceAdapter, matchingAdapter, relationshipAdapter, appointmentAdapter, policyAdapter, messagingAdapter } from '@/integrations/supabase/adapters';
import { clientJourneyKeys } from './clientJourneyKeys';

export function useAuthenticatedClientContext() { return useQuery({ queryKey: clientJourneyKeys.identity(), queryFn: identityAdapter.fetchAuthenticatedClientContext, retry: 1 }); }
export function useClientReadiness() { return useQuery({ queryKey: clientJourneyKeys.readiness(), queryFn: readinessAdapter.fetchClientReadiness, refetchOnWindowFocus: true }); }
export function usePermittedActions() { return useQuery({ queryKey: clientJourneyKeys.policy(), queryFn: policyAdapter.fetchPermittedActions, refetchOnWindowFocus: true }); }
export function useInsuranceRecords() { return useQuery({ queryKey: clientJourneyKeys.insuranceRecords(), queryFn: insuranceAdapter.fetchInsuranceRecords }); }
export function useInsuranceEligibilityStatus() { return useQuery({ queryKey: clientJourneyKeys.insuranceEligibility(), queryFn: insuranceAdapter.fetchInsuranceEligibilityStatus, refetchOnWindowFocus: true }); }
export function useMatchableClinicians() { return useQuery({ queryKey: clientJourneyKeys.therapistOptions(), queryFn: matchingAdapter.fetchMatchableClinicians, refetchOnWindowFocus: true }); }
export function useClientWaitState() { return useQuery({ queryKey: clientJourneyKeys.waitState(), queryFn: matchingAdapter.fetchClientWaitState, refetchOnWindowFocus: true }); }
export function useActiveTherapistRelationship() { return useQuery({ queryKey: clientJourneyKeys.activeRelationship(), queryFn: relationshipAdapter.fetchActiveTherapistRelationship, refetchOnWindowFocus: true }); }
export function useAppointments() { return useQuery({ queryKey: clientJourneyKeys.appointments(), queryFn: appointmentAdapter.fetchAppointments, refetchOnWindowFocus: true }); }
export function useMessages() { return useQuery({ queryKey: clientJourneyKeys.messages(), queryFn: messagingAdapter.fetchMessages }); }
