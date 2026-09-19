import React, { useEffect, useMemo, useState } from 'react';
import styles from './claim-visits.component.scss';
import { fetchFacilityClaimVisits } from '../../../../billing-claims.resource';
import { type ClaimVisitReponse, type ClaimVisitsDto } from '../../types';
import { formatDate, parseDate, showSnackbar } from '@openmrs/esm-framework';
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
import ClaimDetailsModal from '../../../../../billing/dashboard/v3/patient-bill-details/modals/claim-details/claim-details.modal';
import { ClaimPayerStatus, ClaimProviderStatus } from '../../../../../billing/dashboard/v3/types';
import { type TagColor } from 'src/types/types';
interface claimVisitsProps {
  locationUuid: string;
  billingDate: string;
  onDateChange?: (value: string) => void;
}
const ClaimVisits: React.FC<claimVisitsProps> = ({ locationUuid, billingDate, onDateChange }) => {
  const [claimVisits, setClaimVisits] = useState<ClaimVisitReponse[]>();
  const [showClaimsVisitModal, setShowClaimsVisitModal] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(false);
  const [consentToken, setConsentToken] = useState<string>();
  const [selectedProviderStatus, setSelectedProviderStatus] = useState<string>('');
  const [selectedPayerStatus, setSelectedPayerStatus] = useState<string>('');
  const [searchString, setSearchString] = useState<string>();
  const providerStatusOptions = Object.values(ClaimProviderStatus).map((s) => {
      return {
        text: s,
        id: s,
      };
  });
  const payerStatusOptions = Object.values(ClaimPayerStatus).map((s) => {
      return {
        text: s,
        id: s,
      };
  });
  const filteredClaimVisits = useMemo(() => filterClaimsVisits(claimVisits ?? []), [claimVisits, selectedProviderStatus, selectedPayerStatus, searchString]);
  useEffect(() => {
    if (locationUuid && billingDate) {
      getFacilityClaimVisits();
    }
  }, [locationUuid, billingDate]);
  if (!locationUuid || !billingDate) {
    return <></>;
  }
  function generateClaimsVisitPayload(): ClaimVisitsDto {
    return {
      locationUuid: locationUuid ?? '',
      visitDate: billingDate,
    };
  }
  async function getFacilityClaimVisits() {
    setLoading(true);
    const facilityClaimsVisitsPayload = generateClaimsVisitPayload();
    try {
      const data = await fetchFacilityClaimVisits(facilityClaimsVisitsPayload);
      if (data) {
        setClaimVisits(data);
      }
    } catch (error) {
      showSnackbar({
        kind: 'error',
        title: 'Error fetching facility bills',
        subtitle: 'An error occurred while fetehcing facility bills, please reload or contact support',
      });
    } finally {
      setLoading(false);
    }
  }
  async function handleSelectedClaimsVisit(selectedVisit: ClaimVisitReponse) {
    setConsentToken(selectedVisit.authorizationCode);
    setShowClaimsVisitModal(true);
  }
  function handleCloseClaimsModal() {
    setShowClaimsVisitModal(false);
  }
  function providerStatusChangeHandler(selectedStatus: { selectedItem: { id: string; text: string } }) {
      let status = '';
      if (selectedStatus && selectedStatus.selectedItem) {
        status = selectedStatus.selectedItem.id;
      }
  
      setSelectedProviderStatus(status);
  }
  function payerStatusChangeHandler(selectedStatus: { selectedItem: { id: string; text: string } }) {
      let status = '';
      if (selectedStatus && selectedStatus.selectedItem) {
        status = selectedStatus.selectedItem.id;
      }
  
      setSelectedPayerStatus(status);
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
  
    const handleVisitsSearch = (searchTerm: string) => {
      setSearchString(searchTerm);
    };
  
  function filterClaimsVisits(claimVisits: ClaimVisitReponse[]) {
      return claimVisits.filter((b) => {
        if(!selectedProviderStatus || selectedProviderStatus === 'ALL'){
          return true;
        }
        return b.providerStatus === selectedProviderStatus;
      }).filter((b)=>{
        if(!searchString){
          return true;
        }
         const searchVal = searchString ? searchString.toLowerCase(): '';
         return b.patientId?.trim().toLowerCase().includes(searchVal);
      }).filter((b) => {
        if(!selectedPayerStatus || selectedPayerStatus === 'ALL'){
          return true;
        }
        return b.payerStatus === selectedPayerStatus;
      })
    }
    function handleResetFilters(){
       setSearchString('')
       setSelectedProviderStatus('ALL');
       setSelectedPayerStatus('ALL');
    }
    function handleRefresh(){
        getFacilityClaimVisits();
    }
  return (
    <>
      <div className={styles.claimVisitsLayout}>
        <div className={styles.filterRow}>
        <div className={styles.filter}>
          <ComboBox
            onChange={providerStatusChangeHandler}
            id="provider-status-combobox"
            items={[
              {
                text: 'ALL',
                id: 'ALL',
              },
              ...providerStatusOptions,
            ]}
            itemToString={(item) => (item ? item.text : '')}
            titleText="Claim Provider Status"
            value={selectedProviderStatus}
          />
        </div>
         <div className={styles.filter}>
          <ComboBox
            onChange={payerStatusChangeHandler}
            id="payer-status-combobox"
            items={[
              {
                text: 'ALL',
                id: 'ALL',
              },
              ...payerStatusOptions,
            ]}
            itemToString={(item) => (item ? item.text : '')}
            titleText="Claim Payer Status"
            value={selectedPayerStatus}
          />
        </div>
        <div className={styles.filter}>
          <TextInput
            id="queue-search"
            labelText="Identifier"
            onChange={(e) => handleVisitsSearch(e.target.value)}
            placeholder="Enter patient identifier to filter"
             value={searchString}
          />
        </div>
         <div className={styles.actionCol}>
             <Button kind='secondary' onClick={handleResetFilters}>Reset Filters</Button>
             <Button kind='tertiary' onClick={handleRefresh}>Refresh</Button>
         </div>
      </div>
      <div>
        <Table aria-label="claim visits" size="sm">
          <TableHead>
            <TableRow>
              <TableHeader>No</TableHeader>
              <TableHeader>Date</TableHeader>
              <TableHeader>Patient</TableHeader>
              <TableHeader>Service Type</TableHeader>
              <TableHeader>Provider Status</TableHeader>
              <TableHeader>Payer Status</TableHeader>
              <TableHeader>Action</TableHeader>
            </TableRow>
          </TableHead>
          <TableBody>
            { filteredClaimVisits && filteredClaimVisits.map((cv, index) => {
                return (
                  <>
                    <TableRow key={cv.id}>
                      <TableCell>{index + 1}</TableCell>
                      <TableCell>{formatDate(parseDate(cv.visitStart))}</TableCell>
                      <TableCell>
                        <div>{cv.patientId}</div>
                      </TableCell>
                      <TableCell>{cv.serviceType}</TableCell>
                      <TableCell>
                         <Tag type={getTagTypeByStatus(cv.providerStatus ?? '')}>{cv.providerStatus}</Tag>
                      </TableCell>
                       <TableCell>{cv.payerStatus}</TableCell>
                      <TableCell>
                        <Button kind="ghost" onClick={() => handleSelectedClaimsVisit(cv)} size="sm">
                          {loading ? <InlineLoading description="Fetching data...." /> : 'View'}
                        </Button>
                      </TableCell>
                    </TableRow>
                  </>
                );
              })}
          </TableBody>
        </Table>
        </div>
        {showClaimsVisitModal && consentToken ? (
          <ClaimDetailsModal
            open={showClaimsVisitModal}
            consentToken={consentToken}
            onClose={handleCloseClaimsModal}
            locationUuid={locationUuid}
          />
        ) : (
          <></>
        )}
      </div>
    </>
  );
};

export default ClaimVisits;
