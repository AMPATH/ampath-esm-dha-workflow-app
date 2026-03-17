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

export async function processPayment(billId: string, payload: any) {
  return openmrsFetch(`${restBaseUrl}/billing/bill/${billId}/payment`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: payload,
  });
}
