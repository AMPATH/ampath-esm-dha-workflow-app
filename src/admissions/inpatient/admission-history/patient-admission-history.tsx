import React, { useEffect, useMemo, useState } from 'react';
import { Table, TableHead, TableRow, TableHeader, TableBody, TableCell } from '@carbon/react';
import { getPatientEncounters } from '../../../shared/services/encounters.resource';
import { type Encounter, formatDate, parseDate } from '@openmrs/esm-framework';
import { AdmissionEncounterTypeUuids } from '../../constants';
interface PatientAdmissionHistoryProps {
  patientUuid: string;
}
const PatientAdmissionHistory: React.FC<PatientAdmissionHistoryProps> = ({ patientUuid }) => {
  const [encounters, setEncounters] = useState<Encounter[]>([]);
  const admissionEncounterTypes = useMemo(
    () =>
      Object.keys(AdmissionEncounterTypeUuids).map((k) => {
        return AdmissionEncounterTypeUuids[k];
      }),
    [patientUuid],
  );
  const admissionEncounters = useMemo(() => generateAdmissionEncounters(), [encounters, patientUuid]);

  useEffect(() => {
    if (!patientUuid) return;
    fetchPatientAdmissionHistory(patientUuid);
  }, [patientUuid]);

  async function fetchPatientAdmissionHistory(patientUuid: string) {
    const resp = await getPatientEncounters(patientUuid);
    setEncounters(resp);
  }

  function generateAdmissionEncounters(): Encounter[] {
    return encounters
      .filter((e) => {
        return admissionEncounterTypes.includes(e.encounterType.uuid);
      })
      .sort((a, b) => {
        return b.encounterDatetime.localeCompare(a.encounterDatetime);
      });
  }

  if (!patientUuid) {
    return <>No patient specified</>;
  }

  return (
    <>
      <Table aria-label="sample table" size="lg">
        <TableHead>
          <TableRow>
            <TableHeader>No</TableHeader>
            <TableHeader>Encounter</TableHeader>
            <TableHeader>Date</TableHeader>
            <TableHeader>Location</TableHeader>
          </TableRow>
        </TableHead>
        <TableBody>
          {admissionEncounters ? (
            admissionEncounters.map((encounter, index) => {
              return (
                <TableRow>
                  <TableCell>{index + 1}</TableCell>
                  <TableCell>{encounter?.display ?? ''}</TableCell>
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
    </>
  );
};

export default PatientAdmissionHistory;
