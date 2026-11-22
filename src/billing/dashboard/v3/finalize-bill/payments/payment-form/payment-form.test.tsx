import React from 'react';
import userEvent from '@testing-library/user-event';
import { render, screen } from '@testing-library/react';
import { FormProvider, useForm } from 'react-hook-form';
import type { PaymentFormValue } from '../payments.component';
import PaymentForm from './payment-form.component';
import {
  groupLineItemsByPaymentMode,
  resolveLineItemPaymentModes,
  type GroupedLineItemPayment,
} from './payment-form.utils';
import { BillLineItemStatus, type LineItem, type Payment } from '../../types';
import { type BillableService } from '../../../../../../shared/types';

const groupedPayments: GroupedLineItemPayment[] = [
  {
    key: 'cash-mode',
    paymentModeUuid: 'cash-mode',
    paymentModeName: 'Cash',
    itemCount: 2,
    amount: 150,
  },
  {
    key: 'mpesa-mode',
    paymentModeUuid: 'mpesa-mode',
    paymentModeName: 'M-Pesa',
    itemCount: 1,
    amount: 75.5,
  },
];

type WrapperProps = {
  children: React.ReactNode;
};

const Wrapper: React.FC<WrapperProps> = ({ children }) => {
  const methods = useForm<PaymentFormValue>({
    mode: 'all',
    defaultValues: { payments: groupedPayments.map(() => ({ referenceCode: '' })) },
  });
  return <FormProvider {...methods}>{children}</FormProvider>;
};

describe('PaymentForm grouped line items', () => {
  it('resolves a service-price UUID to its payment mode before grouping', () => {
    const lineItems: LineItem[] = [
      {
        uuid: 'item-1',
        billableService: 'service-1',
        priceUuid: 'service-price-1',
        priceName: 'M-Pesa',
        status: BillLineItemStatus.PENDING,
        price: 250,
        quantity: 1,
      },
    ];
    const services = [
      {
        uuid: 'service-1',
        name: 'Consultation',
        servicePrices: [
          {
            uuid: 'service-price-1',
            name: 'M-Pesa',
            price: 250,
            paymentMode: { uuid: 'payment-mode-mpesa', name: 'M-Pesa' },
          },
        ],
      },
    ] as unknown as BillableService[];

    const resolved = resolveLineItemPaymentModes(lineItems, services);
    expect(groupLineItemsByPaymentMode(resolved)).toEqual([
      expect.objectContaining({
        paymentModeUuid: 'payment-mode-mpesa',
        paymentModeName: 'M-Pesa',
        amount: 250,
      }),
    ]);
  });

  it('groups bill line items by their payment-mode UUID and subtracts recorded payments', () => {
    const lineItems: LineItem[] = [
      {
        uuid: 'cash-1',
        status: BillLineItemStatus.PENDING,
        priceName: 'Cash',
        priceUuid: 'cash-mode',
        price: 20,
        quantity: 2,
      },
      {
        uuid: 'cash-2',
        status: BillLineItemStatus.PENDING,
        priceName: 'Cash',
        priceUuid: 'cash-mode',
        price: 10,
        quantity: 1,
      },
      {
        uuid: 'mpesa-1',
        status: BillLineItemStatus.PENDING,
        priceName: 'M-Pesa',
        priceUuid: 'mpesa-mode',
        price: 75.5,
        quantity: 1,
      },
      {
        uuid: 'paid-1',
        status: BillLineItemStatus.PAID,
        priceName: 'Cash',
        priceUuid: 'cash-mode',
        price: 50,
        quantity: 1,
      },
      {
        uuid: 'void-1',
        status: BillLineItemStatus.PENDING,
        priceName: 'Cash',
        priceUuid: 'cash-mode',
        price: 5,
        quantity: 1,
        voided: true,
      },
    ];
    const payments = [
      { uuid: 'payment-1', instanceType: { uuid: 'cash-mode' }, amount: 5, amountTendered: 5, voided: false },
    ] as Payment[];

    expect(groupLineItemsByPaymentMode(lineItems, payments)).toEqual([
      expect.objectContaining({
        key: 'cash-mode',
        paymentModeUuid: 'cash-mode',
        paymentModeName: 'Cash',
        itemCount: 3,
        amount: 95,
      }),
      expect.objectContaining({
        key: 'mpesa-mode',
        paymentModeUuid: 'mpesa-mode',
        paymentModeName: 'M-Pesa',
        itemCount: 1,
        amount: 75.5,
      }),
    ]);
  });

  it('keeps paid line items visible when no payment amount was tendered', () => {
    const paidLineItem: LineItem = {
      uuid: 'paid-only',
      status: BillLineItemStatus.PAID,
      priceName: 'Cash',
      priceUuid: 'cash-mode',
      price: 500,
      quantity: 1,
    };

    expect(groupLineItemsByPaymentMode([paidLineItem], [])).toEqual([
      expect.objectContaining({
        paymentModeUuid: 'cash-mode',
        paymentModeName: 'Cash',
        itemCount: 1,
        amount: 500,
      }),
    ]);
  });

  it('shows one read-only method and summed amount per group', () => {
    render(
      <Wrapper>
        <PaymentForm disablePayment={false} payments={groupedPayments} />
      </Wrapper>,
    );

    expect(screen.getAllByLabelText('Payment method').map((input) => (input as HTMLInputElement).value)).toEqual([
      'Cash',
      'M-Pesa',
    ]);
    expect(screen.getAllByLabelText('Amount').map((input) => (input as HTMLInputElement).value)).toEqual([
      '150.00',
      '75.50',
    ]);
    expect(screen.getAllByLabelText('Reference number')).toHaveLength(2);
    expect(screen.queryByText(/select payment method/i)).not.toBeInTheDocument();
    expect(screen.queryByPlaceholderText(/enter amount/i)).not.toBeInTheDocument();
  });

  it('keeps reference input associated with each payment mode group', async () => {
    const user = userEvent.setup();
    render(
      <Wrapper>
        <PaymentForm disablePayment={false} payments={groupedPayments} />
      </Wrapper>,
    );

    const references = screen.getAllByPlaceholderText(/enter reference number/i);
    await user.type(references[0], 'MPESA-123');
    expect(references[0]).toHaveValue('MPESA-123');
  });

  it('does not render payment groups when payment is disabled', () => {
    render(
      <Wrapper>
        <PaymentForm disablePayment payments={groupedPayments} />
      </Wrapper>,
    );

    expect(screen.queryAllByLabelText('Payment method')).toHaveLength(0);
    expect(screen.queryAllByLabelText('Amount')).toHaveLength(0);
  });
});
