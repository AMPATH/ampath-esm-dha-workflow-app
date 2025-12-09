import React from 'react';
import { ExtensionSlot } from '@openmrs/esm-framework';
import styles from './metrics.scss';
import TriageWaitingPatientsExtension from './waiting-patients.extension';
import TriageAttendedToPatientsExtension from './attended-patients.extension';

export interface Service {
  display: string;
  uuid?: string;
}

function TriageMetricsContainer() {
  return (
    <div className={styles.cardContainer}>
      <TriageWaitingPatientsExtension />
      <TriageAttendedToPatientsExtension />
    </div>
  );
}

export default TriageMetricsContainer;
