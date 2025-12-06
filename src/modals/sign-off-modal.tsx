import React, { useCallback, useState } from 'react';
import { Button, ButtonSkeleton, ModalBody, ModalFooter, ModalHeader } from '@carbon/react';
import { useTranslation } from 'react-i18next';
import styles from './sign-off-modal.scss';
import { type QueueEntry } from '../types/types';

interface SignOffModalProps {
  queueEntries: Array<QueueEntry>;
  closeModal: () => void;
}

const SignOffModal: React.FC<SignOffModalProps> = ({ queueEntries, closeModal }) => {
  const { t } = useTranslation();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSignOffRequest = useCallback(() => {
    setIsSubmitting(true);
  }, []);

  return (
    <div>
      <ModalHeader
        closeModal={closeModal}
        label={t('signOffMessage', 'Sign off message')}
        title={t('signOffMessage', 'Sign off message')}
      />
      <ModalBody>
        <p className={styles.subHeading} id="subHeading">
          {t(
            'signOffMessage',
            'Sign off message',
          )}
          .
        </p>
      </ModalBody>
      <ModalFooter>
        <Button kind="secondary" onClick={closeModal}>
          {t('cancel', 'Cancel')}
        </Button>
        {isSubmitting === true ? (
          <ButtonSkeleton />
        ) : (
          <Button kind="danger" onClick={handleSignOffRequest}>
            {t('signOff', 'SignOff')}
          </Button>
        )}
      </ModalFooter>
    </div>
  );
};

export default SignOffModal;
