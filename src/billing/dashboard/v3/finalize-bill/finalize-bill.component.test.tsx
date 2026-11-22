import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { showModal } from '@openmrs/esm-framework';
import FinalizeBill from './finalize-bill.component';
import { useBill, mapBillProperties } from './finalize-bill.resource';

jest.mock('@openmrs/esm-framework', () => ({
  showModal: jest.fn(),
  showSnackbar: jest.fn(),
  formatDate: jest.fn(),
  parseDate: jest.fn(),
}));
jest.mock('./finalize-bill.resource', () => ({
  useBill: jest.fn(),
  mapBillProperties: jest.fn(),
  processBillPayment: jest.fn(),
}));
jest.mock('./helpers', () => ({ convertToCurrency: (amount) => String(amount) }));
jest.mock('./bill-line-items/bill-line-items.component', () => () => null);
jest.mock('./payments/payments.component', () => ({ onFinalizeBill, bill }) =>
  bill.status === 'PENDING' ? <button onClick={onFinalizeBill}>Finalize bill</button> : null,
);
jest.mock('./payments/printable-invoice/bill-document-preview.component', () => ({
  InvoicePreview: () => null,
  ReceiptPreview: () => null,
}));
jest.mock('../../../../shared/services/billing.resource', () => ({ fetchPaymentModes: jest.fn() }));

const mockUseBill = useBill as jest.Mock;
const mockMapBill = mapBillProperties as jest.Mock;
const mockShowModal = showModal as jest.Mock;
const mutate = jest.fn();
global.ResizeObserver = class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
};

describe('finalize bill actions', () => {
  beforeEach(() => {
    mockShowModal.mockReset();
    mockUseBill.mockReturnValue({ bill: { status: 'PENDING', lineItems: [] }, mutate });
    mockMapBill.mockReturnValue({ status: 'PENDING', totalAmount: 100, netAmount: 100, tenderedAmount: 0 });
  });

  it('shows two finalize actions for a pending bill and opens the same confirmation', async () => {
    const user = userEvent.setup();
    render(<FinalizeBill billUuid="bill-1" closeModal={jest.fn()} />);
    const buttons = screen.getAllByRole('button', { name: 'Finalize bill' });
    expect(buttons).toHaveLength(2);
    expect(buttons[0].nextElementSibling).toBe(screen.getByRole('button', { name: 'Apply Discount' }));
    await user.click(buttons[0]);
    await user.click(buttons[1]);
    expect(mockShowModal).toHaveBeenCalledTimes(2);
    expect(mockShowModal).toHaveBeenCalledWith(
      'finalize-bill-confirmation-modal',
      expect.objectContaining({ billUuid: 'bill-1', onMutate: mutate, size: 'md' }),
    );
  });

  it.each(['POSTED', 'PAID'])('hides finalize actions for a %s bill', (status) => {
    mockUseBill.mockReturnValue({ bill: { status, lineItems: [] }, mutate });
    mockMapBill.mockReturnValue({ status, totalAmount: 100, netAmount: 100, tenderedAmount: 0 });
    render(<FinalizeBill billUuid="bill-1" closeModal={jest.fn()} />);
    expect(screen.queryByRole('button', { name: 'Finalize bill' })).not.toBeInTheDocument();
  });
});
