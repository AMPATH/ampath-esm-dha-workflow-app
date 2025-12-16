import React from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@carbon/react';
import { type DailyBookingsResult } from '../../types';

interface DailiyBookingsPatientListProps {
  patientListData: DailyBookingsResult[];
}
const DailiyBookingsPatientList: React.FC<DailiyBookingsPatientListProps> = ({ patientListData }) => {
  if (!patientListData || patientListData.length === 0) {
    return <>No Data</>;
  }
  return (
    <>
      <Table>
        <TableHead>
          <TableRow>
            <TableHeader>No</TableHeader>
            <TableHeader>CCC Number</TableHeader>
            <TableHeader>UPI Number</TableHeader>
            <TableHeader>Program</TableHeader>
            <TableHeader>RTC Date</TableHeader>
            <TableHeader>Med Pickup Date</TableHeader>
            <TableHeader>ARV Start Date</TableHeader>
            <TableHeader>HIV Disclosure Status</TableHeader>
            <TableHeader>Height</TableHeader>
            <TableHeader>Weight</TableHeader>
            <TableHeader>Stage</TableHeader>
            <TableHeader>Patient Categorization</TableHeader>
            <TableHeader>Service Delivery Model</TableHeader>
            <TableHeader>DSD Model</TableHeader>
            <TableHeader>CD4 Date</TableHeader>
            <TableHeader>CD4 Results</TableHeader>
            <TableHeader>Gender</TableHeader>
            <TableHeader>Birthdate</TableHeader>
            <TableHeader>Age</TableHeader>
            <TableHeader>Patient Name</TableHeader>
            <TableHeader>Identifiers</TableHeader>
            <TableHeader>Phone Number</TableHeader>
            <TableHeader>Latest RTC Date</TableHeader>
            <TableHeader>Latest VL</TableHeader>
            <TableHeader>VL Category</TableHeader>
            <TableHeader>Latest VL Date</TableHeader>
            <TableHeader>Last Appointment</TableHeader>
            <TableHeader>Visit Type</TableHeader>
            <TableHeader>Current Meds</TableHeader>
            <TableHeader>Covid-19 Vaccination</TableHeader>
            <TableHeader>TB Screening Date</TableHeader>
            <TableHeader>TB Screening Result</TableHeader>
            <TableHeader>Patient Category</TableHeader>
          </TableRow>
        </TableHead>

        <TableBody>
          {patientListData &&
            patientListData.map((val, index) => (
              <TableRow key={val.patient_uuid ?? index}>
                <TableCell>{index + 1}</TableCell>
                <TableCell>{val.ccc_number}</TableCell>
                <TableCell>{val.upi_number}</TableCell>
                <TableCell>{val.program}</TableCell>
                <TableCell>{val.rtc_date}</TableCell>
                <TableCell>{val.med_pick_up_date}</TableCell>
                <TableCell>{val.arv_first_regimen_start_date}</TableCell>
                <TableCell>{val.hiv_disclosure_status}</TableCell>
                <TableCell>{val.height}</TableCell>
                <TableCell>{val.weight}</TableCell>
                <TableCell>{val.stage}</TableCell>
                <TableCell>{val.patient_categorization}</TableCell>
                <TableCell>{val.service_delivery_model}</TableCell>
                <TableCell>{val.dsd_model}</TableCell>
                <TableCell>{val.cd4_date}</TableCell>
                <TableCell>{val.cd4_results}</TableCell>
                <TableCell>{val.gender}</TableCell>
                <TableCell>{val.birthdate}</TableCell>
                <TableCell>{val.age}</TableCell>
                <TableCell>{val.person_name}</TableCell>
                <TableCell>{val.identifiers}</TableCell>
                <TableCell>{val.phone_number}</TableCell>
                <TableCell>{val.latest_rtc_date}</TableCell>
                <TableCell>{val.latest_vl}</TableCell>
                <TableCell>{val.vl_category}</TableCell>
                <TableCell>{val.latest_vl_date}</TableCell>
                <TableCell>{val.last_appointment}</TableCell>
                <TableCell>{val.visit_type}</TableCell>
                <TableCell>{val.cur_meds}</TableCell>
                <TableCell>{val.covid_19_vaccination_status}</TableCell>
                <TableCell>{val.tb_screening_date}</TableCell>
                <TableCell>{val.tb_screening_result}</TableCell>
                <TableCell>{val.patient_category}</TableCell>
              </TableRow>
            ))}
        </TableBody>
      </Table>
    </>
  );
};
export default DailiyBookingsPatientList;
