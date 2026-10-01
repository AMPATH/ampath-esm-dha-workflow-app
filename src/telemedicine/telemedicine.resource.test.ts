/**
 * Tests for the telemedicine resource layer: the practitioner national-ID
 * lookup and the SSO broker call. The broker endpoint
 * (`POST {hieBaseUrl}/telemedicine/sso/token`) is the contract with the HIE
 * middleware — credentials and facility resolution live backend-side, and the
 * `national_id` Livia keys on is the **practitioner's** (the minted session is
 * the health worker's), so all the frontend can get wrong is the lookup source,
 * the payload and the error normalization, which is exactly what these pin
 * down.
 *
 * `../shared/utils/get-base-url` and `@openmrs/esm-framework` are mocked
 * directly, following `shr.resource.test.ts`, to avoid the heavy OpenMRS module
 * graph; `normalizeError` is borrowed from the SHR resource, so its mapping of
 * `openmrsFetch` failures carries over.
 */
jest.mock('../shared/utils/get-base-url', () => ({
  getHieBaseUrl: jest.fn(),
}));

jest.mock('@openmrs/esm-framework', () => ({
  openmrsFetch: jest.fn(),
  restBaseUrl: '/ws/rest/v1',
}));

import { openmrsFetch } from '@openmrs/esm-framework';
import { getHieBaseUrl } from '../shared/utils/get-base-url';
import { fetchTelemedicineSession, getPractitionerNationalId } from './telemedicine.resource';

const mockOpenmrsFetch = jest.mocked(openmrsFetch);
const mockGetHieBaseUrl = jest.mocked(getHieBaseUrl);

const BASE_URL = 'http://localhost:3000';
const PROVIDER_UUID = 'e2bfaf3b-9bcb-4a20-9e9e-8db9dabc8f4e';
const LOCATION_UUID = '18c343eb-b353-462a-9139-b16606e6b6c2';

beforeEach(() => {
  jest.resetAllMocks();
  mockGetHieBaseUrl.mockResolvedValue(BASE_URL);
});

describe('getPractitionerNationalId', () => {
  it('reads the national ID off the provider attributes', async () => {
    mockOpenmrsFetch.mockResolvedValueOnce({
      data: {
        uuid: PROVIDER_UUID,
        display: 'Jane Doe',
        attributes: [
          { uuid: 'attr-1', value: 'something-else', voided: false, attributeType: { uuid: 'other-type' } },
          {
            uuid: 'attr-2',
            value: '10000000003',
            voided: false,
            attributeType: { uuid: '4550df92-c684-4597-8ab8-d6b10eabdcfb' },
          },
        ],
      },
    } as any);

    await expect(getPractitionerNationalId(PROVIDER_UUID)).resolves.toBe('10000000003');
    expect(mockOpenmrsFetch).toHaveBeenCalledWith(
      `/ws/rest/v1/provider/${PROVIDER_UUID}?v=custom:(uuid,display,attributes:(uuid,value,voided,attributeType:(uuid)))`,
      { method: 'GET' },
    );
  });

  it('ignores voided national-ID attributes and returns an empty string when none survive', async () => {
    mockOpenmrsFetch.mockResolvedValueOnce({
      data: {
        uuid: PROVIDER_UUID,
        attributes: [
          {
            uuid: 'attr-2',
            value: '10000000003',
            voided: true,
            attributeType: { uuid: '4550df92-c684-4597-8ab8-d6b10eabdcfb' },
          },
        ],
      },
    } as any);

    await expect(getPractitionerNationalId(PROVIDER_UUID)).resolves.toBe('');
  });

  it('short-circuits to an empty string without a provider uuid', async () => {
    await expect(getPractitionerNationalId('')).resolves.toBe('');
    expect(mockOpenmrsFetch).not.toHaveBeenCalled();
  });
});

describe('fetchTelemedicineSession', () => {
  it('POSTs the practitioner national ID and location to the broker path and returns the SSO payload', async () => {
    mockOpenmrsFetch.mockResolvedValueOnce({
      data: { expires_in: 600, redirect_url: 'https://md-uat.liviaapp.net/#/sso?token=t0k3n' },
    } as any);

    const session = await fetchTelemedicineSession({
      nationalId: '10000000003',
      locationUuid: LOCATION_UUID,
    });

    expect(mockOpenmrsFetch).toHaveBeenCalledWith(`${BASE_URL}/telemedicine/sso/token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: { nationalId: '10000000003', locationUuid: LOCATION_UUID },
    });
    expect(session.redirect_url).toBe('https://md-uat.liviaapp.net/#/sso?token=t0k3n');
    expect(session.expires_in).toBe(600);
  });

  it('throws the normalized backend error message when the broker fails', async () => {
    mockOpenmrsFetch.mockRejectedValueOnce({
      response: { status: 502 },
      message: 'Http failure',
      responseBody: { message: 'No telemedicine facility is configured for this location.' },
    });

    await expect(
      fetchTelemedicineSession({ nationalId: '10000000003', locationUuid: LOCATION_UUID }),
    ).rejects.toMatchObject({
      status: 502,
      message: 'No telemedicine facility is configured for this location.',
    });
  });
});
