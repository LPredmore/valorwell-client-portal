import { QueryClient } from '@tanstack/react-query';
import { clientJourneyKeys } from './clientJourneyKeys';

export async function clearClientJourneyCache(queryClient: QueryClient) {
  queryClient.removeQueries({ queryKey: clientJourneyKeys.all });
}

export async function invalidateIdentitySurfaces(queryClient: QueryClient) {
  await Promise.all([
    queryClient.invalidateQueries({ queryKey: clientJourneyKeys.identity() }),
    queryClient.invalidateQueries({ queryKey: clientJourneyKeys.readiness() }),
    queryClient.invalidateQueries({ queryKey: clientJourneyKeys.policy() }),
    queryClient.invalidateQueries({ queryKey: clientJourneyKeys.dashboardNextAction() }),
  ]);
}

export async function invalidateInsuranceSurfaces(queryClient: QueryClient) {
  await Promise.all([
    queryClient.invalidateQueries({ queryKey: clientJourneyKeys.insuranceRecords() }),
    queryClient.invalidateQueries({ queryKey: clientJourneyKeys.insuranceEligibility() }),
    queryClient.invalidateQueries({ queryKey: clientJourneyKeys.readiness() }),
    queryClient.invalidateQueries({ queryKey: clientJourneyKeys.therapistOptions() }),
    queryClient.invalidateQueries({ queryKey: clientJourneyKeys.waitState() }),
    queryClient.invalidateQueries({ queryKey: clientJourneyKeys.dashboardNextAction() }),
  ]);
}

export async function invalidateSchedulingSurfaces(queryClient: QueryClient) {
  await Promise.all([
    queryClient.invalidateQueries({ queryKey: clientJourneyKeys.identity() }),
    queryClient.invalidateQueries({ queryKey: clientJourneyKeys.readiness() }),
    queryClient.invalidateQueries({ queryKey: clientJourneyKeys.policy() }),
    queryClient.invalidateQueries({ queryKey: clientJourneyKeys.activeRelationship() }),
    queryClient.invalidateQueries({ queryKey: clientJourneyKeys.therapistOptions() }),
    queryClient.invalidateQueries({ queryKey: clientJourneyKeys.waitState() }),
    queryClient.invalidateQueries({ queryKey: clientJourneyKeys.appointments() }),
    queryClient.invalidateQueries({ queryKey: [...clientJourneyKeys.all, 'appointmentSlots'] }),
    queryClient.invalidateQueries({ queryKey: clientJourneyKeys.messages() }),
    queryClient.invalidateQueries({ queryKey: clientJourneyKeys.approvedBillingDisplay() }),
    queryClient.invalidateQueries({ queryKey: clientJourneyKeys.dashboardNextAction() }),
  ]);
}
