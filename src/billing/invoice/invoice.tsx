import React, { useEffect, useMemo, useState } from 'react';
import styles from './invoice.scss';
import HeaderCard from './invoice-header/header-card/header-card';
import { useParams } from 'react-router-dom';
import { showSnackbar, usePatient } from '@openmrs/esm-framework';
import { type Bill } from '../types';
import { fetchBill } from './bill.resource';
import {
  Button,
  Select,
  SelectItem,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  TextInput,
} from '@carbon/react';
import { type PaymentMode } from '../../shared/types';
import { fetchPaymentModes } from '../../shared/services/billing.resource';
interface InvoinceProps {}
const Invoice: React.FC<InvoinceProps> = () => {
  const { billUuid, patientUuid } = useParams();
  // const { patient, isLoading: isLoadingPatient } = usePatient(patientUuid);
  const [bill, setBill] = useState<Bill>();
  const totalAmount = useMemo(() => getTotalAmount(bill), [bill]);
  const totalTendered = useMemo(() => getTotalTendered(bill), [bill]);
  const [paymentModes, setPaymentModes] = useState<PaymentMode[]>([]);
  const [selectedPaymentMode, setSelectedPaymentMode] = useState<PaymentMode>();
  const [payAmount, setPayAmount] = useState<number>();
  const [refNo, setRefNo] = useState<string>('');

  useEffect(() => {
    if (billUuid) {
      fetchInvoiceBill(billUuid);
      getPaymentMethods();
    }
  }, [billUuid]);
  async function fetchInvoiceBill(billUuid: string) {
    try {
      const resp = await fetchBill(billUuid);
      setBill(resp);
    } catch (error) {
      showSnackbar({
        kind: 'error',
        title: 'Error fetching bill',
        subtitle: 'An error occurred while fetching the invoice bill',
      });
    }
  }

  if (!bill || !billUuid) {
    return;
  }
  function getTotalAmount(bill: Bill) {
    let total = 0;
    const lineItems = bill?.lineItems ?? [];
    for (let i = 0; i < lineItems.length; i++) {
      total += lineItems[i].price;
    }
    return total;
  }
  function getTotalTendered(bill: Bill) {
    let total = 0;
    return total;
  }
  async function getPaymentMethods() {
    const methods = await fetchPaymentModes();
    setPaymentModes(methods);
  }
  const paymentMethodHandler = (selectedPaymentModeUuid: string) => {
    const selectedPaymentMode = paymentModes.find((pm) => {
      return pm.uuid === selectedPaymentModeUuid;
    });
    setSelectedPaymentMode(selectedPaymentMode);
  };
  const amountHandler = (amount: number) => {
    setPayAmount(amount);
  };
  const refNoHandler = (refNo: string) => {
    setRefNo(refNo);
  };
  return (
    <>
      <div className={styles.invoiceLayout}>
        <div className={styles.invoiceHeader}>
          <div className={styles.invoiceTitle}>
            <h4>Patient Invoice</h4>
          </div>
          {bill ? (
            <>
              <div className={styles.invoiceHeaderDetails}>
                <HeaderCard title="Total Amount" subTitle={`KES ${totalAmount}`} />
                <HeaderCard title="Amount Tendered" subTitle={`KES ${totalTendered}`} />
                <HeaderCard title="Invoice No" subTitle={bill.receiptNumber} />
                <HeaderCard title="Date and Time" subTitle={bill.dateCreated} />
                <HeaderCard title="Invoice Status" subTitle={bill.status} />
              </div>
            </>
          ) : (
            <></>
          )}
        </div>
        <div className={styles.contentSection}>
          <div className={styles.lineItemsSection}>
            <div className={styles.lineItemsHeader}>
              <h5>Line Items</h5>
            </div>
            <div className={styles.lineItemsData}>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableHeader>No</TableHeader>
                    <TableHeader>Bill Item</TableHeader>
                    <TableHeader>Status</TableHeader>
                    <TableHeader>Quantity</TableHeader>
                    <TableHeader>Price</TableHeader>
                    <TableHeader>Total</TableHeader>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {bill.lineItems.map((item, index) => {
                    return (
                      <>
                        <TableRow id={item.uuid}>
                          <TableCell>{index + 1}</TableCell>
                          <TableCell>{item.billableService}</TableCell>
                          <TableCell>{item.paymentStatus}</TableCell>
                          <TableCell>{item.quantity}</TableCell>
                          <TableCell>KES {item.price}</TableCell>
                          <TableCell>KES {item.price * item.quantity}</TableCell>
                        </TableRow>
                      </>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </div>
          <div className={styles.paymentSection}>
            <div className={styles.paymentSectionHeader}>
              <h5>Payment</h5>
            </div>
            <div className={styles.paymentSectionContent}>
              <div className={styles.paymentMethodSection}>
                <div className={styles.formRow}>
                  <Select
                    id="payment-method"
                    labelText="Payment Method"
                    onChange={($event) => paymentMethodHandler($event.target.value)}
                  >
                    <SelectItem value="" text="Select" />;
                    {paymentModes &&
                      paymentModes.map((pm) => {
                        return <SelectItem value={pm.uuid} text={pm.name} />;
                      })}
                  </Select>
                </div>
                <div className={styles.formRow}>
                  <TextInput
                    id="amount"
                    type="number"
                    labelText="Amount"
                    onChange={(e) => amountHandler(parseInt(e.target.value))}
                  />
                </div>
                <div className={styles.formRow}>
                  <TextInput
                    id="reference-no"
                    labelText="Reference Number"
                    onChange={(e) => refNoHandler(e.target.value)}
                  />
                </div>
              </div>
              <div className={styles.processPaymentSection}>
                <div>Total Amount : {totalAmount}</div>
                <div>Total Tendered : {totalTendered}</div>
                <div>
                  <Button kind="secondary">Discard</Button>
                  <Button kind="primary">Process Payment</Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default Invoice;
