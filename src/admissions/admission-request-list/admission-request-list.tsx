import React, { useState } from 'react';
import { Button, OverflowMenu, OverflowMenuItem, Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@carbon/react';
import { BedLayout, Disposition } from '../types';
import AdmitPatientModal from '../modal/admit-patient/admit-patient.modal';
import { Patient } from '@openmrs/esm-framework';
import CancelAdmissionRequestModal from '../modal/cancel-admission-request/cancel-admission-request';

interface AdmissionListProps {
  admissionListData: Disposition[];
  bedLayouts: BedLayout[];
  refresh: ()=> void;
}

const AdmissionsRequestList: React.FC<AdmissionListProps> = ({ admissionListData, bedLayouts, refresh }) => {
  const [selectedPatient, setSelectedPatient] = useState<Patient>();
  const [selectedDisposition,setSelectedDisposition] = useState<Disposition>();
  const [showAdmitModal, setShowAdmitModal] = useState<boolean>(false);
  const [showCancelAdmissionModal, setShowCancelAdmissionModal] = useState<boolean>(false);
  if (!admissionListData || admissionListData.length === 0) {
    return <>No Data</>;
  }
  const handleCancelRequest = (disposition: Disposition) => {
    setSelectedDisposition(disposition);
    setShowCancelAdmissionModal(true);
  };
  const handleAdmitPatient = (disposition: Disposition) => {
    setShowAdmitModal(true);
    setSelectedPatient(disposition.patient);
    setSelectedDisposition(disposition);
  };
  const handleAdmitElsewhere = (disposition: Disposition) => {

  };
  const handleAdmitModalClose = () => {
    setShowAdmitModal(false);
  };
  const handeSuccessfullAdmission = () => {
    handleAdmitModalClose();
    refresh();
  };
  const handleCancelAdmissionClose = () => {
    setShowCancelAdmissionModal(false);
    refresh();
  };
  const handleCancelAdmissionSuccess = () => {
    handleCancelAdmissionClose();
  }
  return (
    <>
      <Table>
        <TableHead>
          <TableRow>
            <TableHeader>No</TableHeader>
            <TableHeader>Date</TableHeader>
            <TableHeader>Name</TableHeader>
            <TableHeader>Gender</TableHeader>
            <TableHeader>Age</TableHeader>
            <TableHeader>Bed No</TableHeader>
            <TableHeader>Action</TableHeader>
          </TableRow>
        </TableHead>

        <TableBody>
          {admissionListData &&
            admissionListData.map((val, index) => (
              <TableRow key={val.dispositionLocation.uuid ?? index}>
                <TableCell>{index + 1}</TableCell>
                <TableCell>{val.dispositionEncounter.encounterDatetime}</TableCell>
                <TableCell>{val.patient.person.display}</TableCell>
                <TableCell>{val.patient.person.gender}</TableCell>
                <TableCell>{val.patient.person.age}</TableCell>
                <TableCell>N/A</TableCell>
                <TableCell>
                  <>
                    <OverflowMenu aria-label="overflow-menu">
                      <OverflowMenuItem itemText="Cancel" onClick={() => handleCancelRequest(val)} />
                      <OverflowMenuItem itemText="Admit" onClick={() => handleAdmitPatient(val)} />
                      <OverflowMenuItem itemText="Admit Elsewhere" onClick={() => handleAdmitElsewhere(val)} />
                    </OverflowMenu>
                  </>
                </TableCell>
              </TableRow>
            ))}
        </TableBody>
      </Table>
      {
        showAdmitModal ? (<>
          <AdmitPatientModal
            onModalClose={handleAdmitModalClose}
            open={showAdmitModal}
            onSuccessfullAdmission={handeSuccessfullAdmission}
            disposition={selectedDisposition}
            bedLayouts={bedLayouts}
            />
        </>) : (<></>)
      }
      {
        showCancelAdmissionModal ? (<>
          <CancelAdmissionRequestModal
            open={showCancelAdmissionModal}
            onModalClose={handleCancelAdmissionClose}
            onCancelAdmission={handleCancelAdmissionSuccess}
            admissionRequest={selectedDisposition}
       
          />
        </>) : (<></>)
      }

    </>

  );
};

export default AdmissionsRequestList;