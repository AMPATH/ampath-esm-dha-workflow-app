/**
 * Tests for the shared visit-sync UX helper: that the endpoint call carries the
 * request verbatim, that each backend outcome lands as the right kind of
 * snackbar, and that neither a missing patient/location nor a failed call can
 * reject — the claim-submission caller fires this after the visit has already
 * been closed and must not inherit an unhandled rejection from it.
 */
const mockShowSnackbar = jest.fn();
const mockSubmit = jest.fn();

jest.mock('@openmrs/esm-framework', () => ({
  showSnackbar: (...args: unknown[]) => mockShowSnackbar(...args),
}));

jest.mock('./shr.resource', () => ({
  submitClosedVisitToShr: (...args: unknown[]) => mockSubmit(...args),
}));

import { syncVisitToShr } from './shr-visit-sync';

const t = (key: string, fallback?: string) => fallback ?? key;

beforeEach(() => {
  jest.resetAllMocks();
});

describe('syncVisitToShr', () => {
  it('passes the request verbatim to the endpoint and reports a submission as success', async () => {
    mockSubmit.mockResolvedValueOnce({
      status: 'submitted',
      patientUuid: 'patient-1',
      visitUuid: 'visit-1',
      entries: 11,
      message: 'Closed visit submitted to the SHR.',
    });

    const result = await syncVisitToShr({ patientUuid: 'patient-1', locationUuid: 'location-1' }, t);

    expect(mockSubmit).toHaveBeenCalledWith({ patientUuid: 'patient-1', locationUuid: 'location-1' });
    expect(result?.status).toBe('submitted');
    expect(mockShowSnackbar).toHaveBeenCalledWith(
      expect.objectContaining({
        kind: 'success',
        subtitle: 'Closed visit submitted to the SHR.',
      }),
    );
  });

  it('reports a skipped outcome as information, not an error', async () => {
    mockSubmit.mockResolvedValueOnce({
      status: 'skipped',
      patientUuid: 'patient-1',
      message: 'No closed visit found for this patient — nothing to submit.',
    });

    const result = await syncVisitToShr({ patientUuid: 'patient-1', locationUuid: 'location-1' }, t);

    expect(result?.status).toBe('skipped');
    expect(mockShowSnackbar).toHaveBeenCalledWith(
      expect.objectContaining({
        kind: 'info',
        subtitle: 'No closed visit found for this patient — nothing to submit.',
      }),
    );
    expect(mockShowSnackbar).not.toHaveBeenCalledWith(expect.objectContaining({ kind: 'error' }));
  });

  it('comes back as null (beside an error snackbar) when the endpoint fails', async () => {
    mockSubmit.mockRejectedValueOnce(new Error('The bundle did not pass SHA pre-submission validation.'));

    const result = await syncVisitToShr({ patientUuid: 'patient-1', locationUuid: 'location-1' }, t);

    expect(result).toBeNull();
    expect(mockShowSnackbar).toHaveBeenCalledWith(
      expect.objectContaining({
        kind: 'error',
        subtitle: 'The bundle did not pass SHA pre-submission validation.',
      }),
    );
  });

  it('does not call the endpoint — and resolves, not rejects — without a patient or location', async () => {
    await expect(syncVisitToShr({ patientUuid: '', locationUuid: 'location-1' }, t)).resolves.toBeNull();
    await expect(syncVisitToShr({ patientUuid: 'patient-1', locationUuid: '' }, t)).resolves.toBeNull();
    expect(mockSubmit).not.toHaveBeenCalled();
    expect(mockShowSnackbar).not.toHaveBeenCalled();
  });
});
