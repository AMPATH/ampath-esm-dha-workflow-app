import React, { useEffect } from 'react';
import { useState } from 'react';
import { type FacilityBillsDto, BillingView, type PatientBill } from '../types';
import { Button, Table, TableBody, TableCell, TableHead, TableHeader, TableRow, Tag } from '@carbon/react';
import { showSnackbar } from '@openmrs/esm-framework';
import { fetchFacilityBills } from '../../../billing-claims.resource';
import styles from './facility-bills-v3.component.scss';
import PatientBillDetails from '../../v2/patient-bill-details/patient-bill-details';
import EmptyState from '../../v2/shared/empty-state.component';
import TableToolbar from '../../v2/shared/table-toolbar.component';


interface FacilityBillsV3Props {
  billingDate: string;
  locationUuid: string;
  onDateChange?: (value: string) => void;
}
const FacilityBillsV3: React.FC<FacilityBillsV3Props> = ({ billingDate, locationUuid, onDateChange }) => {
  const [facilityBills, setFacilityBills] = useState<PatientBill[]>([]);
  const [currentView, setCurrentView] = useState<BillingView>(BillingView.Bills);
  const [selectedPatientUuid, setSelectedPatientUuid] = useState<string>('');
  const [search, setSearch] = useState<string>('');
  useEffect(() => {
    if (locationUuid && billingDate) {
      getFacilityBills();
    }
  }, [billingDate, locationUuid]);
  async function getFacilityBills() {
    const facilityBillsPayload = generateFacilityBillsPayload();
    try {
      const data = await fetchFacilityBills(facilityBillsPayload);
      if (data) {
        setFacilityBills(data);
      } else {
        setFacilityBills([]);
      }
    } catch (error) {
      showSnackbar({
        kind: 'error',
        title: 'Error fetching facility bills',
        subtitle: 'An error occurred while fetehcing facility bills, please reload or contact support',
      });
    }
  }
  function generateFacilityBillsPayload(): FacilityBillsDto {
    return {
      locationUuid: locationUuid ?? '',
      billingDate: billingDate,
    };
  }

  function toggleView(newView: BillingView, patientUuid: string) {
    setCurrentView(newView);
    setSelectedPatientUuid(patientUuid);
  }
  function formatStatusColumn(status: string) {
    const statusArr = status.split(',');

    if (statusArr.length > 0) {
       const hasPostedBill = statusArr.some((s) => {
        return s === 'POSTED';
      });
      if(hasPostedBill){
        return 'PARTIALLY PAID'
      }
      const hasPendingBill = statusArr.some((s) => {
        return s === 'PENDING';
      });
      if (hasPendingBill) {
        return 'PENDING';
      }

      return 'PAID';
    } else {
      return status;
    }
  }
  const filteredBills = (facilityBills ?? []).filter((fb) => {
    const term = search.trim().toLowerCase();
    return (
      !term ||
      `${fb.patient_name} ${formatStatusColumn(fb.bill_status)} ${fb.cash_point}`.toLowerCase().includes(term)
    );
  });

  return (
    <>
      <TableToolbar
            id="facility-bills"
            search={search}
            onSearch={setSearch}
            searchPlaceholder="Search patient, status or cash point…"
            onDate={onDateChange}
      />
      {currentView === BillingView.Bills ? (
        (facilityBills ?? []).length === 0 ? (
          <EmptyState message="No bills." />
        ) : (
        <>
          {filteredBills.length === 0 ? (
            <EmptyState message="No bills match your search." />
          ) : (
            <Table aria-label="facility bills" size="sm">
              <TableHead>
                <TableRow>
                  <TableHeader>No</TableHeader>
                  <TableHeader>Date</TableHeader>
                  <TableHeader>Patient</TableHeader>
                  <TableHeader>Status</TableHeader>
                  <TableHeader>Cashpoint</TableHeader>
                </TableRow>
              </TableHead>
              <TableBody>
                {filteredBills.map((fb, index) => {
                  return (
                    <TableRow key={fb.patient_uuid}>
                      <TableCell>{index + 1}</TableCell>
                      <TableCell>{fb.bill_date}</TableCell>
                      <TableCell>
                        <div
                          className={styles.clickableData}
                          onClick={() => toggleView(BillingView.BillDetails, fb.patient_uuid)}
                        >
                          {fb.patient_name}
                        </div>
                      </TableCell>
                      <TableCell>
                        {(() => {
                          const s = formatStatusColumn(fb.bill_status);
                          const type = s === 'PAID' ? 'green' : s === 'PENDING' ? 'gray' : 'blue';
                          return (
                            <Tag size="sm" type={type}>
                              {s}
                            </Tag>
                          );
                        })()}
                      </TableCell>
                      <TableCell>{fb.cash_point}</TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </>
        )
      ) : (
        <></>
      )}
      {currentView === BillingView.BillDetails && selectedPatientUuid ? (
        <>
          <div>
            <Button kind="primary" onClick={() => toggleView(BillingView.Bills, '')}>
              Back
            </Button>
          </div>
          <div>
            <PatientBillDetails
              locationUuid={locationUuid}
              billingDate={billingDate}
              patientUuid={selectedPatientUuid}
            />
          </div>
        </>
      ) : (
        <></>
      )}
    </>
  );
};

export default FacilityBillsV3;