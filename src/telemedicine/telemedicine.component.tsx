import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Button, InlineLoading } from '@carbon/react';
import { DocumentBlank, ErrorFilled, Renew } from '@carbon/react/icons';
import { usePatient, useSession } from '@openmrs/esm-framework';
import { useTranslation } from 'react-i18next';
import { fetchTelemedicineSession, getPractitionerNationalId } from './telemedicine.resource';
import styles from './telemedicine.scss';

/**
 * Telemedicine tab for the patient chart.
 *
 * Starts a video-consult session with the external telemedicine system and
 * renders it in an iframe — the biometrics modal's structure with none of its
 * device handshake: the SSO URL is minted backend-side (the broker route
 * resolves the external credentials from the session facility and calls the
 * partner SSO endpoint), and the URL it returns is self-contained, so the
 * iframe needs no postMessage and the app polls nothing.
 *
 * The SSO keys on the **practitioner's** national ID — the minted session is
 * the logged-in health worker's, and patient selection happens inside the
 * telemedicine app:
 *
 *   mount → (provider national ID lookup) → no-national-id
 *         → (SSO broker call)             → in-session | error
 *
 * The minted token is short-lived (Livia's is 600 s), so the header carries a
 * Reconnect action that mints a fresh session; an in-flight reconnect keeps the
 * current iframe mounted until the new URL arrives, so a live consult is never
 * blanked by a slow broker call.
 */

type Phase = 'connecting' | 'in-session' | 'error' | 'no-national-id';

const Telemedicine: React.FC = () => {
  const { t } = useTranslation();
  const { patient, isLoading: isPatientLoading } = usePatient();
  const session = useSession();

  const patientUuid = patient?.id ?? '';
  const locationUuid = session?.sessionLocation?.uuid ?? '';
  const providerUuid = session?.currentProvider?.uuid ?? '';

  const [phase, setPhase] = useState<Phase>('connecting');
  const [redirectUrl, setRedirectUrl] = useState('');
  const [expiresIn, setExpiresIn] = useState(0);
  const [sessionKey, setSessionKey] = useState(0);
  const [errorDetail, setErrorDetail] = useState('');
  // Set on unmount so an in-flight broker call never settles a dead tab's state.
  const cancelledRef = useRef(false);

  useEffect(
    () => () => {
      cancelledRef.current = true;
    },
    [],
  );

  const startSession = useCallback(async () => {
    if (!patientUuid || !locationUuid || !providerUuid) {
      return;
    }
    setPhase('connecting');
    setErrorDetail('');
    try {
      const nationalId = await getPractitionerNationalId(providerUuid);
      if (cancelledRef.current) {
        return;
      }
      if (!nationalId) {
        setPhase('no-national-id');
        return;
      }
      const sso = await fetchTelemedicineSession({ nationalId, locationUuid });
      if (cancelledRef.current) {
        return;
      }
      setRedirectUrl(sso?.redirect_url ?? '');
      setExpiresIn(sso?.expires_in ?? 0);
      // A new key forces a clean iframe per session rather than navigating the
      // old one — the external app's own state starts from scratch.
      setSessionKey((k) => k + 1);
      setPhase('in-session');
    } catch (err: any) {
      if (cancelledRef.current) {
        return;
      }
      setErrorDetail(err?.message ?? '');
      setPhase('error');
    }
  }, [patientUuid, locationUuid, providerUuid]);

  useEffect(() => {
    void startSession();
  }, [startSession]);

  const showIframe = (phase === 'in-session' || phase === 'connecting') && Boolean(redirectUrl);

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

  // The SSO mints the practitioner's session, so without a provider identity
  // there is nothing to authenticate as.
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

  return (
    <div className={styles.container}>
      {showIframe && (
        <div className={styles.header}>
          <div>
            <h3 className={styles.title}>{t('telemedicine', 'Telemedicine')}</h3>
            <p className={styles.provenance}>
              {expiresIn > 0
                ? t('telemedicineSessionExpires', 'Session link valid for {{minutes}} min', {
                    minutes: Math.round(expiresIn / 60),
                  })
                : t('telemedicineSessionActive', 'Session active')}
            </p>
          </div>
          <div className={styles.headerActions}>
            <Button
              kind="tertiary"
              size="sm"
              renderIcon={Renew}
              onClick={() => void startSession()}
              disabled={phase === 'connecting'}
            >
              {phase === 'connecting'
                ? t('telemedicineReconnecting', 'Reconnecting…')
                : t('telemedicineReconnect', 'Reconnect')}
            </Button>
          </div>
        </div>
      )}

      {showIframe && (
        <div className={styles.iframeWrap}>
          <iframe
            key={sessionKey}
            title={t('telemedicine', 'Telemedicine')}
            src={redirectUrl}
            className={styles.iframe}
          />
        </div>
      )}

      {phase === 'connecting' && !showIframe && (
        <div className={styles.statusView}>
          <InlineLoading description={t('telemedicineStarting', 'Starting telemedicine session…')} />
        </div>
      )}

      {phase === 'no-national-id' && (
        <StatusCard
          icon={<DocumentBlank size={32} className={styles.iconMuted} />}
          title={t('telemedicineNoNationalId', 'No national ID on your provider account')}
          text={t(
            'telemedicineNoNationalIdDetail',
            'A national ID must be recorded on your provider account before a telemedicine session can be started. Ask an administrator to add it.',
          )}
        />
      )}

      {phase === 'error' && (
        <StatusCard
          icon={<ErrorFilled size={32} className={styles.iconDanger} />}
          title={t('telemedicineStartFailed', "Couldn't start the telemedicine session")}
          text={
            errorDetail ||
            t(
              'telemedicineStartFailedDetail',
              'The telemedicine service may be unreachable from this facility. Try again.',
            )
          }
          actions={
            <Button kind="primary" size="md" onClick={() => void startSession()}>
              {t('retry', 'Retry')}
            </Button>
          }
        />
      )}
    </div>
  );
};

/** Shared centred layout for the connecting / no-ID / error states. */
const StatusCard: React.FC<{
  icon: React.ReactNode;
  title: string;
  text?: string;
  actions?: React.ReactNode;
}> = ({ icon, title, text, actions }) => (
  <div className={styles.statusView}>
    {icon}
    <h4 className={styles.statusTitle}>{title}</h4>
    {text && <p className={styles.statusText}>{text}</p>}
    {actions && <div className={styles.statusActions}>{actions}</div>}
  </div>
);

export default Telemedicine;
