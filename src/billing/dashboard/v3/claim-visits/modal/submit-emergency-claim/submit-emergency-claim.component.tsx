import React, { useState } from 'react';

import styles from './submit-emergency.scss';
import { InlineLoading, Modal, TextArea, TextInput } from '@carbon/react';
import { showSnackbar } from '@openmrs/esm-framework';
import { submitEmergencyClaim } from '../../../../../../registry/emergency/emergency.resource';

interface SubmitEmergencyClaimModalProps {
  consentToken: string;
  invoiceNumber: string;
  open: boolean;
  onClose: () => void;
  locationUuid: string;
}

const SubmitEmergencyClaimModal: React.FC<SubmitEmergencyClaimModalProps> = ({
  consentToken,
  invoiceNumber,
  open,
  onClose,
  locationUuid,
}) => {
  const [reasonForUnknownPatient, setReasonForUnknownPatient] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function postEmergencyClaim() {
    if (isSubmitting) {
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await submitEmergencyClaim(
        consentToken,
        invoiceNumber,
        locationUuid,
        reasonForUnknownPatient.trim() || undefined,
      );
      if (res?.error) {
        showSnackbar({
          title: res['error'] ?? 'Error Submitting Claim',
          kind: 'error',
          subtitle: res['message'] ?? 'An error occurred while submitting the claim. Kindy retry or contact support',
        });
        return;
      }

      showSnackbar({
        title: 'Success Submitting Claim',
        kind: 'success',
        subtitle: 'Claim submitted successfully',
      });
      onClose();
    } finally {
      setIsSubmitting(false);
    }
  }
  return (
    <>
      <Modal
        aria-label="Modal content"
        modalHeading="Submit Emergency Claim"
        onRequestClose={onClose}
        onRequestSubmit={postEmergencyClaim}
        onSecondarySubmit={onClose}
        open={open}
        primaryButtonDisabled={isSubmitting}
        primaryButtonText={isSubmitting ? 'Submitting...' : 'Submit'}
        secondaryButtonText="Cancel"
      >
        <div className={styles.addClaimLineModalRow}>
          <TextInput id="invoice-number" labelText="Invoice Number" value={invoiceNumber} readOnly={true} />
        </div>
        {/* <div className={styles.addClaimLineModalRow}>
          <TextInput id="consent-token" labelText="Consent Token" value={consentToken} readOnly={true} />
        </div> */}
        <div className={styles.addClaimLineModalRow}>
          <TextArea
            id="reason-for-unknown-patient"
            labelText="Reason for unknown patient (Optional)"
            value={reasonForUnknownPatient}
            onChange={(event) => setReasonForUnknownPatient(event.target.value)}
          />
        </div>
        {isSubmitting && <InlineLoading status="active" description="Submitting emergency claim..." />}
      </Modal>
    </>
  );
};

export default SubmitEmergencyClaimModal;
