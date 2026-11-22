import React, { useEffect, useMemo, useState } from 'react';
import { Button, InlineLoading, InlineNotification, Layer, Tile } from '@carbon/react';
import { FormProvider, useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { CardHeader, navigate, showSnackbar, useConfig } from '@openmrs/esm-framework';
import { InvoiceBreakDown } from './invoice-breakdown/invoice-breakdown.component';
import PaymentForm from './payment-form/payment-form.component';
import PaymentHistory from './payment-history/payment-history.component';
import { mapBillProperties, processBillPayment } from '../finalize-bill.resource';
import { convertToCurrency } from '../helpers';
import { BillStatus } from '../types';
import styles from './payments.scss';
import { type PatientInvoice } from '../types';
import {
  groupLineItemsByPaymentMode,
  resolveLineItemPaymentModes,
} from './payment-form/payment-form.utils';
import { type BillableService } from '../../../../../shared/types';
import { fetchBillableServices } from '../../../../../shared/services/billing.resource';

type PaymentProps = {
  bill: PatientInvoice;
  mutate: () => void;
  onFinalizeBill: () => void;
};

export type PaymentFormValue = {
  payments: Array<{ referenceCode?: string }>;
};

const Payments: React.FC<PaymentProps> = ({ bill: unMappedBill, mutate, onFinalizeBill }) => {
  const bill = mapBillProperties(unMappedBill);
  const { t } = useTranslation();
  const [billableServices, setBillableServices] = useState<BillableService[]>([]);
  const [isLoadingBillableServices, setIsLoadingBillableServices] = useState(true);
  const [billableServicesError, setBillableServicesError] = useState('');
  const resolvedLineItems = useMemo(
    () => resolveLineItemPaymentModes(bill?.lineItems ?? [], billableServices),
    [bill?.lineItems, billableServices],
  );
  const groupedLineItems = groupLineItemsByPaymentMode(resolvedLineItems, bill?.payments ?? []);
  const paymentFormSchema = z.object({
    payments: z.array(z.object({ referenceCode: z.string().optional() })),
  });
  const defaultPaymentValues: PaymentFormValue = { payments: groupedLineItems.map(() => ({ referenceCode: '' })) };
  const [isProcessingPayments, setIsProcessingPayments] = useState(false);

  useEffect(() => {
    let active = true;
    fetchBillableServices()
      .then((services) => {
        if (active) {
          setBillableServices(services);
        }
      })
      .catch((error: unknown) => {
        if (active) {
          setBillableServicesError(error instanceof Error ? error.message : String(error));
        }
      })
      .finally(() => {
        if (active) {
          setIsLoadingBillableServices(false);
        }
      });

    return () => {
      active = false;
    };
  }, []);

  const defaultCurrency = 'KES';

  const methods = useForm<PaymentFormValue>({
    mode: 'all',
    defaultValues: defaultPaymentValues,
    resolver: zodResolver(paymentFormSchema),
  });

  const handleNavigateToBillingDashboard = () =>
    navigate({
      to: window.getOpenmrsSpaBase() + 'home/billing',
    });

  if (!bill) {
    return null;
  }

  const amountDue = (bill.netAmount ?? 0) - (bill.tenderedAmount ?? 0);
  const isPending = bill.status === BillStatus.PENDING;

  const handleProcessPayment = async () => {
    if (isProcessingPayments) {
      return;
    }
    const paymentsToProcess = groupedLineItems.filter((payment) => payment.amount > 0);
    if (!paymentsToProcess.length) {
      return;
    }
    if (paymentsToProcess.some((payment) => !payment.paymentModeUuid)) {
      showSnackbar({
        title: t('errorProcessingPayment', 'Error processing payment'),
        subtitle: t('paymentModeMissing', 'A bill item is missing its payment mode.'),
        kind: 'error',
      });
      return;
    }

    setIsProcessingPayments(true);
    try {
      for (const payment of paymentsToProcess) {
        if (!payment.paymentModeUuid) {
          throw new Error(t('paymentModeMissing', 'A bill item is missing its payment mode.'));
        }
        await processBillPayment(
          {
            instanceType: payment.paymentModeUuid,
            amountTendered: payment.amount,
            amount: payment.amount,
          },
          bill.uuid,
        );
      }
      showSnackbar({
        title: t('billPayment', 'Bill payment'),
        subtitle: t('paymentsProcessedSuccessfully', 'Payments processed successfully'),
        kind: 'success',
      });
      mutate();
    } catch (error: unknown) {
      mutate();
      showSnackbar({
        title: t('errorProcessingPayment', 'Error processing payment'),
        kind: 'error',
        subtitle: error instanceof Error ? error.message : String(error),
      });
    } finally {
      setIsProcessingPayments(false);
    }
  };

  return (
    <FormProvider {...methods}>
      <div className={styles.wrapper}>
        <div className={styles.paymentContainer}>
          <CardHeader title={t('payments', 'Payments')}>
            <span></span>
          </CardHeader>
          <div>
            {isLoadingBillableServices ? (
              <InlineLoading description={t('loadingPaymentMethods', 'Resolving bill payment methods...')} />
            ) : null}
            {billableServicesError ? (
              <InlineNotification
                kind="error"
                lowContrast
                hideCloseButton
                title={t('paymentMethodsUnavailable', 'Unable to load payment methods')}
                subtitle={billableServicesError}
              />
            ) : null}
            {!isLoadingBillableServices &&
            groupedLineItems.some((payment) => payment.amount > 0 && !payment.paymentModeUuid) ? (
              <InlineNotification
                kind="error"
                lowContrast
                hideCloseButton
                title={t('paymentModeMissing', 'Payment mode could not be resolved')}
                subtitle={t(
                  'paymentModeMissingHelp',
                  'Check that each bill item matches an enabled billable service and payment mode at this location.',
                )}
              />
            ) : null}
            {isPending ? (
              <div className={styles.pendingEmptyState}>
                <Layer>
                  <Tile className={styles.pendingEmptyStateTile}>
                    <p className={styles.pendingEmptyStateContent}>{t('billNotFinalized', 'Bill not finalized')}</p>
                    <p className={styles.pendingEmptyStateHelper}>
                      {t('finalizeBillToRecordPayment', 'Finalize this bill before recording a payment.')}
                    </p>
                    <Button className={styles.finalizeButton} kind="primary" size="sm" onClick={onFinalizeBill}>
                      {t('finalizeBill', 'Finalize bill')}
                    </Button>
                  </Tile>
                </Layer>
              </div>
            ) : (
              <>
                <PaymentHistory bill={bill} />
                <PaymentForm disablePayment={amountDue <= 0} payments={groupedLineItems} />
              </>
            )}
          </div>
        </div>
        <div className={styles.divider} />
        <div className={styles.paymentTotals}>
          <InvoiceBreakDown
            label={t('totalAmount', 'Total amount')}
            value={convertToCurrency(bill.totalAmount ?? 0, defaultCurrency)}
          />
          <InvoiceBreakDown
            label={t('totalTendered', 'Total tendered')}
            value={convertToCurrency(bill.tenderedAmount ?? 0, defaultCurrency)}
          />
          <InvoiceBreakDown
            hasBalance={amountDue < 0}
            label={t('amountDue', 'Amount due')}
            value={convertToCurrency(amountDue, defaultCurrency)}
          />
          <div className={styles.processPayments}>
            <Button onClick={handleNavigateToBillingDashboard} kind="secondary">
              {t('discard', 'Discard')}
            </Button>
            {!isPending && (
              <Button
                onClick={handleProcessPayment}
                disabled={
                  isProcessingPayments ||
                  isLoadingBillableServices ||
                  !groupedLineItems.some((payment) => payment.amount > 0) ||
                  groupedLineItems.some((payment) => payment.amount > 0 && !payment.paymentModeUuid)
                }
              >
                {isProcessingPayments ? t('processingPayments', 'Processing...') : t('processPayments', 'Process Payments')}
              </Button>
            )}
          </div>
        </div>
      </div>
    </FormProvider>
  );
};

export default Payments;
