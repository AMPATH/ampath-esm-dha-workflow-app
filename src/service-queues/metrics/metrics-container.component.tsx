import React from 'react';
import { ExtensionSlot } from '@openmrs/esm-framework';
import styles from './metrics-container.scss';
import AttendedToPatientsExtension from './metrics-cards/attended-patients.extension';
import WaitingPatientsExtension from './metrics-cards/waiting-patients.extension';

export interface Service {
  display: string;
  uuid?: string;
}

function MetricsContainer() {
  return (
    <>
      <div className={styles.cardContainer}>
        <WaitingPatientsExtension />
        <AttendedToPatientsExtension />;
      </div>
    </>
  );
}

export default MetricsContainer;
