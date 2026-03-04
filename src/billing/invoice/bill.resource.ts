import { openmrsFetch, restBaseUrl } from '@openmrs/esm-framework';
import { type Bill } from '../types';

export async function fetchBill(billUuid: string): Promise<Bill> {
  const billUrl = `${restBaseUrl}/billing/bill/${billUuid}`;
  const resp = await openmrsFetch<Bill>(billUrl);
  const result = await resp.json();
  return result;
}
