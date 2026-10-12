import React, { useMemo, useState } from 'react';
import { Button, InlineLoading, Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@carbon/react';
import styles from './summary-data.scss';
import { type ClaimVisit, type ClaimsReportSummaryListDto, type ClaimSummary } from '../../../../billing/types';
import { fethClaimSummaryReportList } from '../../../../billing/billing-claims.resource';
import { formatDate, parseDate, showSnackbar } from '@openmrs/esm-framework';
import ClaimDetailsModal from '../../../../billing/dashboard/v3/patient-bill-details/modals/claim-details/claim-details.modal';

interface claimSummaryProps {
  claimSummary: ClaimSummary[];
  locationUuid: string;
  startDate: string;
  endDate: string;
}
const ClaimSummaryData: React.FC<claimSummaryProps> = ({ claimSummary, locationUuid, startDate, endDate }) => {
  const [claimVisits, setClaimVisits] = useState<ClaimVisit[]>();
  const [loading, setLoading] = useState<boolean>(false);
  const [showClaimsVisitModal, setShowClaimsVisitModal] = useState<boolean>(false);
  const [selectedClaimVisit, setSelectedClaimVisit] = useState<ClaimVisit | null>(null);
  const totalNoOfClaims = useMemo(()=>getTotalClaimNo(claimSummary),[claimSummary]);
  const totalNoOfClaimAmount = useMemo(()=>getTotalClaimAmount(claimSummary),[claimSummary]);
  async function fetchClaimSummaryList(claimSummary: ClaimSummary) {
    setLoading(true);
    const claimSummaryListDto = generateClaimSummaryReportListPayload(claimSummary);
    try {
      const resp = await fethClaimSummaryReportList(claimSummaryListDto);
      if (resp) {
        setClaimVisits(resp);
      }
    } catch (error) {
      showSnackbar({
        kind: 'error',
        title: 'Error fetching claim summary list',
        subtitle: 'Error fetching claim summary list',
      });
    } finally {
      setLoading(false);
    }
  };
  function generateClaimSummaryReportListPayload(claimSummary: ClaimSummary): ClaimsReportSummaryListDto {
    const payload: ClaimsReportSummaryListDto = {
      startDate: startDate,
      endDate: endDate,
      locationUuid: locationUuid,
    };
    if (claimSummary.provider_status) {
      payload['providerStatus'] = claimSummary.provider_status;
    }
    if (claimSummary.payer_status) {
      payload['payerStatus'] = claimSummary.payer_status;
    }
    return payload;
  }
  function handleSelectedClaimsVisit(claimVisit: ClaimVisit) {
    setSelectedClaimVisit(claimVisit);
    setShowClaimsVisitModal(true);
  }
  function handleCloseClaimsModal() {
    setShowClaimsVisitModal(false);
    setSelectedClaimVisit(null);
  }
  function getTotalClaimNo(claimSummary: ClaimSummary[]) {
    if (!claimSummary || claimSummary.length === 0) {
      return 0;
    }
    return claimSummary.reduce((sum: number, item: ClaimSummary) => sum + Number(item.total), 0);
  }
  function getTotalClaimAmount(claimSummary: ClaimSummary[]) {
    if (!claimSummary || claimSummary.length === 0) {
      return 0;
    }
    return claimSummary.reduce((sum: number, item: ClaimSummary) => sum + Number(item.total_claim_amount), 0);
  }
  return (
    <>
      <div className={styles.claimSummaryLayout}>
        <div className={styles.claimSummary}>
          <div className={styles.headerRow}>
            <h4>Claims Summary</h4>
          </div>
          <div className={styles.bodyRow}>
            <Table aria-label="Claims Summary" size="md">
              <TableHead>
                <TableRow>
                  <TableHeader>No</TableHeader>
                  <TableHeader>Provider Status</TableHeader>
                  <TableHeader>Payer Status</TableHeader>
                  <TableHeader>No of Claims</TableHeader>
                  <TableHeader>Total Claim Amount (KES)</TableHeader>
                </TableRow>
              </TableHead>
              <TableBody>
                {claimSummary.map((cs, index) => {
                  return (
                    <TableRow key={cs.provider_status}>
                      <TableCell>{index + 1}</TableCell>
                      <TableCell>{cs?.provider_status ?? ''}</TableCell>
                      <TableCell>{cs?.payer_status ?? ''}</TableCell>
                      <TableCell>
                        <span className={styles.claimSummaryVal} onClick={() => fetchClaimSummaryList(cs)}>
                          {cs?.total ?? 0}
                        </span>
                      </TableCell>
                      <TableCell>{cs?.total_claim_amount ?? ''}</TableCell>
                    </TableRow>
                  );
                })}
                <TableRow>
                      <TableCell>Totals</TableCell>
                      <TableCell></TableCell>
                      <TableCell></TableCell>
                      <TableCell>{totalNoOfClaims ?? 0}</TableCell>
                      <TableCell>{totalNoOfClaimAmount ?? 0}</TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </div>
        </div>
        <div className={styles.claimSummaryList}>
          <div className={styles.headerRow}>
            <h4>Claims List</h4>
          </div>
          <div>
            {claimVisits && claimSummary.length > 0 && !loading && (
              <Table aria-label="claim visits" size="sm">
                <TableHead>
                  <TableRow>
                    <TableHeader>No</TableHeader>
                    <TableHeader>Date</TableHeader>
                    <TableHeader>Patient</TableHeader>
                    <TableHeader>Service Type</TableHeader>
                    <TableHeader>Total Claim Amount</TableHeader>
                    <TableHeader>Provider Status</TableHeader>
                    <TableHeader>Payer Status</TableHeader>
                    <TableHeader>Action</TableHeader>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {claimVisits &&
                    claimVisits.map((cv, index) => {
                      return (
                        <>
                          <TableRow key={cv.id}>
                            <TableCell>{index + 1}</TableCell>
                            <TableCell>{formatDate(parseDate(cv.visitStart))}</TableCell>
                            <TableCell>
                              <div>{cv.patientId}</div>
                            </TableCell>
                            <TableCell>{cv.serviceType}</TableCell>
                            <TableCell>KES {cv.totalClaimAmount}</TableCell>
                            <TableCell>{cv.providerStatus}</TableCell>
                            <TableCell>{cv.payerStatus}</TableCell>
                            <TableCell>
                              <Button kind="ghost" onClick={() => handleSelectedClaimsVisit(cv)} size="sm">
                                View
                              </Button>
                            </TableCell>
                          </TableRow>
                        </>
                      );
                    })}
                </TableBody>
              </Table>
            )}
            {loading && <InlineLoading description="Fetching data...." />}
          </div>
        </div>
      </div>
      <div>
        {showClaimsVisitModal && selectedClaimVisit ? (
          <ClaimDetailsModal
            open={showClaimsVisitModal}
            consentToken={selectedClaimVisit?.authorizationCode ?? ''}
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
export default ClaimSummaryData;
