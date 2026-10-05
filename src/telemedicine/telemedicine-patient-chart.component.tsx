import React, { useCallback, useMemo } from 'react';
import { InlineLoading } from '@carbon/react';
import { DocumentBlank } from '@carbon/react/icons';
import { usePatient, useSession, useVisit } from '@openmrs/esm-framework';
import { useTranslation } from 'react-i18next';
import { IdentifierTypesUuids } from '../resources/identifier-types';
import { getPatientCrIdentifier } from '../shr/shr.resource';
import {
  fetchPatientTelemedicineSession,
  getPractitionerNationalId,
} from './telemedicine.resource';
import {
  StatusCard,
  TelemedicineView,
  useTelemedicineSession,
  type TelemedicineStartResult,
} from './telemedicine.component';
import styles from './telemedicine.scss';

/** The visit attribute the claims flow stamps the consent token on. */
const CLAIM_CONSENT_TOKEN_ATTRIBUTE_UUID = '4962a633-c4f8-474c-857c-5c68c72fbbe3';

/**
 * Telemedicine tab for the patient chart.
 *
 * The patient-scoped sibling of the home-page dashboard: the minted session is
 * for this consult — Livia keys it on the doctor's and the patient's national
 * IDs — and the visit's claim consent token rides along when there is one
 * (optional; a visit without a claim consent still gets a session). Everything
 * else — the brokered SSO, the iframe, the reconnect flow — is the shared
 * machine in `telemedicine.component.tsx`.
 */
const TelemedicinePatientChart: React.FC = () => {
  const { t } = useTranslation();
  const { patient, isLoading: isPatientLoading } = usePatient();
  const session = useSession();

  const patientUuid = patient?.id ?? '';
  const locationUuid = session?.sessionLocation?.uuid ?? '';
  const providerUuid = session?.currentProvider?.uuid ?? '';
  const { activeVisit } = useVisit(patientUuid);

  const consentToken = useMemo(
    () =>
      activeVisit?.attributes?.find((a) => a?.attributeType?.uuid === CLAIM_CONSENT_TOKEN_ATTRIBUTE_UUID)?.value ??
      '',
    [activeVisit],
  );

  const start = useCallback(async (): Promise<TelemedicineStartResult> => {
    const [doctorNationalId, patientNationalId] = await Promise.all([
      getPractitionerNationalId(providerUuid),
      getPatientCrIdentifier(patientUuid, IdentifierTypesUuids.NATIONAL_ID_UUID),
    ]);
    if (!doctorNationalId) {
      return { phase: 'no-national-id', scope: 'provider' };
    }
    if (!patientNationalId) {
      return { phase: 'no-national-id', scope: 'patient' };
    }
    const sso = await fetchPatientTelemedicineSession({
      doctorNationalId,
      patientNationalId,
      locationUuid,
      // undefined drops out of the JSON body — the token is optional.
      consentToken: consentToken || undefined,
    });
    return { phase: 'in-session', redirectUrl: sso?.redirect_url ?? '', expiresIn: sso?.expires_in ?? 0 };
  }, [patientUuid, locationUuid, providerUuid, consentToken]);

  const telemedicine = useTelemedicineSession(
    start,
    Boolean(patientUuid && locationUuid && providerUuid),
  );

  if (isPatientLoading && !patientUuid) {
    return (
      <div className={styles.container}>
        <div className={styles.statusView}>
          <InlineLoading description={t('loadingPatient', 'Loading patient…')} />
        </div>
      </div>
    );
  }

  if (!patientUuid) {
    return (
      <div className={styles.container}>
        <StatusCard
          icon={<DocumentBlank size={32} className={styles.iconMuted} />}
          title={t('noPatientSelected', 'No patient selected')}
          text={t('telemedicineNeedsPatient', 'Open a patient chart to start a telemedicine session.')}
        />
      </div>
    );
  }

  if (!locationUuid) {
    return (
      <div className={styles.container}>
        <StatusCard
          icon={<DocumentBlank size={32} className={styles.iconMuted} />}
          title={t('noLoginLocation', 'No login location selected')}
          text={t(
            'telemedicineNeedsLocation',
            'A telemedicine session must be scoped to a facility. Log in with a facility location and try again.',
          )}
        />
      </div>
    );
  }

  if (!providerUuid) {
    return (
      <div className={styles.container}>
        <StatusCard
          icon={<DocumentBlank size={32} className={styles.iconMuted} />}
          title={t('telemedicineNoProvider', "Couldn't identify the logged-in provider")}
          text={t(
            'telemedicineNoProviderDetail',
            'Your session has no provider attached, so a telemedicine session cannot be started. Log in with a provider account.',
          )}
        />
      </div>
    );
  }

  return <TelemedicineView session={telemedicine} />;
};

export default TelemedicinePatientChart;
