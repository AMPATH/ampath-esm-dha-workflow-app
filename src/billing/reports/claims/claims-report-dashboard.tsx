import React, { useState } from 'react';
import styles from './claims-report-dashboard.scss';
import { Button, DatePicker, DatePickerInput } from '@carbon/react';
import { type ClaimSummary, type ClaimsReportSummaryDto } from '../../../billing/types';
import { showSnackbar, useSession } from '@openmrs/esm-framework';
import { fethClaimSummaryReport } from '../../../billing/billing-claims.resource';
import ClaimSummaryData from './summary-data/summary-data';
const ClaimsReportDashboard: React.FC = () => {
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [claimSummary,setClaimSummary] = useState<ClaimSummary[]>();
  const session = useSession();
  const locationUuid = session?.sessionLocation?.uuid ?? '';
  function handleStartDateChange(startDate: string) {
    setStartDate(startDate);
  }
  function handleEndDateChange(startDate: string) {
    setEndDate(startDate);
  }
  async function handleGenerateReport() {
    const claimsSummaryDto = generateReportPayload();
    if(isValidClaimsSummaryDto(claimsSummaryDto)){
       try{
         const resp = await fethClaimSummaryReport(claimsSummaryDto);
         if(resp){
            setClaimSummary(resp);
         }else{
            setClaimSummary([]);
         }
       }catch(error){
          showSnackbar({
            title: 'Error generating summary report',
            subtitle: 'An error occurred while generating the report.Kindly retry or contact support',
            kind: 'error',
          });
       }
    }
  }
  function generateReportPayload(): ClaimsReportSummaryDto {
    return {
      startDate: startDate,
      endDate: endDate,
      locationUuid: locationUuid,
    };
  }
  function isValidClaimsSummaryDto(claimsReportSummaryDto: ClaimsReportSummaryDto) {
    if (!claimsReportSummaryDto.startDate) {
      showSnackbar({
        title: 'Missing Start Date',
        subtitle: 'Please ensure you have selected the start date',
        kind: 'error',
      });
      return false;
    }
    if (!claimsReportSummaryDto.endDate) {
      showSnackbar({
        title: 'Missing End Date',
        subtitle: 'Please ensure you have selected the start date',
        kind: 'error',
      });
      return false;
    }
    if (!claimsReportSummaryDto.locationUuid) {
      showSnackbar({
        title: 'Missing Location',
        subtitle: 'Please ensure you have selected a location',
        kind: 'error',
      });
      return false;
    }
    return true;
  }
  function handleResetFilters() {
    setStartDate('');
    setEndDate('');
    setClaimSummary([]);
  }
  return (
    <>
      <div className={styles.claimReportLayout}>
        <div className={styles.claimReportHeader}>
          <div className={styles.claimReportTitle}>
            <h6>Claims Report</h6>
          </div>
          <div className={styles.claimReportFilters}>
            <div className={styles.filter}>
              <DatePicker
                className={styles.tabRowDate}
                datePickerType="single"
                dateFormat="Y-m-d"
                value={startDate}
                onChange={(dates) =>
                  handleStartDateChange(dates?.[0] ? (dates[0] as Date).toLocaleDateString('en-CA') : '')
                }
              >
                <DatePickerInput id="start-date" labelText="Start Date" placeholder="yyyy-mm-dd" size="sm" />
              </DatePicker>
            </div>
            <div className={styles.filter}>
              <DatePicker
                className={styles.tabRowDate}
                datePickerType="single"
                dateFormat="Y-m-d"
                value={endDate}
                onChange={(dates) =>
                  handleEndDateChange(dates?.[0] ? (dates[0] as Date).toLocaleDateString('en-CA') : '')
                }
              >
                <DatePickerInput id="end-date" labelText="End Date" placeholder="yyyy-mm-dd" size="sm" />
              </DatePicker>
            </div>
            <div className={styles.actionCol}>
              <Button kind="primary" onClick={handleGenerateReport}>
                Generate
              </Button>
              <Button kind="secondary" onClick={handleResetFilters}>
                Reset
              </Button>
            </div>
          </div>
        </div>
        <div className={styles.claimReportBody}>
             {
              claimSummary &&  <ClaimSummaryData 
              claimSummary={claimSummary}
              locationUuid={locationUuid}
              endDate={endDate}
              startDate={startDate}
              />
            }
        </div>
      </div>
    </>
  );
};
export default ClaimsReportDashboard;
