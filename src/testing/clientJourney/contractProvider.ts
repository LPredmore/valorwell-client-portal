export const TEST_CONTRACT_PROVIDER_ENABLED = import.meta.env.MODE === 'test';
export function assertTestContractProviderAllowed() {
  if (!TEST_CONTRACT_PROVIDER_ENABLED) throw new Error('The test contract provider is unavailable outside test builds.');
}
