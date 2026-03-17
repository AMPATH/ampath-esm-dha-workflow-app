import { openmrsFetch, restBaseUrl } from '@openmrs/esm-framework';
import { getClaimsUrl, getClaimsKey } from '../../shared/utils/get-base-url';

async function claimsFetch(path: string, method: string = 'GET') {
  try {
    const [baseUrl, claimsKey] = await Promise.all([getClaimsUrl(), getClaimsKey()]);

    const res = await openmrsFetch(`${baseUrl}${path}`, {
      method,
      headers: {
        'AMPATH-CLAIMS-KEY': claimsKey,
        'Content-Type': 'application/json',
      },
    });

    return res?.data;
  } catch (error: any) {
    return {
      success: false,
      data: null,
      message: error?.response?.data?.message || error?.message || 'Claims API request failed',
    };
  }
}

export async function raiseSHAClaim(billId: string) {
  if (!billId) {
    return {
      success: false,
      data: null,
      message: 'Bill ID is required to raise a SHA claim',
    };
  }

  return claimsFetch(`/claims/${billId}`, 'POST');
}

export async function fetchBillsByDate(billDate: string) {
  if (!billDate) {
    return {
      success: false,
      data: null,
      message: 'Bill date is required',
    };
  }

  return claimsFetch(`/daily-bills?locationUuId=090089ea-1352-11df-a1f1-0026b9348838&billDate=${billDate}`);
}

export async function checkClaimStatus(billUuid: string) {
  if (!billUuid) {
    return {
      success: false,
      data: null,
      message: 'Bill UUID is required',
    };
  }

  return claimsFetch(`/claims/${billUuid}/status`);
}

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

  const startIndex = Math.max(total - 1000, 0) + 20;

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
