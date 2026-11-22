import React, { useState } from 'react';
import { Button, InlineLoading, ModalBody, ModalFooter, ModalHeader } from '@carbon/react';
import { showSnackbar } from '@openmrs/esm-framework';
import { useTranslation } from 'react-i18next';
import { finalizeBill } from './finalize-bill.resource';
import styles from './finalize-bill-confirmation.modal.scss';

interface FinalizeBillConfirmationModalProps {
  billUuid: string;
  closeModal: () => void;
  onMutate?: () => Promise<unknown> | unknown;
}

const FinalizeBillConfirmationModal: React.FC<FinalizeBillConfirmationModalProps> = ({
  billUuid,
  closeModal,
  onMutate,
}) => {
  const { t } = useTranslation();
  const [isFinalizing, setIsFinalizing] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const handleFinalize = async () => {
    if (!billUuid || isFinalizing) {
      return;
    }

    setIsFinalizing(true);
    setErrorMessage('');
    try {
      await finalizeBill(billUuid);
      await onMutate?.();
      showSnackbar({
        kind: 'success',
        title: t('billFinalized', 'Bill finalized'),
        subtitle: t('billFinalizedSuccess', 'Bill has been finalized successfully.'),
      });
      closeModal();
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      setErrorMessage(message || t('finalizeBillFailed', 'Unable to finalize this bill. Please try again.'));
    } finally {
      setIsFinalizing(false);
    }
  };

  return (
    <>
      <ModalHeader closeModal={closeModal} title={t('finalizeBill', 'Finalize bill')} />
      <ModalBody className={styles.modalBody}>
        <p>
          {t(
            'finalizeBillConfirmation',
            'Are you sure you want to finalize this bill? Once finalized, no further modifications will be allowed.',
          )}
        </p>
        {errorMessage ? <p role="alert">{errorMessage}</p> : null}
        {isFinalizing ? <InlineLoading description={t('finalizing', 'Finalizing bill...')} /> : null}
      </ModalBody>
      <ModalFooter>
        <Button kind="secondary" disabled={isFinalizing} onClick={closeModal}>
          {t('cancel', 'Cancel')}
        </Button>
        <Button kind="danger" disabled={isFinalizing || !billUuid} onClick={handleFinalize}>
          {isFinalizing ? t('finalizing', 'Finalizing...') : t('confirmFinalizeBill', 'Confirm finalization')}
        </Button>
      </ModalFooter>
    </>
  );
};

export default FinalizeBillConfirmationModal;
