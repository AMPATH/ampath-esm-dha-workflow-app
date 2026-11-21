import React from 'react';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { openmrsFetch, usePatient } from '@openmrs/esm-framework';
import { InvoicePreview, ReceiptPreview } from './bill-document-preview.component';
import { type MappedBill } from '../../types';

jest.mock('@openmrs/esm-framework', () => ({
  restBaseUrl: '/ws/rest/v1',
  openmrsFetch: jest.fn(),
  showSnackbar: jest.fn(),
  usePatient: jest.fn(),
}));
jest.mock('../../finalize-bill.resource', () => ({ useDefaultFacility: () => ({ data: null }) }));
jest.mock('./printable-invoice.component', () => ({
  __esModule: true,
  default: ({ componentRef }) => <div ref={componentRef}>Invoice contents</div>,
}));
jest.mock('html2pdf.js', () => ({ __esModule: true, default: () => mockPdfWorker }));

const mockPdfWorker = { set: jest.fn().mockReturnThis(), from: jest.fn().mockReturnThis(), outputPdf: jest.fn() };
const mockPatient = usePatient as jest.Mock;
const mockFetch = openmrsFetch as jest.Mock;
const bill = { uuid: 'bill-1', patientUuid: 'patient-1', receiptNumber: '123' } as MappedBill;

global.ResizeObserver = class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
};

describe('bill document previews', () => {
  beforeEach(() => {
    mockPatient.mockReturnValue({ patient: { id: 'patient-1' }, isLoading: false });
    mockPdfWorker.outputPdf.mockReset();
    mockPdfWorker.outputPdf.mockResolvedValue(new Blob(['invoice'], { type: 'application/pdf' }));
    mockPdfWorker.set.mockClear();
    mockPdfWorker.from.mockClear();
    URL.createObjectURL = jest.fn().mockReturnValue('blob:invoice');
    URL.revokeObjectURL = jest.fn();
  });

  it('opens the generated invoice PDF in the viewer without an extra download button', async () => {
    const user = userEvent.setup();
    const onClose = jest.fn();
    const { unmount } = render(<InvoicePreview bill={bill} onClose={onClose} />);
    const dialog = screen.getByRole('dialog');
    expect(dialog.closest('.documentModal')?.parentElement).toBe(document.body);
    await waitFor(() => expect(within(dialog).getByTitle('Invoice preview')).toHaveAttribute('src', 'blob:invoice'));
    expect(mockPdfWorker.outputPdf).toHaveBeenCalledWith('blob');
    expect(within(dialog).getByText(/use the PDF viewer toolbar/i)).toBeInTheDocument();
    expect(within(dialog).queryByRole('button', { name: 'Download invoice' })).not.toBeInTheDocument();
    await user.click(within(dialog).getByRole('button', { name: 'Close' }));
    expect(onClose).toHaveBeenCalled();
    expect(mockPdfWorker.set).toHaveBeenCalledWith(expect.objectContaining({ filename: 'invoice_bill-1.pdf' }));
    unmount();
    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:invoice');
  });

  it('shows an error when invoice PDF generation fails', async () => {
    mockPdfWorker.outputPdf.mockRejectedValue(new Error('Generation failed'));
    render(<InvoicePreview bill={bill} onClose={jest.fn()} />);
    expect(await screen.findByRole('alert')).toHaveTextContent('Could not load the invoice');
    expect(screen.queryByRole('button', { name: 'Download invoice' })).not.toBeInTheDocument();
  });

  it('does not create an object URL when generation finishes after closing', async () => {
    let finishGeneration: (blob: Blob) => void;
    mockPdfWorker.outputPdf.mockReturnValue(new Promise<Blob>((resolve) => (finishGeneration = resolve)));
    const { unmount } = render(<InvoicePreview bill={bill} onClose={jest.fn()} />);
    await waitFor(() => expect(mockPdfWorker.outputPdf).toHaveBeenCalled());
    unmount();
    finishGeneration(new Blob(['invoice'], { type: 'application/pdf' }));
    await Promise.resolve();
    expect(URL.createObjectURL).not.toHaveBeenCalled();
  });

  it('loads the receipt PDF and releases its preview URL', async () => {
    const user = userEvent.setup();
    mockFetch.mockResolvedValue({
      headers: { get: () => 'application/pdf' },
      blob: async () => new Blob(['receipt'], { type: 'application/pdf' }),
    });
    URL.createObjectURL = jest.fn().mockReturnValue('blob:receipt');
    URL.revokeObjectURL = jest.fn();
    const onClose = jest.fn();
    const { unmount } = render(<ReceiptPreview billUuid="bill-1" onClose={onClose} />);
    const dialog = screen.getByRole('dialog');
    expect(dialog.closest('.documentModal')?.parentElement).toBe(document.body);
    await waitFor(() => expect(within(dialog).getByTitle('Receipt preview')).toHaveAttribute('src', 'blob:receipt'));
    expect(mockFetch).toHaveBeenCalledWith(
      '/ws/rest/v1/billing/receipt?billUuid=bill-1',
      expect.objectContaining({ headers: { Accept: 'application/pdf' } }),
    );
    const clickLink = jest.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function () {
      expect(this.href).toBe('blob:receipt');
      expect(this.download).toBe('receipt_bill-1.pdf');
    });
    await user.click(within(dialog).getByRole('button', { name: 'Download receipt' }));
    expect(clickLink).toHaveBeenCalled();
    clickLink.mockRestore();
    await user.click(within(dialog).getAllByRole('button', { name: 'Close' })[1]);
    expect(onClose).toHaveBeenCalled();
    unmount();
    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:receipt');
  });

  it('shows an error and disables download if receipt loading fails', async () => {
    mockFetch.mockRejectedValue(new Error('Unavailable'));
    render(<ReceiptPreview billUuid="bill-1" onClose={jest.fn()} />);
    expect(await screen.findByRole('alert')).toHaveTextContent('Could not load the receipt');
    expect(screen.getByRole('button', { name: 'Download receipt' })).toBeDisabled();
  });
});
