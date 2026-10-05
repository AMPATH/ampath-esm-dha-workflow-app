/**
 * Rendering tests for the patient-chart telemedicine tab — the patient-scoped
 * sibling of the home dashboard. What differs from the home flow is the mint
 * input: the broker must receive the doctor's **and** the patient's national
 * IDs, plus the active visit's claim consent token when there is one (it is
 * optional — a visit without a claim consent still gets a session). These pin
 * down that parameter assembly and the two no-national-ID cards; the session
 * machine itself is covered by `telemedicine.component.test.tsx`.
 */
import React from 'react';
import { render, screen } from '@testing-library/react';

import TelemedicinePatientChart from './telemedicine-patient-chart.component';

const mockUsePatient = jest.fn();
const mockUseSession = jest.fn();
const mockUseVisit = jest.fn();
const mockGetNationalId = jest.fn();
const mockGetPatientNationalId = jest.fn();
const mockFetchSession = jest.fn();

jest.mock('@openmrs/esm-framework', () => ({
  usePatient: () => mockUsePatient(),
  useSession: () => mockUseSession(),
  useVisit: () => mockUseVisit(),
}));

jest.mock('./telemedicine.resource', () => ({
  getPractitionerNationalId: (...args: unknown[]) => mockGetNationalId(...args),
  fetchPatientTelemedicineSession: (...args: unknown[]) => mockFetchSession(...args),
}));

jest.mock('../shr/shr.resource', () => ({
  getPatientCrIdentifier: (...args: unknown[]) => mockGetPatientNationalId(...args),
}));

const PATIENT_UUID = '0b355dd8-de45-4142-a9c5-496b923e6be4';
const PROVIDER_UUID = 'e2bfaf3b-9bcb-4a20-9e9e-8db9dabc8f4e';
const LOCATION_UUID = '18c343eb-b353-462a-9139-b16606e6b6c2';
const NATIONAL_ID_TYPE = '58a47054-1359-11df-a1f1-0026b9348838';
const CONSENT_ATTRIBUTE = '4962a633-c4f8-474c-857c-5c68c72fbbe3';

beforeEach(() => {
  jest.resetAllMocks();
  mockUsePatient.mockReturnValue({ patient: { id: PATIENT_UUID }, isLoading: false });
  mockUseSession.mockReturnValue({
    sessionLocation: { uuid: LOCATION_UUID },
    currentProvider: { uuid: PROVIDER_UUID },
  });
  mockUseVisit.mockReturnValue({ activeVisit: undefined });
  mockGetNationalId.mockResolvedValue('10000000003');
  mockGetPatientNationalId.mockResolvedValue('87654321');
});

describe('Telemedicine patient-chart tab', () => {
  it('mints the session with both national IDs and the visit consent token', async () => {
    mockUseVisit.mockReturnValue({
      activeVisit: { attributes: [{ attributeType: { uuid: CONSENT_ATTRIBUTE }, value: 'abc123' }] },
    });
    mockFetchSession.mockResolvedValueOnce({
      expires_in: 600,
      redirect_url: 'https://md-uat.liviaapp.net/#/sso?token=p4713n7',
    });

    render(<TelemedicinePatientChart />);

    const iframe = await screen.findByTitle('Telemedicine');
    expect(iframe).toHaveAttribute('src', 'https://md-uat.liviaapp.net/#/sso?token=p4713n7');
    expect(iframe).toHaveAttribute('allow', 'camera; microphone; display-capture; fullscreen');
    expect(mockGetNationalId).toHaveBeenCalledWith(PROVIDER_UUID);
    expect(mockGetPatientNationalId).toHaveBeenCalledWith(PATIENT_UUID, NATIONAL_ID_TYPE);
    expect(mockFetchSession).toHaveBeenCalledWith({
      doctorNationalId: '10000000003',
      patientNationalId: '87654321',
      locationUuid: LOCATION_UUID,
      consentToken: 'abc123',
    });
  });

  it('still mints a session when the visit has no consent token', async () => {
    mockFetchSession.mockResolvedValueOnce({
      expires_in: 600,
      redirect_url: 'https://md-uat.liviaapp.net/#/sso?token=p4713n7',
    });

    render(<TelemedicinePatientChart />);

    await screen.findByTitle('Telemedicine');
    expect(mockFetchSession).toHaveBeenCalledWith({
      doctorNationalId: '10000000003',
      patientNationalId: '87654321',
      locationUuid: LOCATION_UUID,
      consentToken: undefined,
    });
  });

  it('says so when the patient has no national ID', async () => {
    mockGetPatientNationalId.mockResolvedValueOnce('');

    render(<TelemedicinePatientChart />);

    expect(await screen.findByText('No national ID on the patient’s record')).toBeInTheDocument();
    expect(mockFetchSession).not.toHaveBeenCalled();
  });

  it('says so when the provider account has no national ID', async () => {
    mockGetNationalId.mockResolvedValueOnce('');

    render(<TelemedicinePatientChart />);

    expect(await screen.findByText('No national ID on your provider account')).toBeInTheDocument();
    expect(mockFetchSession).not.toHaveBeenCalled();
  });

  it('says so when no patient is in context', () => {
    mockUsePatient.mockReturnValue({ patient: undefined, isLoading: false });

    render(<TelemedicinePatientChart />);

    expect(screen.getByText('No patient selected')).toBeInTheDocument();
    expect(mockFetchSession).not.toHaveBeenCalled();
  });
});
