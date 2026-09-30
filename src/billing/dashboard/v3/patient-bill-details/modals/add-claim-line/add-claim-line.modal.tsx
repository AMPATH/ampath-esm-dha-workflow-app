import React, { useState } from 'react';
import { Modal, ModalBody, TextInput } from '@carbon/react';
import styles from './add-claim-line.modal.scss';
import { type AddProtocalDto, type AddClaimLineDto, type PatientFacilityBillDetails } from '../../../types';
import { addClaimItem } from '../../../../../billing-claims.resource';
import { showSnackbar } from '@openmrs/esm-framework';
import { addEmergencyProtocal } from '../../../../../../registry/emergency/emergency.resource';

interface addClaimLineModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  billItem: PatientFacilityBillDetails;
  locationUuid: string;
  consentToken?: string;
}
const AddClaimLineModal: React.FC<addClaimLineModalProps> = ({
  open,
  onClose,
  onSuccess,
  billItem,
  locationUuid,
  consentToken: consentTokenProp,
}) => {
  const [loading, setLoading] = useState<boolean>(false);
  const [unitPrice, setUnitPrice] = useState(String(billItem.item_price));
  async function handleAddClaimLineItem() {
    setLoading(true);
    const addClaimLineDto = getClaimLineDto();
    try {
      const resp = await addClaimItem(addClaimLineDto);
      if (resp['error']) {
        showSnackbar({
          title: resp['error'] ?? 'Error Adding Claim Line',
          kind: 'error',
          subtitle: resp['message'] ?? 'An error occurred while adding the claim line. Kindy retry or contact support',
        });
        onSuccess();
      } else {
        showSnackbar({
          title: 'Success Adding Claim Line',
          kind: 'success',
          subtitle: 'Claim Item added successfully',
        });
        onSuccess();
      }
    } catch (error: any) {
      showSnackbar({
        kind: 'error',
        title: 'Error Adding Claim Line',
        subtitle: error ?? 'An error occurred while adding the claim line. Kindy retry or contact support',
      });
    } finally {
      setLoading(false);
    }
  }

  async function handleAddProtocal() {
    setLoading(true);
    const addProtocalDto = getProtocalDto();
    try {
      const resp = await addEmergencyProtocal(addProtocalDto);
      if (resp['error']) {
        showSnackbar({
          title: resp['error'] ?? 'Error Adding Protocol',
          kind: 'error',
          subtitle: resp['message'] ?? 'An error occurred while adding the protocol. Kindy retry or contact support',
        });
        onSuccess();
      } else {
        showSnackbar({
          title: 'Success Adding Protocol',
          kind: 'success',
          subtitle: 'Protocol added successfully',
        });
        onSuccess();
      }
    } catch (error: any) {
      showSnackbar({
        kind: 'error',
        title: 'Error Adding Protocol',
        subtitle: error ?? 'An error occurred while adding the protocol. Kindy retry or contact support',
      });
    } finally {
      setLoading(false);
    }
  }
  function getClaimLineDto(): AddClaimLineDto {
    return {
      consentToken: (consentTokenProp || billItem.consent_token || '').trim(),
      interventionCode: billItem.intervention_code,
      unitPrice,
      quantity: String(billItem.item_quantity),
      locationUuid: locationUuid,
      orderNo: String(billItem.order_no ?? ''),
    };
  }

  function getProtocalDto(): AddProtocalDto {
    return {
      consentToken: (consentTokenProp || billItem.consent_token || '').trim(),
      protocolCode: String(billItem.protocal_code ?? ''),
      interventionCode: billItem.intervention_code,
      unitPrice: Number(unitPrice),
      quantity: billItem.item_quantity,
      locationUuid: locationUuid,
    };
  }
  function holderFunction() {
    return;
  }
  const isEmergency = billItem.service_type === 'EMERGENCY';

  return (
    <>
      <Modal
        modalHeading={isEmergency ? 'Add Protocol' : 'Add Claim Line'}
        open={open}
        size="md"
        onSecondarySubmit={onClose}
        onRequestClose={onClose}
        onRequestSubmit={loading ? holderFunction : isEmergency ? handleAddProtocal : handleAddClaimLineItem}
        primaryButtonText={loading ? 'Adding...' : isEmergency ? 'Add Protocol' : 'Add Claim Line'}
        secondaryButtonText="Close"
      >
        <ModalBody>
          <div className={styles.addClaimLineModalLayout}>
            <div className={styles.addClaimLineModalRow}>
              <TextInput
                id="bill-item"
                labelText="Intervention Code"
                value={billItem.intervention_code}
                readOnly={true}
              />
            </div>
            <div className={styles.addClaimLineModalRow}>
              <TextInput
                id="bill-item-amount"
                labelText="Unit Price (Ksh)"
                type="number"
                min="0"
                step="any"
                value={unitPrice}
                onChange={(event) => setUnitPrice(event.target.value)}
              />
            </div>
            <div className={styles.addClaimLineModalRow}>
              <TextInput id="bill-item-amount" labelText="Quantity" value={billItem.item_quantity} readOnly={true} />
            </div>
          </div>
        </ModalBody>
      </Modal>
    </>
  );
};
export default AddClaimLineModal;
