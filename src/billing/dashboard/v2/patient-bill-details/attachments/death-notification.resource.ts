import { useEffect, useState } from 'react';
import { openmrsFetch, restBaseUrl, showSnackbar, useConfig } from '@openmrs/esm-framework';
import { type ConfigObject } from '../../../../../config-schema';
import { useFormEncounters } from '../../../../../death-reporting/death-reporting-form-button.resource';
import { fetchPatientEncountersByType } from '../../../../../shared/services/encounters.resource';
import {
  type DeathNotificationEncounter,
  type DeathNotificationPatient,
} from './death-notification.component';

interface DeathNotificationData {
  patient?: DeathNotificationPatient;
  encounter?: DeathNotificationEncounter;
  isLoading: boolean;
}

export const useDeathNotification = (
  patientUuid?: string,
  requireDeceasedObservation = false,
): DeathNotificationData => {
  const { formEncounterTypes } = useConfig<ConfigObject>();
  const {
    hasDeceasedObservation,
    hasDeathReportingFormEncounter,
    isLoading: isLoadingDeathStatus,
  } = useFormEncounters(patientUuid ?? '');
  const [patient, setPatient] = useState<DeathNotificationPatient>();
  const [encounter, setEncounter] = useState<DeathNotificationEncounter>();
  const [isLoadingData, setIsLoadingData] = useState(false);

  useEffect(() => {
    if (
      isLoadingDeathStatus ||
      !hasDeathReportingFormEncounter ||
      (requireDeceasedObservation && !hasDeceasedObservation) ||
      !patientUuid ||
      !formEncounterTypes.deathReportingEncounterTypeUuid
    ) {
      setPatient(undefined);
      setEncounter(undefined);
      setIsLoadingData(false);
      return;
    }

    let isCurrent = true;
    setIsLoadingData(true);
    setPatient(undefined);
    setEncounter(undefined);

    Promise.all([
      fetchPatientEncountersByType(patientUuid, formEncounterTypes.deathReportingEncounterTypeUuid),
      openmrsFetch(`${restBaseUrl}/patient/${patientUuid}?v=full`),
    ])
      .then(([encounters, patientResponse]) => {
        if (!isCurrent) {
          return;
        }

        const latestEncounter = ((encounters ?? []) as Array<DeathNotificationEncounter & { voided?: boolean }>)
          .filter((item: DeathNotificationEncounter & { voided?: boolean }) => !item.voided)
          .sort(
            (left: DeathNotificationEncounter, right: DeathNotificationEncounter) =>
              new Date(right.encounterDatetime ?? 0).getTime() - new Date(left.encounterDatetime ?? 0).getTime(),
          )[0] as DeathNotificationEncounter | undefined;
        const patientData = patientResponse?.data as DeathNotificationPatient | undefined;

        if (!latestEncounter || !patientData) {
          showSnackbar({
            kind: 'error',
            title: 'Death Notification unavailable',
            subtitle: 'Could not load the completed death reporting form and patient details.',
          });
          return;
        }

        setPatient(patientData);
        setEncounter(latestEncounter);
      })
      .catch((error) => {
        console.error('Failed to load death notification details', error);
        if (isCurrent) {
          showSnackbar({
            kind: 'error',
            title: 'Death Notification unavailable',
            subtitle: 'Could not load the completed death reporting form and patient details.',
          });
        }
      })
      .finally(() => {
        if (isCurrent) {
          setIsLoadingData(false);
        }
      });

    return () => {
      isCurrent = false;
    };
  }, [
    formEncounterTypes.deathReportingEncounterTypeUuid,
    hasDeceasedObservation,
    hasDeathReportingFormEncounter,
    isLoadingDeathStatus,
    patientUuid,
    requireDeceasedObservation,
  ]);

  return {
    patient,
    encounter,
    isLoading: isLoadingDeathStatus || isLoadingData,
  };
};
