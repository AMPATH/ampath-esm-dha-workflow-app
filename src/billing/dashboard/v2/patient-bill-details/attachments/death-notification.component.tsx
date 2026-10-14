import React, { forwardRef } from 'react';
import styles from './death-notification.scss';

export interface DeathNotificationObservation {
  concept?: { display?: string; name?: { name?: string } };
  value?: string | number | { display?: string; name?: { name?: string } } | null;
  valueText?: string;
  valueNumeric?: number;
  valueDatetime?: string;
  valueCoded?: { display?: string; name?: { name?: string } } | string;
  valueCodedName?: { name?: string; display?: string };
  voided?: boolean;
  groupMembers?: DeathNotificationObservation[];
  obs?: DeathNotificationObservation[];
}

export interface DeathNotificationEncounter {
  encounterDatetime?: string;
  location?: { display?: string };
  provider?: { display?: string; person?: { display?: string } };
  obs?: DeathNotificationObservation[];
}

export interface DeathNotificationPatient {
  person?: {
    display?: string;
    gender?: string;
    birthdate?: string;
    age?: number;
  };
  identifiers?: Array<{
    identifier?: string;
    identifierType?: { display?: string };
  }>;
}

interface DeathNotificationProps {
  patient?: DeathNotificationPatient;
  encounter?: DeathNotificationEncounter;
}

const getObservationValue = (observation: DeathNotificationObservation): string => {
  const codedValue = observation.valueCoded ?? observation.value;
  if (typeof codedValue === 'object' && codedValue) {
    return codedValue.display ?? codedValue.name?.name ?? observation.valueCodedName?.display ?? observation.valueCodedName?.name ?? '';
  }

  const value = observation.valueText ?? observation.valueDatetime ?? observation.valueNumeric ?? codedValue;
  return value == null ? '' : String(value);
};

const flattenObservations = (observations: DeathNotificationObservation[] = []): DeathNotificationObservation[] =>
  observations?.flatMap((observation) => {
    if (!observation || observation.voided) {
      return [];
    }

    // , ...flattenObservations(observation.groupMembers), ...flattenObservations(observation.obs)

    return [observation];
  });

const DeathNotification = forwardRef<HTMLDivElement, DeathNotificationProps>(({ patient, encounter }, ref) => {
  const person = patient?.person;
  const identifiers = (patient?.identifiers ?? []).filter(
    (identifier) =>
      identifier.identifier && identifier.identifierType?.display?.trim().toLowerCase() !== 'amrs universal id',
  );
  const observations = flattenObservations(encounter?.obs).filter((observation) => getObservationValue(observation));
  const formatDate = (date?: string) => (date ? new Date(date).toLocaleDateString() : '—');

  return (
    <div
      ref={ref}
      className={styles.dnRoot}
    >
      <header className={styles.dnHeader}>
        <div className={styles.dnEyebrow}>
          PATIENT RECORD
        </div>
        <h1 className={styles.dnTitle}>Death Notification</h1>
        <div className={styles.dnSubtitle}>
          Generated from the completed death reporting form
        </div>
      </header>

      <section className={styles.dnSection}>
        <h2 className={styles.dnSectionTitle}>Patient details</h2>
        <table className={`${styles.dnTable} ${styles.dnPatientTable}`}>
          <tbody>
            <tr>
              <th>Patient name</th>
              <td>{person?.display ?? '—'}</td>
              <th>Gender</th>
              <td>{person?.gender ?? '—'}</td>
            </tr>
            <tr>
              <th>Date of birth</th>
              <td>{formatDate(person?.birthdate)}</td>
              <th>Age</th>
              <td>{person?.age ?? '—'}</td>
            </tr>
            {identifiers.map((identifier, index) => (
              <tr key={`${identifier.identifierType?.display ?? 'identifier'}-${identifier.identifier}-${index}`}>
                <th>{identifier.identifierType?.display ?? 'Identifier'}</th>
                <td colSpan={3}>{identifier.identifier}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section className={styles.dnSection}>
        <h2 className={styles.dnSectionTitle}>Death reporting details</h2>
        <table className={styles.dnTable}>
          <tbody>
            <tr>
              <th>Reported on</th>
              <td>{formatDate(encounter?.encounterDatetime)}</td>
              <th>Facility</th>
              <td>{encounter?.location?.display ?? '—'}</td>
            </tr>
            <tr>
              <th>Recorded by</th>
              <td colSpan={3}>{encounter?.provider?.person?.display ?? encounter?.provider?.display ?? '—'}</td>
            </tr>
          </tbody>
        </table>

        {observations.length > 0 ? (
          <table className={styles.dnTable}>
            <thead>
              <tr>
                <th>Form field</th>
                <th>Recorded information</th>
              </tr>
            </thead>
            <tbody>
              {observations.map((observation, index) => (
                <tr key={`${observation.concept?.display ?? 'field'}-${index}`}>
                  <td>{observation.concept?.display ?? observation.concept?.name?.name ?? 'Form field'}</td>
                  <td>{getObservationValue(observation)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p className={styles.dnEmptyMessage}>No additional form details were recorded.</p>
        )}
      </section>

      <footer className={styles.dnFooter}>
        <span className={styles.dnSystemGenerated}>System Generated</span>{' '}
        This document contains patient health information. Handle and share it in accordance with facility policy.
      </footer>
    </div>
  );
});

DeathNotification.displayName = 'DeathNotification';

export default DeathNotification;