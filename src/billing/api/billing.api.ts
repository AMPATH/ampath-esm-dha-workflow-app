import { openmrsFetch, restBaseUrl } from '@openmrs/esm-framework';

export async function fetchBillById(billId: string) {
  const res = await openmrsFetch(`${restBaseUrl}/billing/bill/${billId}`);
  return res.data;
}

export async function fetchPaymentModes() {
  const res = await openmrsFetch(`${restBaseUrl}/billing/paymentMode`);
  return res.data;
}

export async function fetchLatest1000Bills() {
  const countRes = await openmrsFetch(
    `${restBaseUrl}/billing/bill?v=custom:(id,uuid,dateCreated,status,receiptNumber,patient:(uuid,display),cashier:(uuid,display),lineItems:(uuid,price,priceName,billableService,voided))&status=PENDING,POSTED,PAID&limit=1&startIndex=0&totalCount=true`,
  );

  const total = countRes.data.totalCount ?? 0;

  const startIndex = Math.max(total - 1000, 0);

  const page1 = await openmrsFetch(
    `${restBaseUrl}/billing/bill?v=custom:(id,uuid,dateCreated,status,receiptNumber,patient:(uuid,display),cashier:(uuid,display),lineItems:(uuid,price,priceName,billableService,voided))&status=PENDING,POSTED,PAID&limit=500&startIndex=${startIndex}`,
  );

  const page2 = await openmrsFetch(
    `${restBaseUrl}/billing/bill?v=custom:(id,uuid,dateCreated,status,receiptNumber,patient:(uuid,display),cashier:(uuid,display),lineItems:(uuid,price,priceName,billableService,voided))&status=PENDING,POSTED,PAID&limit=500&startIndex=${startIndex + 500}`,
  );

  const results = [...(page1.data.results ?? []), ...(page2.data.results ?? [])];

  return { results };
}

export async function processPayment(billId: string, payload: any) {
  return openmrsFetch(`${restBaseUrl}/billing/bill/${billId}/payment`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: payload,
  });
}

export async function raiseSHAClaim(billId: string, payload: any) {
  return openmrsFetch(`${restBaseUrl}/billing/bill/${billId}/sha-claim`, {
    method: 'POST',
    body: payload,
  });
}
