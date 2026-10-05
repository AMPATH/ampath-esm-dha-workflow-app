import { openmrsFetch, restBaseUrl } from '@openmrs/esm-framework';
import { getHieBaseUrl } from '../shared/utils/get-base-url';
import { IdentifierTypesUuids } from '../resources/identifier-types';
import { normalizeError } from '../shr/shr.resource';

/**
 * Telemedicine data source — the Livia video-consult integration.
 *
 * The SSO URL is brokered, never minted in the browser: credentials for the
 * external system (Livia `POST /api/partner/sso/token`, which wants
 * `username`/`password` headers and a `facility_code`/`national_id` body) live
 * backend-side in the HIE middleware, resolved per session location — the same
 * shape as the biometrics flow (`/client/biometrics-authorize` mints the iframe
 * URL) and the Superset guest-token broker (`${etlBaseUrl}/superset-token`).
 * Browsers can neither hold those credentials nor rely on the gateway CSP
 * allowing `connect-src` to `api.liviaapp.net`.
 */

const TELEMEDICINE_SSO_PATH = '/telemedicine/sso/token';
const TELEMEDICINE_PATIENT_SSO_PATH = '/telemedicine/sso/patient-token';

/** Body for `POST {hieBaseUrl}/telemedicine/sso/token`. */
export interface TelemedicineSessionRequest {
  /**
   * The **practitioner's** national ID — the identity Livia's SSO keys on. The
   * session minted is the health worker's; patient selection happens inside the
   * telemedicine app, not in this request.
   */
  nationalId: string;
  /** Session facility — how the backend picks the Livia credentials/facility code. */
  locationUuid: string;
}

/**
 * Livia's SSO answer, passed through verbatim from the broker route (snake_case
 * like the other DHA passthrough endpoints). `expires_in` is seconds — 600 in
 * the documented flow — after which the `redirect_url` must be minted again.
 */
export interface TelemedicineSession {
  expires_in: number;
  redirect_url: string;
}

/**
 * The logged-in practitioner's national ID, read off their OpenMRS provider
 * attributes — attribute type `PROVIDER_NATIONAL_ID_UUID` ("National ID card"),
 * the same source the preauth flows read doctor IDs from. Returns an empty
 * string when the provider has none; the caller treats that as "cannot start a
 * telemedicine session" rather than sending an empty national_id.
 */
export async function getPractitionerNationalId(providerUuid: string): Promise<string> {
  if (!providerUuid) {
    return '';
  }
  try {
    const response = await openmrsFetch<{
      attributes?: Array<{ value?: string; voided?: boolean; attributeType?: { uuid?: string } }>;
    }>(
      `${restBaseUrl}/provider/${encodeURIComponent(providerUuid)}?v=custom:(uuid,display,attributes:(uuid,value,voided,attributeType:(uuid)))`,
      { method: 'GET' },
    );
    const hit = (response?.data?.attributes ?? []).find(
      (a) => !a.voided && a.attributeType?.uuid === IdentifierTypesUuids.PROVIDER_NATIONAL_ID_UUID && a.value,
    );
    return hit?.value ? String(hit.value).trim() : '';
  } catch (err) {
    throw normalizeError(err);
  }
}

/**
 * Ask the HIE middleware to mint a Livia SSO session for this practitioner at
 * this facility, and answer with the URL to iframe. The token inside the URL is
 * short-lived (`expires_in`, seconds) — callers must re-mint rather than cache.
 */
export async function fetchTelemedicineSession(payload: TelemedicineSessionRequest): Promise<TelemedicineSession> {
  try {
    const hieBaseUrl = await getHieBaseUrl();
    const response = await openmrsFetch<TelemedicineSession>(`${hieBaseUrl}${TELEMEDICINE_SSO_PATH}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: payload,
    });
    return response?.data;
  } catch (err) {
    throw normalizeError(err);
  }
}

/** Body for `POST {hieBaseUrl}/telemedicine/sso/patient-token`. */
export interface PatientTelemedicineSessionRequest {
  /** The consulting practitioner's national ID — the same identity the practitioner flow keys on. */
  doctorNationalId: string;
  /** The patient's national ID — identifies who the consult session is for. */
  patientNationalId: string;
  /** Session facility — how the backend picks the Livia credentials/facility code. */
  locationUuid: string;
  /**
   * The visit's claim consent token, when there is one — Livia ties the
   * patient's session to the consent they gave for this visit. Optional:
   * callers without a claim visit simply omit it.
   */
  consentToken?: string;
}

/**
 * Ask the HIE middleware to mint a patient-scoped Livia SSO session — the
 * patient-chart variant of {@link fetchTelemedicineSession}. Same answer
 * shape (`{expires_in, redirect_url}`), same short-lived token rules.
 */
export async function fetchPatientTelemedicineSession(
  payload: PatientTelemedicineSessionRequest,
): Promise<TelemedicineSession> {
  try {
    const hieBaseUrl = await getHieBaseUrl();
    const response = await openmrsFetch<TelemedicineSession>(`${hieBaseUrl}${TELEMEDICINE_PATIENT_SSO_PATH}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: payload,
    });
    return response?.data;
  } catch (err) {
    throw normalizeError(err);
  }
}
