import React, { useEffect, useMemo } from 'react';
import { useState } from 'react';
import { type FacilityBillsDto, BillingView, ClaimProviderStatus } from '../types';
import {
  Button,
  ComboBox,
  InlineLoading,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  Tag,
  TextInput,
} from '@carbon/react';
import { showSnackbar } from '@openmrs/esm-framework';
import { fetchFacilityBills } from '../../../billing-claims.resource';
import styles from './facility-bills.component.scss';
import EmptyState from '../shared/empty-state.component';
import { type PatientBill } from '../../v2/types';
import PatientVisitDetailsComponent from '../patient-bill-details/patient-visit-details';
import { type TagColor } from 'src/types/types';

interface facilityBillsProps {
  billingDate: string;
  locationUuid: string;
  onDateChange?: (value: string) => void;
}
const FacilityBillsV3: React.FC<facilityBillsProps> = ({ billingDate, locationUuid, onDateChange }) => {
  const [facilityBills, setFacilityBills] = useState<PatientBill[]>([]);
  const [currentView, setCurrentView] = useState<BillingView>(BillingView.Bills);
  const [selectedPatientUuid, setSelectedPatientUuid] = useState<string>('');
  const [search, setSearch] = useState<string>('');
  const [selectedStatus, setSelectedStatus] = useState<string>('');
  const [searchString, setSearchString] = useState<string>();
  const [loading,setLoading] = useState<boolean>(false);
  const statusOptions = Object.values(ClaimProviderStatus).map((s) => {
    return {
      text: s,
      id: s,
    };
  });
  const filtedFacilityBills = useMemo(() => filterFacilityBills(facilityBills), [facilityBills, selectedStatus,searchString]);
  useEffect(() => {
    if (locationUuid && billingDate) {
      getFacilityBills();
    }
  }, [billingDate, locationUuid]);
  if(loading){
      return <><InlineLoading  description='Fetching data.. please wait!...'/></>
  }
  async function getFacilityBills() {
    setLoading(true);
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
    }finally{
      setLoading(false);
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
  function formatStatusColumn(status: string | null | undefined) {
    if (status == null || status === '') {
      return '—';
    }
    const statusArr = String(status)
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);

    if (statusArr.length > 0) {
      const hasPostedBill = statusArr.some((s) => {
        return s === 'POSTED';
      });
      if (hasPostedBill) {
        return 'PARTIALLY PAID';
      }
      const hasPendingBill = statusArr.some((s) => s === 'PENDING');
      if (hasPendingBill) {
        return 'PENDING';
      }

      return 'PAID';
    }
    return String(status);
  }

  const formatDate = (date?: string | null) => {
    if (!date) return '—';

    return new Intl.DateTimeFormat('en-KE', {
      year: 'numeric',
      month: 'short',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    }).format(new Date(date));
  };

  function statusChangeHandler(selectedStatus: { selectedItem: { id: string; text: string } }) {
    let status = '';
    if (selectedStatus && selectedStatus.selectedItem) {
      status = selectedStatus.selectedItem.id;
    }

    setSelectedStatus(status);
  }
  const getTagTypeByStatus = (status: string): TagColor => {
    let type: TagColor;
    switch (status) {
      case ClaimProviderStatus.Submitted:
        type = 'green';
        break;
      case ClaimProviderStatus.SubmissionReady:
        type = 'gray';
        break;
      case ClaimProviderStatus.FailedToSubmit:
        type = 'blue';
        break;
      case ClaimProviderStatus.Draft:
        type = 'gray';
        break;
      case ClaimProviderStatus.Closed:
        type = 'gray';
        break;
      case ClaimProviderStatus.TimeBarred:
        type = 'red';
        break;
      default:
        type = 'gray';
    }
    return type;
  };

  const handlBillsSearch = (searchTerm: string) => {
    setSearchString(searchTerm);
  };

  function filterFacilityBills(facilityBills: PatientBill[]) {
    return facilityBills.filter((b) => {
      if(!selectedStatus || selectedStatus === 'ALL'){
        return true;
      }
      return b.claim_status === selectedStatus;
    }).filter((b)=>{
      if(!searchString){
        return true;
      }
       const searchVal = searchString ? searchString.toLowerCase(): '';
       return b?.patient_name.trim().toLowerCase().includes(searchVal) || b.cr_id?.trim().toLowerCase().includes(searchVal);
    });
  }
  function handleResetFilters(){
     setSearchString('')
     setSelectedStatus('ALL');
  }
  function handleRefresh(){
      getFacilityBills();
  }

  return (
    <>
      <div className={styles.filterRow}>
        <div className={styles.filter}>
          <ComboBox
            onChange={statusChangeHandler}
            id="queue-status-combobox"
            items={[
              {
                text: 'ALL',
                id: 'ALL',
              },
              ...statusOptions,
            ]}
            itemToString={(item) => (item ? item.text : '')}
            titleText="Claim Status"
            value={selectedStatus}
          />
        </div>
        <div className={styles.filter}>
          <TextInput
            id="queue-search"
            labelText="Name/Identifier"
            onChange={(e) => handlBillsSearch (e.target.value)}
            placeholder="Enter patient name or identifier to filter"
            value={searchString}
          />
        </div>
         <div className={styles.actionCol}>
             <Button kind='secondary' onClick={handleResetFilters}>Reset Filters</Button>
             <Button kind='tertiary' onClick={handleRefresh}>Refresh</Button>
         </div>
      </div>
      {currentView === BillingView.Bills ? (
        (filtedFacilityBills ?? []).length === 0 ? (
          <EmptyState message="No bills." />
        ) : (
          <>
            {filtedFacilityBills.length === 0 ? (
              <EmptyState message="No bills match your search." />
            ) : (
              <Table aria-label="facility bills" size="sm">
                <TableHead>
                  <TableRow>
                    <TableHeader>No</TableHeader>
                    <TableHeader>Date</TableHeader>
                    <TableHeader>Patient</TableHeader>
                    <TableHeader> Claim Status</TableHeader>
                    <TableHeader> Cash Status</TableHeader>
                    <TableHeader>Identifier</TableHeader>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {filtedFacilityBills.map((fb, index) => {
                    return (
                      <TableRow key={fb.patient_uuid}>
                        <TableCell>{index + 1}</TableCell>
                        <TableCell>{formatDate(fb.visit_start_date)}</TableCell>
                        <TableCell>
                          <div
                            className={styles.clickableData}
                            onClick={() => toggleView(BillingView.BillDetails, fb.patient_uuid)}
                          >
                            {fb.patient_name}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Tag type={getTagTypeByStatus(fb?.claim_status ?? '')}>{fb.claim_status}</Tag>
                        </TableCell>
                        <TableCell>
                          {(() => {
                            const s = formatStatusColumn(fb.paid_status);
                            const type = s === 'PAID' ? 'green' : s === 'PENDING' ? 'gray' : 'blue';
                            return (
                              <Tag size="sm" type={type}>
                                {s}
                              </Tag>
                            );
                          })()}
                        </TableCell>
                        <TableCell>{fb.cr_id}</TableCell>
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
            <PatientVisitDetailsComponent
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
