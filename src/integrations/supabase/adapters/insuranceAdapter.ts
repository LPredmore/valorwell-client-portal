import { z } from 'zod';
import { callValidatedRpc } from '../rpcClient';
import { CLIENT_JOURNEY_RPC } from '../contracts/rpcNames';
import { insuranceEligibilityStatusSchema, insuranceRecordSchema, InsuranceEligibilityStatus, SaveInsuranceRequest } from '../contracts/insurance';
const recordsSchema = z.object({ records: z.array(insuranceRecordSchema), contract_version: z.string() });
const mutationSchema = z.object({ success: z.boolean(), idempotent: z.boolean(), record: insuranceRecordSchema.nullable(), stable_result_code: z.string(), contract_version: z.string() });
export function fetchInsuranceRecords() { return callValidatedRpc(CLIENT_JOURNEY_RPC.saveClientInsurance, { operation: 'list' }, recordsSchema); }
export function saveClientInsurance(request: SaveInsuranceRequest) { return callValidatedRpc(CLIENT_JOURNEY_RPC.saveClientInsurance, { request }, mutationSchema); }
export function deleteClientInsurance(insurance_id: string, idempotency_key: string) { return callValidatedRpc(CLIENT_JOURNEY_RPC.deleteClientInsurance, { insurance_id, idempotency_key }, mutationSchema); }
export function verifyClientInsurance(insurance_id: string, idempotency_key: string): Promise<InsuranceEligibilityStatus> { return callValidatedRpc(CLIENT_JOURNEY_RPC.verifyClientInsurance, { insurance_id, idempotency_key }, insuranceEligibilityStatusSchema); }
export function fetchInsuranceEligibilityStatus(): Promise<InsuranceEligibilityStatus> { return callValidatedRpc(CLIENT_JOURNEY_RPC.fetchInsuranceEligibilityStatus, {}, insuranceEligibilityStatusSchema); }
export function acknowledgeInsuranceDeferment(verification_version: string, idempotency_key: string): Promise<InsuranceEligibilityStatus> { return callValidatedRpc(CLIENT_JOURNEY_RPC.acknowledgeInsuranceDeferment, { verification_version, idempotency_key }, insuranceEligibilityStatusSchema); }
