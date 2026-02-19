import React, { useEffect, useState } from 'react';
import { DataTable, Table, TableHead, TableRow, TableHeader, TableBody, TableCell, Button } from '@carbon/react';
import { fetchPatientEncountersByType } from '../../../shared/services/encounters.resource';
import { formatDate, parseDate } from '@openmrs/esm-framework';
import styles from './patient-admission-requests.scss';

interface PatientAdmisssionRequestsProps {
  patientUuid: string;
}
const PatientAdmisssionRequests: React.FC<PatientAdmisssionRequestsProps> = ({ patientUuid }) => {
  const [encounters, setEncounters] = useState([]);

  useEffect(() => {
    if (!patientUuid) return;
    fetchPatientAdmissionRequests(patientUuid);
  }, [patientUuid]);

  async function fetchPatientAdmissionRequests(patientUuid: string) {
    const resp = await fetchPatientEncountersByType(patientUuid, 'b2c4d5e6-7f8a-4e9b-8c1d-2e3f8e4a3b8f');
    setEncounters(resp);
  }

  if (!patientUuid) {
    return <>No patient specified</>;
  }

  const recordAdmissionRequest = () => {};

  return (
    <>
      <div className={styles.admissionLayout}>
        <div className={styles.actionSection}>
          <Button kind="primary" onClick={recordAdmissionRequest} size="sm">
            + Record Admission Request
          </Button>
        </div>
        <div className={styles.contentSection}>
          <Table aria-label="sample table" size="lg">
            <TableHead>
              <TableRow>
                <TableHeader>No</TableHeader>
                <TableHeader>Form</TableHeader>
                <TableHeader>Encounter</TableHeader>
                <TableHeader>Date</TableHeader>
                <TableHeader>Location</TableHeader>
              </TableRow>
            </TableHead>
            <TableBody>
              {encounters ? (
                encounters.map((encounter, index) => {
                  return (
                    <TableRow>
                      <TableCell>{index + 1}</TableCell>
                      <TableCell>{encounter.form.display}</TableCell>
                      <TableCell>{encounter.display}</TableCell>
                      <TableCell>{formatDate(parseDate(encounter.encounterDatetime))}</TableCell>
                      <TableCell>{encounter.location.display}</TableCell>
                    </TableRow>
                  );
                })
              ) : (
                <></>
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </>
  );
};

export default PatientAdmisssionRequests;
