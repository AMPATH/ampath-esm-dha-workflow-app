import { openmrsFetch, restBaseUrl } from '@openmrs/esm-framework';
import dayjs from 'dayjs';
import useSWR from 'swr';
import {
  type ConsultationEncounter,
  type LabOrder,
  type LabOrderWithResult,
  type LabResultObs,
} from './consultation-results.types';

const ORDER_REP =
  'custom:(uuid,orderNumber,action,dateActivated,dateStopped,fulfillerStatus,fulfillerComment,concept:(uuid,display))';
const RESULT_OBS_REP =
  'custom:(uuid,obsDatetime,value,interpretation,order:(uuid),groupMembers:(uuid,concept:(uuid,display),value,interpretation))';
const CONSULTATION_REP =
  'custom:(uuid,encounterDatetime,form:(uuid,display),visit:(uuid),diagnoses:(uuid,display,rank,voided))';

/** Results refresh while the chart is open, so a clinician sees results as the lab enters them. */
const REFRESH_INTERVAL_MS = 60_000;

function today() {
  return dayjs().format('YYYY-MM-DD');
}

/**
 * Lab results are saved as an obs on the ordered test concept, linked to the order (`obs.order`);
 * panels such as a CBC are an obs group whose members hold the individual values.
 */
async function fetchResultForOrder(patientUuid: string, order: LabOrder): Promise<LabResultObs | null> {
  const res = await openmrsFetch<{ results: Array<LabResultObs> }>(
    `${restBaseUrl}/obs?patient=${patientUuid}&concept=${order.concept.uuid}&v=${RESULT_OBS_REP}`,
  );
  return res.data.results?.find((obs) => obs.order?.uuid === order.uuid) ?? null;
}

export async function getTodaysLabOrders(
  patientUuid: string,
  testOrderTypeUuid: string,
): Promise<Array<LabOrderWithResult>> {
  const res = await openmrsFetch<{ results: Array<LabOrder> }>(
    `${restBaseUrl}/order?patient=${patientUuid}&orderTypes=${testOrderTypeUuid}&activatedOnOrAfterDate=${today()}&v=${ORDER_REP}`,
  );
  const orders = (res.data.results ?? []).filter((order) => order.action !== 'DISCONTINUE');

  return Promise.all(
    orders.map(async (order) => ({
      ...order,
      result: await fetchResultForOrder(patientUuid, order),
    })),
  );
}

export async function getTodaysConsultation(
  patientUuid: string,
  encounterTypeUuid: string,
  formUuids: Array<string>,
): Promise<ConsultationEncounter | null> {
  const res = await openmrsFetch<{ results: Array<ConsultationEncounter> }>(
    `${restBaseUrl}/encounter?patient=${patientUuid}&encounterType=${encounterTypeUuid}&fromdate=${today()}&v=${CONSULTATION_REP}`,
  );
  const consultations = (res.data.results ?? []).filter(
    (encounter) => !!encounter.form && formUuids.includes(encounter.form.uuid),
  );

  return (
    consultations.sort((a, b) => dayjs(b.encounterDatetime).valueOf() - dayjs(a.encounterDatetime).valueOf())[0] ?? null
  );
}

export function useTodaysLabOrders(patientUuid: string | null | undefined, testOrderTypeUuid: string) {
  const key = patientUuid && testOrderTypeUuid ? ['todays-lab-orders', patientUuid, testOrderTypeUuid, today()] : null;
  const { data, error, isLoading, isValidating, mutate } = useSWR(
    key,
    () => getTodaysLabOrders(patientUuid as string, testOrderTypeUuid),
    { refreshInterval: REFRESH_INTERVAL_MS },
  );
  return { orders: data ?? [], error, isLoading, isValidating, mutate };
}

export function useTodaysConsultation(
  patientUuid: string | null | undefined,
  encounterTypeUuid: string,
  formUuids: Array<string>,
) {
  const key =
    patientUuid && encounterTypeUuid && formUuids?.length
      ? ['todays-consultation', patientUuid, encounterTypeUuid, formUuids.join(','), today()]
      : null;
  const { data, error, isLoading, isValidating, mutate } = useSWR(
    key,
    () => getTodaysConsultation(patientUuid as string, encounterTypeUuid, formUuids),
    { refreshInterval: REFRESH_INTERVAL_MS },
  );
  return { consultation: data ?? null, error, isLoading, isValidating, mutate };
}
