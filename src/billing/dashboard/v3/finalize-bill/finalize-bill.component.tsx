import React from 'react';
import { useBill } from './finalize-bill.resource';
import { Button, InlineLoading, ModalBody, ModalFooter, ModalHeader } from '@carbon/react';
import { useTranslation } from 'react-i18next';
import BillLineItems from './bill-line-items/bill-line-items.component';
import Payments from './payments/payments.component';
import { showModal } from '@openmrs/esm-framework';

interface FinalizeBillProps {
  billUuid: string;
  closeModal: () => void;
}

const FinalizeBill: React.FC<FinalizeBillProps> = ({ billUuid, closeModal }) => {
  const { bill, isLoading, isValidating, mutate } = useBill(billUuid);
  const { t } = useTranslation();

  const handleFinalizeBill = () => {
    let dispose: () => void;
    dispose = showModal('finalize-bill-confirmation-modal', {
      billUuid,
      onMutate: mutate,
      closeModal: () => dispose(),
      size: 'md',
    });
  };

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
        {bill ? (
          <>
            {/* Bill Header */}
            <div></div>

            {/* Bill Line Items */}
            <BillLineItems lineItems={bill.lineItems} />

            {/* Grouped line items with 'PROCESS PAYMENT' button */}
            <Payments bill={bill} mutate={mutate} onFinalizeBill={handleFinalizeBill} />
          </>
        ) : null}
      </ModalBody>
      <ModalFooter>
        <Button kind="secondary" onClick={closeModal}>
          {t('close', 'Close')}
        </Button>
      </ModalFooter>
    </>
  );
};

export default FinalizeBill;
