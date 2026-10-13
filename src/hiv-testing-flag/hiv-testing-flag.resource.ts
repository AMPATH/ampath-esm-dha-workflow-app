import { openmrsFetch, restBaseUrl } from '@openmrs/esm-framework';
import dayjs from 'dayjs';
import useSWR from 'swr';

export interface EligibilityObs {
  uuid: string;
  obsDatetime: string;
  value: { uuid: string; display: string } | null;
  encounter: {
    uuid: string;
    form: { uuid: string; display: string } | null;
  } | null;
}

export interface HivTestingFlagStatus {
  /** Latest answer to "Client eligible for HIV testing" recorded today, if any. */
  eligibilityObs: EligibilityObs | null;
  /** Whether a consultation was saved after that triage answer, on the same day. */
  hasConsultationAfterTriage: boolean;
}

const OBS_REP = 'custom:(uuid,obsDatetime,value:(uuid,display),encounter:(uuid,form:(uuid,display)))';

/** The flag stays up until the consultation is saved, so keep checking while the page is open. */
const REFRESH_INTERVAL_MS = 60_000;

function today() {
  return dayjs().format('YYYY-MM-DD');
}

export async function getHivTestingFlagStatus(
  patientUuid: string,
  eligibilityConceptUuid: string,
  consultationEncounterTypeUuid: string,
): Promise<HivTestingFlagStatus> {
  const [obsRes, encounterRes] = await Promise.all([
    openmrsFetch<{ results: Array<EligibilityObs> }>(
      `${restBaseUrl}/obs?patient=${patientUuid}&concept=${eligibilityConceptUuid}&v=${OBS_REP}`,
    ),
    openmrsFetch<{ results: Array<{ uuid: string; encounterDatetime: string }> }>(
      `${restBaseUrl}/encounter?patient=${patientUuid}&encounterType=${consultationEncounterTypeUuid}&fromdate=${today()}&v=custom:(uuid,encounterDatetime)`,
    ),
  ]);

  const todaysObs = (obsRes.data.results ?? []).filter((obs) => dayjs(obs.obsDatetime).isSame(dayjs(), 'day'));
  const eligibilityObs =
    todaysObs.sort((a, b) => dayjs(b.obsDatetime).valueOf() - dayjs(a.obsDatetime).valueOf())[0] ?? null;

  // A consultation saved earlier in the day, before the patient was triaged, does not clear the flag.
  const hasConsultationAfterTriage =
    !!eligibilityObs &&
    (encounterRes.data.results ?? []).some(
      (encounter) =>
        dayjs(encounter.encounterDatetime).isSame(eligibilityObs.obsDatetime, 'day') &&
        !dayjs(encounter.encounterDatetime).isBefore(eligibilityObs.obsDatetime),
    );

  return { eligibilityObs, hasConsultationAfterTriage };
}

export function useHivTestingFlagStatus(
  patientUuid: string | null | undefined,
  eligibilityConceptUuid: string,
  consultationEncounterTypeUuid: string,
) {
  const key =
    patientUuid && eligibilityConceptUuid && consultationEncounterTypeUuid
      ? ['hiv-testing-flag', patientUuid, eligibilityConceptUuid, consultationEncounterTypeUuid, today()]
      : null;
  const { data, error, isLoading } = useSWR(
    key,
    () => getHivTestingFlagStatus(patientUuid as string, eligibilityConceptUuid, consultationEncounterTypeUuid),
    { refreshInterval: REFRESH_INTERVAL_MS },
  );
  return { status: data ?? null, error, isLoading };
}
