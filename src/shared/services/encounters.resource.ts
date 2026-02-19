import { openmrsFetch, restBaseUrl } from '@openmrs/esm-framework';

export async function fetchPatientEncountersByType(patientUuid: string, encounterTypeUuid: string) {
  const res = await openmrsFetch(
    `${restBaseUrl}/encounter?patient=${patientUuid}&encounterType=${encounterTypeUuid}&v=full`,
  );

  return res.data.results ?? [];
}
export async function getPatientEncounters(patientUuid: string) {
  const res = await openmrsFetch(`${restBaseUrl}/encounter?patient=${patientUuid}&v=full`);

  return res.data.results ?? [];
}
