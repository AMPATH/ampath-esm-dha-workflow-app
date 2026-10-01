/**
 * Rendering tests for the telemedicine tab's state machine: the missing-provider
 * and missing-national-ID cards, the error card carrying the broker's message,
 * and the in-session iframe fed by the minted SSO URL. The SSO keys on the
 * practitioner's national ID, so the lookup goes to the session's provider, not
 * the patient. The broker call itself is covered in
 * `telemedicine.resource.test.ts`.
 */
import React from 'react';
import { render, screen } from '@testing-library/react';

import Telemedicine from './telemedicine.component';

const mockUsePatient = jest.fn();
const mockUseSession = jest.fn();
const mockGetNationalId = jest.fn();
const mockFetchSession = jest.fn();

jest.mock('@openmrs/esm-framework', () => ({
  usePatient: () => mockUsePatient(),
  useSession: () => mockUseSession(),
}));

jest.mock('./telemedicine.resource', () => ({
  getPractitionerNationalId: (...args: unknown[]) => mockGetNationalId(...args),
  fetchTelemedicineSession: (...args: unknown[]) => mockFetchSession(...args),
}));

const PATIENT_UUID = '0b355dd8-de45-4142-a9c5-496b923e6be4';
const PROVIDER_UUID = 'e2bfaf3b-9bcb-4a20-9e9e-8db9dabc8f4e';
const LOCATION_UUID = '18c343eb-b353-462a-9139-b16606e6b6c2';

beforeEach(() => {
  jest.resetAllMocks();
  mockUsePatient.mockReturnValue({ patient: { id: PATIENT_UUID }, isLoading: false });
  mockUseSession.mockReturnValue({
    sessionLocation: { uuid: LOCATION_UUID },
    currentProvider: { uuid: PROVIDER_UUID },
  });
});

describe('Telemedicine tab', () => {
  it('renders the consult iframe from the minted SSO URL, with a reconnect action', async () => {
    mockGetNationalId.mockResolvedValueOnce('10000000003');
    mockFetchSession.mockResolvedValueOnce({
      expires_in: 600,
      redirect_url: 'https://md-uat.liviaapp.net/#/sso?token=t0k3n',
    });

    render(<Telemedicine />);

    const iframe = await screen.findByTitle('Telemedicine');
    expect(iframe).toHaveAttribute('src', 'https://md-uat.liviaapp.net/#/sso?token=t0k3n');
    expect(screen.getByRole('button', { name: 'Reconnect' })).toBeInTheDocument();
    // The broker got the practitioner's national ID and the facility — the
    // session is the health worker's, scoped to where they logged in.
    expect(mockGetNationalId).toHaveBeenCalledWith(PROVIDER_UUID);
    expect(mockFetchSession).toHaveBeenCalledWith({ nationalId: '10000000003', locationUuid: LOCATION_UUID });
  });

  it('says so when the provider account has no national ID', async () => {
    mockGetNationalId.mockResolvedValueOnce('');

    render(<Telemedicine />);

    expect(await screen.findByText('No national ID on your provider account')).toBeInTheDocument();
    expect(mockFetchSession).not.toHaveBeenCalled();
  });

  it('says so when the session has no provider attached', () => {
    mockUseSession.mockReturnValue({ sessionLocation: { uuid: LOCATION_UUID }, currentProvider: undefined });

    render(<Telemedicine />);

    expect(screen.getByText("Couldn't identify the logged-in provider")).toBeInTheDocument();
    expect(mockGetNationalId).not.toHaveBeenCalled();
  });

  it('shows the broker failure with its message and a retry', async () => {
    mockGetNationalId.mockResolvedValueOnce('10000000003');
    mockFetchSession.mockRejectedValueOnce(new Error('No telemedicine facility is configured for this location.'));

    render(<Telemedicine />);

    expect(await screen.findByText('No telemedicine facility is configured for this location.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Retry' })).toBeInTheDocument();
  });

  it('refuses to start without a login location', () => {
    mockUseSession.mockReturnValue({
      sessionLocation: undefined,
      currentProvider: { uuid: PROVIDER_UUID },
    });

    render(<Telemedicine />);

    expect(screen.getByText('No login location selected')).toBeInTheDocument();
    expect(mockGetNationalId).not.toHaveBeenCalled();
  });
});
