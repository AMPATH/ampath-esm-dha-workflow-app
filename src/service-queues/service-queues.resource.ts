import { type Encounter, formatDate, openmrsFetch, parseDate, restBaseUrl } from "@openmrs/esm-framework";
import { type Identifer, type MappedEncounter, type MappedVisitQueueEntry, type QueueEntry } from "../types/types";
import dayjs from "dayjs";

export function serveQueueEntry(servicePointName: string, ticketNumber: string, status: string) {
  const abortController = new AbortController();

  return openmrsFetch(`${restBaseUrl}/queueutil/assignticket`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    signal: abortController.signal,
    body: {
      servicePointName,
      ticketNumber,
      status,
    },
  });
}

const mapEncounterProperties = (encounter: Encounter): MappedEncounter => ({
  diagnoses: encounter.diagnoses,
  encounterDatetime: encounter.encounterDatetime,
  encounterType: encounter.encounterType.display,
  obs: encounter.obs,
  provider: encounter.encounterProviders[0]?.provider?.person?.display,
  uuid: encounter.uuid,
  voided: encounter.voided,
});

export const mapVisitQueueEntryProperties = (
  queueEntry: QueueEntry,
  visitQueueNumberAttributeUuid: string,
): MappedVisitQueueEntry => ({
  id: queueEntry.uuid,
  encounters: queueEntry.visit?.encounters?.map(mapEncounterProperties),
  name: queueEntry.display,
  patientUuid: queueEntry.patient.uuid,
  patientAge: queueEntry.patient.person?.age + '',
  patientDob: queueEntry?.patient?.person?.birthdate
    ? formatDate(parseDate(queueEntry.patient.person.birthdate), { time: false })
    : '--',
  patientGender: queueEntry.patient.person.gender,
  queue: queueEntry.queue,
  priority: queueEntry.priority,
  priorityComment: queueEntry.priorityComment,
  status: queueEntry.status,
  startedAt: dayjs(queueEntry.startedAt).toDate(),
  endedAt: queueEntry.endedAt ? dayjs(queueEntry.endedAt).toDate() : null,
  visitType: queueEntry.visit?.visitType?.display,
  queueLocation: (queueEntry?.queue as any)?.location?.uuid,
  visitTypeUuid: queueEntry.visit?.visitType?.uuid,
  visitUuid: queueEntry.visit?.uuid,
  queueUuid: queueEntry.queue.uuid,
  queueEntryUuid: queueEntry.uuid,
  sortWeight: queueEntry.sortWeight,
  visitQueueNumber: queueEntry.visit?.attributes?.find((e) => e?.attributeType?.uuid === visitQueueNumberAttributeUuid)
    ?.value,
  identifiers: queueEntry.patient?.identifiers as Identifer[],
  queueComingFrom: queueEntry?.queueComingFrom?.name,
});