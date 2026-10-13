import React from 'react';
import { InlineNotification } from '@carbon/react';
import { formatTime, parseDate, useConfig, usePatient } from '@openmrs/esm-framework';
import { type ConfigObject } from '../config-schema';
import { useHivTestingFlagStatus } from './hiv-testing-flag.resource';
import styles from './hiv-testing-flag.extension.scss';

interface HivTestingFlagExtensionProps {
  patientUuid?: string;
}

/**
 * Tells the consulting clinician that triage flagged the patient as eligible for HIV testing.
 * Shown on the day of the triage while the latest answer is Yes, until a consultation is saved after it that day.
 */
const HivTestingFlagExtension: React.FC<HivTestingFlagExtensionProps> = ({ patientUuid: patientUuidProp }) => {
  const { patientUuid: chartPatientUuid } = usePatient();
  const patientUuid = patientUuidProp ?? chartPatientUuid;
  const { hivTestingFlag, consultationResults } = useConfig<ConfigObject>();
  const { status } = useHivTestingFlagStatus(
    patientUuid,
    hivTestingFlag.eligibleForTestingConceptUuid,
    consultationResults.consultationEncounterTypeUuid,
  );

  const obs = status?.eligibilityObs;
  if (!obs || obs.value?.uuid !== hivTestingFlag.yesConceptUuid || status.hasConsultationAfterTriage) {
    return null;
  }

  const triageTime = formatTime(parseDate(obs.obsDatetime));

  return (
    <div className={styles.container}>
      <InlineNotification
        className={styles.notice}
        kind="info"
        lowContrast
        hideCloseButton
        title="Offer an HIV test"
        subtitle={`Triage today at ${triageTime} found this patient should be tested for HIV.`}
      />
    </div>
  );
};

export default HivTestingFlagExtension;
