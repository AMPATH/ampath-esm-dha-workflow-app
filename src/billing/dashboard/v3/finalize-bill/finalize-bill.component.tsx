import React, { useState } from 'react';
import { useBill, mapBillProperties, processBillPayment } from './finalize-bill.resource';
import { Button, InlineLoading, Modal, ModalBody, ModalFooter, ModalHeader, NumberInput, Tag } from '@carbon/react';
import { useTranslation } from 'react-i18next';
import BillLineItems from './bill-line-items/bill-line-items.component';
import Payments from './payments/payments.component';
import { InvoicePreview, ReceiptPreview } from './payments/printable-invoice/bill-document-preview.component';
import { formatDate, parseDate, showModal, showSnackbar } from '@openmrs/esm-framework';
import { convertToCurrency } from './helpers';
import { BillStatus } from './types';
import { fetchPaymentModes } from '../../../../shared/services/billing.resource';
import styles from './finalize-bill.component.scss';

interface FinalizeBillProps {
  billUuid: string;
  closeModal: () => void;
}

const FinalizeBill: React.FC<FinalizeBillProps> = ({ billUuid, closeModal }) => {
  const { bill, isLoading, isValidating, mutate } = useBill(billUuid);
  const { t } = useTranslation();
  const [isDiscountModalOpen, setIsDiscountModalOpen] = useState(false);
  const [discountType, setDiscountType] = useState<'AMOUNT' | 'PERCENT'>('AMOUNT');
  const [discountPercentage, setDiscountPercentage] = useState('');
  const [discountAmount, setDiscountAmount] = useState('');
  const [isApplyingDiscount, setIsApplyingDiscount] = useState(false);
  const [documentPreview, setDocumentPreview] = useState<'invoice' | 'receipt' | null>(null);

  const handleFinalizeBill = () => {
    let dispose: () => void;
    dispose = showModal('finalize-bill-confirmation-modal', {
      billUuid,
      onMutate: mutate,
      closeModal: () => dispose(),
      size: 'md',
    });
  };

  const mappedBill = bill ? mapBillProperties(bill) : null;
  const subtotal = mappedBill?.totalAmount ?? 0;
  const netAmount = mappedBill?.netAmount ?? subtotal;
  const discount = Math.max(0, subtotal - netAmount);
  const tenderedAmount = mappedBill?.tenderedAmount ?? 0;
  const amountDue = netAmount - tenderedAmount;
  const isPaid = mappedBill?.status === BillStatus.PAID;

  const closeDiscountModal = () => {
    if (!isApplyingDiscount) {
      setIsDiscountModalOpen(false);
      setDiscountAmount('');
      setDiscountPercentage('');
    }
  };

  const applyDiscount = async () => {
    const percentage = Number(discountPercentage || 0);
    const fixedAmount = Number(discountAmount || 0);
    const appliedAmount =
      discountType === 'PERCENT' ? Math.round((amountDue * percentage) / 100) : fixedAmount;

    if (appliedAmount <= 0 || appliedAmount > amountDue) {
      showSnackbar({
        kind: 'error',
        title: t('invalidDiscount', 'Invalid discount'),
        subtitle: t('discountRangeInvalid', 'Discount must be greater than zero and not exceed the balance.'),
      });
      return;
    }

    setIsApplyingDiscount(true);
    try {
      const paymentModes = await fetchPaymentModes();
      const discountMode = paymentModes.find((mode) =>
        ['waiver', 'discount', 'waived'].includes(mode.name.trim().toLowerCase()),
      );

      if (!discountMode) {
        throw new Error(t('discountPaymentModeMissing', 'A waiver or discount payment mode was not found.'));
      }

      await processBillPayment(
        {
          instanceType: discountMode.uuid,
          amount: appliedAmount,
          amountTendered: appliedAmount,
        },
        billUuid,
      );
      await mutate();
      showSnackbar({
        kind: 'success',
        title: t('discountApplied', 'Discount applied'),
        subtitle: t('discountAppliedSuccessfully', 'The discount was applied successfully.'),
      });
      setDiscountAmount('');
      setDiscountPercentage('');
      setIsDiscountModalOpen(false);
    } catch (error: unknown) {
      showSnackbar({
        kind: 'error',
        title: t('discountApplicationFailed', 'Discount application failed'),
        subtitle: error instanceof Error ? error.message : String(error),
      });
    } finally {
      setIsApplyingDiscount(false);
    }
  };

  const discountInputValid =
    discountType === 'PERCENT'
      ? discountPercentage !== '' && Number(discountPercentage) >= 1 && Number(discountPercentage) <= 100
      : discountAmount !== '' &&
        Number(discountAmount) >= 1 &&
        Number(discountAmount) <= amountDue;

  return (
    <>
      <ModalHeader closeModal={closeModal} title={t('finalizeBill', 'Finalize bill')} />
      <ModalBody>
        {!bill && (isLoading || isValidating) ? (
          <InlineLoading
            title={t('loading', 'Loading...')}
            description={t('loadingPatientBill', 'Loading patient bill...')}
          />
        ) : null}
        {bill && mappedBill ? (
          <>
            <div className={styles.billHeader}>
              <div className={styles.billIdentity}>
                <h3 className={styles.billTitle}>{t('billSummary', 'Bill summary')}</h3>
                <Tag size="sm" type={amountDue <= 0 ? 'green' : isPaid ? 'blue' : 'red'}>
                  {mappedBill.status}
                </Tag>
                <div className={styles.billMeta}>
                  <span>{mappedBill.patientName}</span>
                  <span>{mappedBill.identifier}</span>
                </div>
                <div className={styles.billMeta}>
                  <span>
                    {t('invoiceNo', 'Invoice #')}: {mappedBill.receiptNumber || '--'}
                  </span>
                  <span>
                    {t('invoiceDate', 'Invoice date')}:{' '}
                    {mappedBill.dateCreated
                      ? formatDate(parseDate(mappedBill.dateCreated), { mode: 'wide', noToday: true, time: false })
                      : '--'}
                  </span>
                </div>
              </div>

              <div>
                <div className={styles.billSummary}>
                  <div className={styles.summaryRow}>
                    <span>{t('subtotal', 'Subtotal')}</span>
                    <span className={styles.summaryValue}>{convertToCurrency(subtotal, 'KES')}</span>
                  </div>
                  {discount > 0 ? (
                    <div className={styles.summaryRow}>
                      <span>{t('discount', 'Discount')}</span>
                      <span className={styles.discountValue}>-{convertToCurrency(discount, 'KES')}</span>
                    </div>
                  ) : null}
                  <div className={styles.summaryRow}>
                    <span>{t('totalAmount', 'Total amount')}</span>
                    <span className={styles.summaryValue}>{convertToCurrency(netAmount, 'KES')}</span>
                  </div>
                  <div className={styles.summaryRow}>
                    <span>{t('totalPaid', 'Paid')}</span>
                    <span className={styles.summaryValue}>{convertToCurrency(tenderedAmount, 'KES')}</span>
                  </div>
                  <div className={styles.summaryRow}>
                    <span>{t('amountDue', 'Balance')}</span>
                    <span className={styles.summaryValue}>{convertToCurrency(amountDue, 'KES')}</span>
                  </div>
                </div>
              </div>
              <div className={styles.receiptActions}>
                {mappedBill.status === BillStatus.PENDING && (
                  <Button kind="primary" onClick={handleFinalizeBill}>
                    {t('finalizeBill', 'Finalize bill')}
                  </Button>
                )}
                {amountDue > 0 && !isPaid ? (
                  <Button kind="secondary" onClick={() => setIsDiscountModalOpen(true)}>
                    {t('applyDiscount', 'Apply Discount')}
                  </Button>
                ) : null}
                <Button kind="ghost" onClick={() => setDocumentPreview('invoice')}>
                  {t('printInvoice', 'Print invoice')}
                </Button>
                {isPaid || tenderedAmount > 0 ? (
                  <Button kind="ghost" onClick={() => setDocumentPreview('receipt')}>
                    {t('printReceipt', 'Print receipt')}
                  </Button>
                ) : null}
              </div>
            </div>

            <BillLineItems lineItems={bill.lineItems} />

            <Payments bill={bill} mutate={mutate} onFinalizeBill={handleFinalizeBill} />
          </>
        ) : null}
      </ModalBody>
      <ModalFooter>
        <Button kind="secondary" onClick={closeModal}>
          {t('close', 'Close')}
        </Button>
      </ModalFooter>

      <Modal
        open={isDiscountModalOpen}
        modalHeading={t('applyDiscount', 'Apply Discount')}
        primaryButtonText={isApplyingDiscount ? t('applying', 'Applying...') : t('submit', 'Submit')}
        secondaryButtonText={t('cancel', 'Cancel')}
        primaryButtonDisabled={isApplyingDiscount || !discountInputValid}
        onRequestClose={closeDiscountModal}
        onRequestSubmit={applyDiscount}
        size="sm"
      >
        <div className={styles.discountTypeOptions}>
          <label htmlFor="discount-type-amount">
            <input
              type="radio"
              id="discount-type-amount"
              name="discount-type"
              value="AMOUNT"
              checked={discountType === 'AMOUNT'}
              onChange={() => setDiscountType('AMOUNT')}
            />{' '}
            {t('amount', 'Amount')}
          </label>
          <label htmlFor="discount-type-percent">
            <input
              type="radio"
              id="discount-type-percent"
              name="discount-type"
              value="PERCENT"
              checked={discountType === 'PERCENT'}
              onChange={() => setDiscountType('PERCENT')}
            />{' '}
            {t('percentage', 'Percentage')}
          </label>
        </div>

        {discountType === 'PERCENT' ? (
          <NumberInput
            id="discount-percentage"
            label={t('discountPercentage', 'Discount Percentage')}
            min={0}
            max={100}
            value={discountPercentage}
            invalid={discountPercentage !== '' && (Number(discountPercentage) < 1 || Number(discountPercentage) > 100)}
            invalidText={t('discountPercentageInvalid', 'Percentage must be between 1 and 100')}
            onChange={(_event, state) => setDiscountPercentage(String(state.value))}
          />
        ) : (
          <NumberInput
            id="discount-amount"
            label={t('discountAmount', 'Discount Amount')}
            min={0}
            max={amountDue}
            value={discountAmount}
            invalid={discountAmount !== '' && (Number(discountAmount) < 1 || Number(discountAmount) > amountDue)}
            invalidText={t('discountAmountInvalid', 'Amount must be greater than zero and not exceed the balance')}
            onChange={(_event, state) => setDiscountAmount(String(state.value))}
          />
        )}
      </Modal>
      {documentPreview === 'invoice' && mappedBill && (
        <InvoicePreview bill={mappedBill} onClose={() => setDocumentPreview(null)} />
      )}
      {documentPreview === 'receipt' && <ReceiptPreview billUuid={billUuid} onClose={() => setDocumentPreview(null)} />}
    </>
  );
};

export default FinalizeBill;
