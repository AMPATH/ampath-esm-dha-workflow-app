import { openmrsFetch, restBaseUrl } from "@openmrs/esm-framework";
import { BillStatus, MappedBill, PatientInvoice, PaymentRequestPayload } from "./types";
import useSWR from "swr";
import { parsePatientDisplay } from "./helpers";

export const finalizeBill = (billUuid: string) => {
  const url = `${restBaseUrl}/billing/bill/${billUuid}`;
  return openmrsFetch(url, {
    method: 'POST',
    body: { status: BillStatus.POSTED },
    headers: {
      'Content-Type': 'application/json',
    },
  });
};

export const processBillPayment = (payload: PaymentRequestPayload, billUuid: string) => {
  const url = `${restBaseUrl}/billing/bill/${billUuid}/payment`;

  return openmrsFetch(url, {
    method: 'POST',
    body: payload,
    headers: {
      'Content-Type': 'application/json',
    },
  });
};

export function useBill(billUuid: string) {
  const url = `${restBaseUrl}/billing/bill/${billUuid}`;
  const { data, error, isLoading, isValidating, mutate } = useSWR<{ data: PatientInvoice }>(
    billUuid ? url : null,
    openmrsFetch,
  );

  let bill = data?.data as PatientInvoice;

  return { bill, error, isLoading, isValidating, mutate };
}

export const mapBillProperties = (bill: PatientInvoice): MappedBill => {
  const activeLineItems = bill?.lineItems?.filter((item) => !item.voided) ?? [];
  const { identifier, name } = parsePatientDisplay(bill?.patient?.display);

  return {
    ...bill,
    patientName: name,
    identifier: identifier,
    patientUuid: bill?.patient?.uuid,
    visitUuid: bill?.visit?.uuid,
    cashPointUuid: bill?.cashPoint?.uuid,
    cashPointName: bill?.cashPoint?.name,
    cashPointLocation: bill?.cashPoint?.location?.display,
    status: bill.status as BillStatus,
    lineItems: activeLineItems,
    billingService: activeLineItems.map((lineItem) => lineItem?.item || lineItem?.billableService || '--').join('  '),
    totalAmount: bill.total,
    netAmount: bill.amountAfterDiscount,
    tenderedAmount: (bill?.payments ?? [])
      .map((item) => item.amountTendered ?? 0)
      .reduce((prev, curr) => prev + curr, 0),
  };
};