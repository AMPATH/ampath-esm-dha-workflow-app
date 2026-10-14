import { showSnackbar } from '@openmrs/esm-framework';
import type { TFunction } from 'i18next';
import { submitClosedVisitToShr } from './shr.resource';
import type { ShrVisitSubmissionRequest, ShrVisitSubmissionResponse } from './shr.types';

/**
 * Push the patient's latest closed AMRS visit to the national Shared Health
 * Record and report the outcome as a snackbar — the one piece of UX both
 * triggers of `POST /shr/visit-submission` share (claim submission rides along
 * after the visit ends; the SHR dashboard's "Send visit to SHR" button drives
 * its spinner off the returned promise).
 *
 * The submission family is left to `auto` (the visit type decides) and no
 * consent token is sent — the backend resolves one from the recorded consent
 * session, and the tokens this app holds for SHA *claims* are not SHR consent
 * tokens. `skipped` (the patient has no closed visit) is a normal outcome, not
 * a failure, and says so.
 *
 * Never rejects: failures come back as `null` beside the error snackbar, so a
 * fire-and-forget caller can't turn an SHR outage into an unhandled rejection
 * after the action it rode along on already succeeded.
 */
export function syncVisitToShr(
  request: ShrVisitSubmissionRequest,
  t: TFunction,
): Promise<ShrVisitSubmissionResponse | null> {
  if (!request.patientUuid || !request.locationUuid) {
    return Promise.resolve(null);
  }
  return submitClosedVisitToShr(request)
    .then((response) => {
      if (response?.status === 'submitted') {
        showSnackbar({
          kind: 'success',
          title: t('shrVisitDataSubmitted', 'Visit data sent to the shared health record'),
          subtitle: response.message || t('shrVisitDataSubmittedDetail', 'The closed visit is now in the SHR.'),
        });
      } else if (response?.status === 'skipped') {
        showSnackbar({
          kind: 'info',
          title: t('shrVisitSyncSkipped', 'No closed visit to send'),
          subtitle: response.message || t('shrVisitSyncSkippedDetail', 'There was no closed visit to submit.'),
        });
      } else {
        // `validated` — a dry run built the bundle without submitting it.
        showSnackbar({
          kind: 'info',
          title: t('shrVisitSyncValidated', 'Visit bundle built — nothing was submitted'),
          subtitle: response?.message ?? '',
        });
      }
      return response;
    })
    .catch((err: any) => {
      showSnackbar({
        kind: 'error',
        title: t('shrVisitSyncFailed', "Couldn't send the visit data to the shared health record"),
        subtitle: err?.message ?? t('shrVisitSyncFailedDetail', 'Try again, or contact support.'),
      });
      return null;
    });
}
