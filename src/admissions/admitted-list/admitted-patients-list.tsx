import React from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@carbon/react';
import { BedLayout } from '../types';

interface AdmittedPatientsListProps {
  admittedPatientsData: BedLayout[];
}

const AdmittedPatientsList: React.FC<AdmittedPatientsListProps> = ({ admittedPatientsData }) => {
  const rows =
    admittedPatientsData?.flatMap((layout) =>
      (layout.patients ?? []).map((patient) => ({
        key: `${layout.bedUuid}-${patient.uuid}`,
        bedNumber: layout.bedNumber,
        status: layout.status,
        location: layout.location,
        name: patient.person.display,
        gender: patient.person.gender,
        age: patient.person.age,
        identifier: patient.identifiers?.[0]?.identifier ?? 'N/A',
      })),
    ) ?? [];

  if (!rows.length) {
    return <>No Data</>;
  }

  return (
    <Table>
      <TableHead>
        <TableRow>
          <TableHeader>No</TableHeader>
          <TableHeader>Bed No</TableHeader>
          <TableHeader>Patient Name</TableHeader>
          <TableHeader>Gender</TableHeader>
          <TableHeader>Age</TableHeader>
          <TableHeader>Identifier</TableHeader>
          <TableHeader>Status</TableHeader>
          <TableHeader>Location</TableHeader>
        </TableRow>
      </TableHead>
      <TableBody>
        {rows.map((row, index) => (
          <TableRow key={row.key}>
            <TableCell>{index + 1}</TableCell>
            <TableCell>{row.bedNumber}</TableCell>
            <TableCell>{row.name}</TableCell>
            <TableCell>{row.gender}</TableCell>
            <TableCell>{row.age}</TableCell>
            <TableCell>{row.identifier}</TableCell>
            <TableCell>{row.status}</TableCell>
            <TableCell>{row.location}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
};

export default AdmittedPatientsList;

