import React from "react";
import { type PaymentReconciliationResource } from "../types";
import styles from './payment-reconciliation.scss';
import {
  Table,
  TableHead,
  TableHeader,
  TableBody,
  TableRow,
  TableCell,
} from '@carbon/react';
import { formatDate } from "@openmrs/esm-framework";

interface paymentReconciliationProps {
    prResource?: PaymentReconciliationResource
}
const PaymentReconciliation: React.FC<paymentReconciliationProps> = ({prResource})=>{
 

  return (
    <>
    <div className={styles.prLayout}>
         <div className={styles.prHeader}>
            <ul className={styles.prHeaderInfo}>
                <li>
                    <div className={styles.infoTitle}>Status</div>
                    <div className={styles.infoDetails}>{prResource?.status}</div>
                </li>
                <li>
                    <div className={styles.infoTitle}> Created </div>
                    <div className={styles.infoDetails}>{formatDate(new Date(prResource?.created ?? ''))}</div>
                </li>
               <li>
           
                    <div className={styles.infoTitle}>Payment Issuer</div>
                    <div className={styles.infoDetails}>{prResource?.paymentIssuer?.display}</div>
                </li>
                <li>
                    <div className={styles.infoTitle}>Requestor</div>
                    <div className={styles.infoDetails}>{prResource?.requestor?.display}</div>
                </li>
                <li>
                    <div className={styles.infoTitle}>Payment Amount </div>
                    <div className={styles.infoDetails}>{prResource?.paymentAmount?.currency} {prResource?.paymentAmount?.value}</div>
                </li>
           </ul>
         </div>
         <div className={styles.prContent}>
            <div>
               <h6>Details</h6>
            </div>
            <div>
           <Table aria-label="details" size="sm">
                          <TableHead>
                            <TableRow>
                              <TableHeader>Type</TableHeader>
                              <TableHeader>Amount</TableHeader>
                            </TableRow>
                          </TableHead>
                          <TableBody>
                            {prResource?.detail && prResource?.detail.map((d, index) => (
                              <TableRow key={index}>
                                <TableCell>{d?.type?.coding ? d?.type?.coding[0]?.code : 'N/A'}</TableCell>
                                <TableCell>{d?.amount ? d?.amount?.currency : ''} { d?.amount ? d?.amount?.value : 0 }</TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                </Table>
            </div>
            
         </div>
    </div>
    </>
  );
};
export default PaymentReconciliation;