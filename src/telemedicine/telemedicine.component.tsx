import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Button, InlineLoading } from '@carbon/react';
import { DocumentBlank, ErrorFilled, Renew } from '@carbon/react/icons';
import { useSession } from '@openmrs/esm-framework';
import { useTranslation } from 'react-i18next';
import { fetchTelemedicineSession, getPractitionerNationalId } from './telemedicine.resource';
import styles from './telemedicine.scss';

/**
 * Telemedicine session machine and chrome, shared by both telemedicine entry
 * points:
 *
 *   - the home-page dashboard (`Telemedicine` below) mints a session for the
 *     logged-in practitioner and leaves patient selection to the telemedicine
 *     app;
 *   - the patient-chart tab (`telemedicine-patient-chart.component.tsx`) mints
 *     a patient-scoped session, passing the doctor's and the patient's
 *     national IDs plus the visit's consent token when there is one.
 *
 * Both render the partner system in an iframe — the biometrics modal's
 * structure with none of its device handshake: the SSO URL is minted
 * backend-side (the broker route resolves the external credentials from the
 * session facility and calls the partner SSO endpoint), and the URL it returns
 * is self-contained, so the iframe needs no postMessage and the app polls
 * nothing.
 *
 *   mount → (national ID lookups)          → no-national-id
 *         → (SSO broker call)              → in-session | error
 *
 * The minted token is short-lived (Livia's is 600 s), so the header carries a
 * Reconnect action that mints a fresh session; an in-flight reconnect keeps the
 * current iframe mounted until the new URL arrives, so a live consult is never
 * blanked by a slow broker call.
 */

type Phase = 'connecting' | 'in-session' | 'error' | 'no-national-id';

/** Whose national ID was missing, when that is why no session could be minted. */
type NoNationalIdScope = 'provider' | 'patient';

/**
 * What a starter resolves with: a minted session, or the national ID that
 * blocked minting one. The hook owns every other transition.
 */
export type TelemedicineStartResult =
  | { phase: 'in-session'; redirectUrl: string; expiresIn: number }
  | { phase: 'no-national-id'; scope: NoNationalIdScope };

export interface TelemedicineSessionState {
  phase: Phase;
  redirectUrl: string;
  expiresIn: number;
  /** Bumped per minted session so the iframe remounts clean rather than navigating. */
  sessionKey: number;
  noNationalIdScope: NoNationalIdScope;
  errorDetail: string;
  /** Remints the session — the Reconnect / Retry action. */
  reconnect: () => void;
}

/**
 * The session state machine. `start` mints a session (and must be memoized by
 * the caller — the effect re-mints whenever its identity changes, which is also
 * how a changed facility or patient restarts the flow). `enabled` gates the
 * first mint so wrappers whose guards (no patient, no location, …) render a
 * status card never fire the broker call behind them.
 */
export function useTelemedicineSession(
  start: () => Promise<TelemedicineStartResult>,
  enabled: boolean = true,
): TelemedicineSessionState {
  const { t } = useTranslation();
  const [phase, setPhase] = useState<Phase>('connecting');
  const [redirectUrl, setRedirectUrl] = useState('');
  const [expiresIn, setExpiresIn] = useState(0);
  const [sessionKey, setSessionKey] = useState(0);
  const [noNationalIdScope, setNoNationalIdScope] = useState<NoNationalIdScope>('provider');
  const [errorDetail, setErrorDetail] = useState('');
  // Set on unmount so an in-flight broker call never settles a dead tab's state.
  const cancelledRef = useRef(false);

  useEffect(
    () => () => {
      cancelledRef.current = true;
    },
    [],
  );

  const run = useCallback(async () => {
    if (!enabled) {
      return;
    }
    setPhase('connecting');
    setErrorDetail('');
    try {
      const result = await start();
      if (cancelledRef.current) {
        return;
      }
      if (result.phase === 'no-national-id') {
        setNoNationalIdScope(result.scope);
        setPhase('no-national-id');
        return;
      }
      // openmrsFetch swallows a 2xx body it cannot JSON-parse, so a gateway's
      // HTML fallback page (e.g. a request that never reached the broker)
      // resolves with no data — fail loudly instead of showing an empty
      // in-session tab.
      if (!result.redirectUrl) {
        setErrorDetail(t('telemedicineNoSessionUrl', 'The telemedicine service did not return a session link.'));
        setPhase('error');
        return;
      }
      setRedirectUrl(result.redirectUrl);
      setExpiresIn(result.expiresIn);
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
  }, [start, enabled, t]);

  useEffect(() => {
    void run();
  }, [run]);

  return { phase, redirectUrl, expiresIn, sessionKey, noNationalIdScope, errorDetail, reconnect: run };
}

/** The session chrome: header, iframe, and the centred status cards. */
export const TelemedicineView: React.FC<{ session: TelemedicineSessionState }> = ({ session }) => {
  const { t } = useTranslation();
  const showIframe = (session.phase === 'in-session' || session.phase === 'connecting') && Boolean(session.redirectUrl);

  return (
    <div className={styles.container}>
      {showIframe && (
        <div className={styles.header}>
          <div>
            <h3 className={styles.title}>{t('telemedicine', 'Telemedicine')}</h3>
            <p className={styles.provenance}>
              {session.expiresIn > 0
                ? t('telemedicineSessionExpires', 'Session link valid for {{minutes}} min', {
                    minutes: Math.round(session.expiresIn / 60),
                  })
                : t('telemedicineSessionActive', 'Session active')}
            </p>
          </div>
          <div className={styles.headerActions}>
            <Button
              kind="tertiary"
              size="sm"
              renderIcon={Renew}
              onClick={() => void session.reconnect()}
              disabled={session.phase === 'connecting'}
            >
              {session.phase === 'connecting'
                ? t('telemedicineReconnecting', 'Reconnecting…')
                : t('telemedicineReconnect', 'Reconnect')}
            </Button>
          </div>
        </div>
      )}

      {showIframe && (
        <div className={styles.iframeWrap}>
          <iframe
            key={session.sessionKey}
            title={t('telemedicine', 'Telemedicine')}
            src={session.redirectUrl}
            className={styles.iframe}
            // Without `allow` the browser silently denies camera/mic to the
            // framed app — a video consult that can neither see nor hear.
            allow="camera; microphone; display-capture; fullscreen"
            allowFullScreen
            referrerPolicy="strict-origin"
          />
        </div>
      )}

      {session.phase === 'connecting' && !showIframe && (
        <div className={styles.statusView}>
          <InlineLoading description={t('telemedicineStarting', 'Starting telemedicine session…')} />
        </div>
      )}

      {session.phase === 'no-national-id' && (
        <StatusCard
          icon={<DocumentBlank size={32} className={styles.iconMuted} />}
          title={
            session.noNationalIdScope === 'patient'
              ? t('telemedicinePatientNoNationalId', 'No national ID on the patient’s record')
              : t('telemedicineNoNationalId', 'No national ID on your provider account')
          }
          text={
            session.noNationalIdScope === 'patient'
              ? t(
                  'telemedicinePatientNoNationalIdDetail',
                  'This patient has no national ID recorded, so a patient telemedicine session cannot be started. Capture their national ID first.',
                )
              : t(
                  'telemedicineNoNationalIdDetail',
                  'A national ID must be recorded on your provider account before a telemedicine session can be started. Ask an administrator to add it.',
                )
          }
        />
      )}

      {session.phase === 'error' && (
        <StatusCard
          icon={<ErrorFilled size={32} className={styles.iconDanger} />}
          title={t('telemedicineStartFailed', "Couldn't start the telemedicine session")}
          text={
            session.errorDetail ||
            t(
              'telemedicineStartFailedDetail',
              'The telemedicine service may be unreachable from this facility. Try again.',
            )
          }
          actions={
            <Button kind="primary" size="md" onClick={() => void session.reconnect()}>
              {t('retry', 'Retry')}
            </Button>
          }
        />
      )}
    </div>
  );
};

/** Shared centred layout for the connecting / no-ID / error states. */
export const StatusCard: React.FC<{
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

/**
 * The home-page dashboard: mints the logged-in practitioner's session — the
 * SSO keys on their national ID, and patient selection happens inside the
 * telemedicine app.
 */
const Telemedicine: React.FC = () => {
  const { t } = useTranslation();
  const session = useSession();

  const locationUuid = session?.sessionLocation?.uuid ?? '';
  const providerUuid = session?.currentProvider?.uuid ?? '';

  const start = useCallback(async (): Promise<TelemedicineStartResult> => {
    const nationalId = await getPractitionerNationalId(providerUuid);
    if (!nationalId) {
      return { phase: 'no-national-id', scope: 'provider' };
    }
    const sso = await fetchTelemedicineSession({ nationalId, locationUuid });
    return { phase: 'in-session', redirectUrl: sso?.redirect_url ?? '', expiresIn: sso?.expires_in ?? 0 };
  }, [locationUuid, providerUuid]);

  const telemedicine = useTelemedicineSession(start, Boolean(locationUuid && providerUuid));

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

  return <TelemedicineView session={telemedicine} />;
};

export default Telemedicine;
