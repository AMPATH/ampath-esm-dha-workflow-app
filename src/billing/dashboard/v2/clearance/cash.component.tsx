import { Button, Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@carbon/react';
import { launchWorkspace2, useSession } from '@openmrs/esm-framework';
import React, { useCallback, useEffect, useState } from 'react';
import { type PendingBillLineItems, type ActiveCashVisit } from '../types';
import { getActiveCashVisits } from '../../../billing-claims.resource';
import { SEND_TO_QUEUE_WORKSPACE } from '../../../../registry/modal/send-to-triage/send-to-queue.modal';
import styles from './cash-patients.scss';

interface CashPatientsProps {
  billingDate: string;
}

const CashPatients: React.FC<CashPatientsProps> = ({ billingDate }) => {
  const [cashPatients, setCashPatients] = useState<ActiveCashVisit[]>([]);
  const [pendingBillItems, setPendingBillItems] = useState<PendingBillLineItems[]>([]);

  const session = useSession();

  const locationUuid = session.sessionLocation?.uuid;

  const fetchAll = useCallback(async () => {
    if (!locationUuid) return;
    try {
      const data = await getActiveCashVisits(locationUuid, billingDate);
      // const [visitsRes, pendingRes] = await Promise.all([
      //   getActiveCashVisits(locationUuid, billingDate),
      //   // getFacilityBillLineItems(locationUuid, billingDate),
      // ]);
      setCashPatients(data?.results ?? []);
      // setPendingBillItems(pendingRes ?? []);
    } catch (err) {
      console.error(err);
    }
  }, [billingDate, locationUuid]);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  const mergedPatients: (ActiveCashVisit | PendingBillLineItems)[] = (() => {
    const pendingByVisitUuid = new Map(pendingBillItems.map((item) => [item.visit_uuid, item]));

    const result: (ActiveCashVisit | PendingBillLineItems)[] = [...pendingBillItems];

    cashPatients.forEach((visit) => {
      if (!pendingByVisitUuid.has(visit.visit_uuid)) {
        result.push(visit);
      }
    });

    return result;
  })();

  const handleGenerateBill = (
    visit: ActiveCashVisit | PendingBillLineItems,
    patientUuid: string,
    visitTypeUuid: string,
    visitUuid: string,
    billUuid: string,
    cashModeUuid: string,
  ) => {
    if ('cash_point' in visit) {
      launchWorkspace2('pay-cash-workspace', {
        lineItems: visit.pending_line_items,
        billUuid: billUuid,
        cashModeUuid: cashModeUuid,
        onPaymentSuccess: fetchAll,
      });
      return;
    }

    void launchWorkspace2(SEND_TO_QUEUE_WORKSPACE, {
      workspaceTitle: 'Cash billing',
      patientUuid,
      visitUuid,
      visitTypeUuid,
      isCash: true,
      onModalClose,
    });
  };

  function onModalClose(result?: { success: boolean }): void {
    if (result?.success) {
      void fetchAll();
    }
  }
  return (
    <>
      <div className={styles.tableContainer}>
        <Table aria-label="sample table" size="sm">
          <TableHead>
            <TableRow>
              <TableHeader>Name</TableHeader>
              <TableHeader>Identifiers</TableHeader>
              <TableHeader>Payment Method</TableHeader>
              <TableHeader>Visit Type</TableHeader>
              <TableHeader>Actions</TableHeader>
            </TableRow>
          </TableHead>
          <TableBody>
            {mergedPatients?.length > 0 ? (
              mergedPatients?.map((visit, index) => (
                <TableRow key={index}>
                  <TableCell>{visit.patient_name}</TableCell>
                  <TableCell>{visit.identifiers}</TableCell>
                  <TableCell>{visit.payment_method}</TableCell>
                  <TableCell>{visit.visit_type}</TableCell>
                  <TableCell>
                    <Button
                      size="sm"
                      kind="primary"
                      onClick={() =>
                        handleGenerateBill(
                          visit,
                          visit.patient_uuid,
                          visit.visit_type_uuid,
                          visit.visit_uuid,
                          visit.bill_uuid,
                          visit.cash_mode_uuid,
                        )
                      }
                    >
                      Open Billing
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={5}>No Patients found</TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </>
  );
};

export default CashPatients;
