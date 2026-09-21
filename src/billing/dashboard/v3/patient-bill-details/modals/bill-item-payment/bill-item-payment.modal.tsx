import React, { useEffect, useMemo, useState } from 'react';
import { InlineLoading, Modal, ModalBody, Select, SelectItem, TextInput } from '@carbon/react';
import styles from './bill-item-payment.modal.scss';
import { type PatientFacilityBillDetails } from '../../../types';
import { type PaymentMode } from '../../../../../../shared/types';
import { fetchPaymentModes, updateBillLineItem } from '../../../../../../shared/services/billing.resource';
import { useBill } from '../../../../../billing-claims.resource';
import { showSnackbar } from '@openmrs/esm-framework';
interface billItemPaymentModalProps {
  open: boolean;
  billItem: PatientFacilityBillDetails;
  onClose: () => void;
  onPay: () => void;
}
const BillItemPaymentModal: React.FC<billItemPaymentModalProps> = ({ open, onClose, onPay, billItem }) => {
  const [paymentModes, setPaymentModes] = useState<PaymentMode[]>([]);
  const billItemPaymentMode = useMemo(() => getBillItemPaymentMode(), [paymentModes, billItem]);
  const [selectedPaymentModeUuid, setSelectedPaymentModeUuid] = useState<string>('');
  const { bill, isLoading } = useBill(billItem?.bill_uuid);

  useEffect(() => {
    if (billItem) {
      getPaymentMethods();
    }
  }, [billItem]);

  async function getPaymentMethods() {
    const methods = await fetchPaymentModes();
    setPaymentModes(methods);
  }
  async function payForBillItem() {
    try {
      const payload = {
        "status": "PAID"
      };
      const resp = await updateBillLineItem(billItem.cashier_bill_line_item_uuid, payload);
      if (resp) {
        showSnackbar({
          kind: 'success',
          title: 'Bill item payment succesfully made',
          subtitle: '',
        });
        onPay();
      }
    } catch (error) {
      showSnackbar({
        kind: 'error',
        title: 'An error occurred while making bill item payment',
        subtitle: 'An error occurred while making bill item payment, please try again or contact support',
      });
    }
  }
  function handlePaymentModeChange(paymentModeUuid: string) {
    setSelectedPaymentModeUuid(paymentModeUuid);
  }
  function getBillItemPaymentMode() {
    return paymentModes.find((pm) => {
      return pm.name === billItem.payment_scheme;
    });
  }
  return (
    <>
      <Modal
        modalHeading='Bill Item Payment'
        open={open}
        size="sm"
        onSecondarySubmit={onClose}
        onRequestClose={onClose}
        onRequestSubmit={payForBillItem}
        primaryButtonText="Pay"
        primaryButtonDisabled={isLoading}
        secondaryButtonText="Close"
      >
        <ModalBody>
          {
            (isLoading && !bill) &&
            <InlineLoading description="Loading bill ..." />
          }
          <div className={styles.biModalLayout}>
            <div className={styles.biRow}>
              <TextInput
                id="bill-item"
                labelText="Billable Item"
                value={`${billItem.billable_service}`}
                readOnly={true}
              />
            </div>
            <div className={styles.biRow}>
              <TextInput
                id="bill-item-amount"
                labelText="Amount"
                value={`Ksh ${billItem.item_total_price}`}
                readOnly={true}
              />
            </div>
            {/* <div className={styles.biRow}>
              {billItemPaymentMode ? (
                <>
                  <TextInput
                    id="insurance-scheme"
                    labelText="Payment Mode"
                    value={billItemPaymentMode?.name}
                    readOnly={true}
                  />
                </>
              ) : (
                <>
                  <Select
                    id="cash-point"
                    labelText="Cash Point"
                    onChange={($event) => handlePaymentModeChange($event.target.value)}
                  >
                    <SelectItem value="" text="Select" />;
                    {paymentModes &&
                      paymentModes.map((pm) => {
                        return <SelectItem value={pm.uuid} text={pm.name} />;
                      })}
                  </Select>
                </>
              )}
            </div> */}
            {/* Commented for now. DO NOT REMOVE!! */}
            {/* <div className={styles.biRow}>
              <TextInput
                id="insurance-scheme"
                labelText="Pay Amount"
                type="number"
                onChange={(v) => handlePayAmountChange(parseInt(v.target.value))}
              />
            </div> */}
          </div>
        </ModalBody>
      </Modal>
    </>
  );
};
export default BillItemPaymentModal;
