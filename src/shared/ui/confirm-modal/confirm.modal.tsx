import { Modal, ModalBody } from '@carbon/react';
import React from 'react';
import styles from './confirm.modal.scss';
interface ConfirmModal {
  title: string;
  subtitle: string;
  open: boolean;
  onModalClose: () => void;
  onConfirm: () => void;
}
const ConfirmModal: React.FC<ConfirmModal> = ({ open, title, subtitle, onConfirm, onModalClose }) => {
  return (
    <>
      <Modal
        modalHeading=""
        open={open}
        size="md"
        onSecondarySubmit={onModalClose}
        onRequestClose={() => onModalClose()}
        onRequestSubmit={onConfirm}
        primaryButtonText="Confirm"
        secondaryButtonText="Cancel"
      >
        <ModalBody>
          <div className={styles.modalLayout}>
            <div className={styles.modalTitle}>
              <h4>{title}</h4>
            </div>
            <div className={styles.modalContentSection}>
              <h6>{subtitle}</h6>
            </div>
          </div>
        </ModalBody>
      </Modal>
    </>
  );
};
export default ConfirmModal;
