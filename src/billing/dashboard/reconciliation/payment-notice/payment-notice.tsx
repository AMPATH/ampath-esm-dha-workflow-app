import React from "react";
import { type PaymentNoticeResource } from "../types";
import styles from './payment-notice.scss';
import {
  Table,
  TableHead,
  TableHeader,
  TableBody,
  TableRow,
  TableCell,
} from '@carbon/react';
import { formatDate, parseDate } from "@openmrs/esm-framework";

interface PaymentNoticeProps {
    pResource?: PaymentNoticeResource
}
const PaymentNotice: React.FC<PaymentNoticeProps> = ({pResource})=>{
 

  return (
    <>
    <div className={styles.prLayout}>
         <div className={styles.prHeader}>
            <ul className={styles.prHeaderInfo}>
                <li>
                    <div className={styles.infoTitle}>Status</div>
                    <div className={styles.infoDetails}>{pResource?.status}</div>
                </li>
                <li>
                    <div className={styles.infoTitle}>Last Update</div>
                    <div className={styles.infoDetails}>{formatDate(parseDate(pResource?.meta?.lastUpdated ?? '')) ?? ''}</div>
                </li>
                <li>
                    <div className={styles.infoTitle}> Created </div>
                    <div className={styles.infoDetails}>{formatDate(new Date(pResource?.created ?? ''))}</div>
                </li>
               <li>
           
                    <div className={styles.infoTitle}>Provider</div>
                    <div className={styles.infoDetails}>{pResource?.provider?.display}</div>
                </li>
                <li>
                    <div className={styles.infoTitle}>Payee</div>
                    <div className={styles.infoDetails}>{pResource?.payee?.display}</div>
                </li>
                <li>
                    <div className={styles.infoTitle}>Recipient</div>
                    <div className={styles.infoDetails}>{pResource?.recipient?.display}</div>
                </li>
                 <li>
                    <div className={styles.infoTitle}>Amount</div>
                    <div className={styles.infoDetails}>{pResource?.amount?.currency} {pResource?.amount?.value}</div>
                </li>
           </ul>
         </div>
         <div className={styles.prContent}>
            <div>
               <h6>Payment Status</h6>
            </div>
            <div>
           <Table aria-label="details" size="sm">
                          <TableHead>
                            <TableRow>
                              <TableHeader>Status</TableHeader>
                            </TableRow>
                          </TableHead>
                          <TableBody>
                            {pResource?.paymentStatus && pResource?.paymentStatus.coding?.map((ps, index) => (
                              <TableRow key={index}>
                                <TableCell>{ps?.display ?? 'N/A'}</TableCell>
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
export default PaymentNotice;