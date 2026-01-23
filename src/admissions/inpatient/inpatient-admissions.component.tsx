import React from 'react';
import { Tab, TabList, TabPanel, TabPanels, Tabs } from '@carbon/react';
import styles from './inpatient-admissions.component.scss';
import { usePatient } from '@openmrs/esm-framework';
import PatientAdmisssionRequests from './admission-requests/patient-admission-requests';
import PatientAdmissionHistory from './admission-history/patient-admission-history';
interface InpatientAdmissionsProps {}
const InpatientAdmissions: React.FC<InpatientAdmissionsProps> = () => {
  const { isLoading, error, patient } = usePatient();
  if (isLoading) return <div>Loading…</div>;
  if (error) return <div>Error loading patient</div>;
  return (
    <>
      <div className={styles.admissionsLayout}>
        <Tabs onTabCloseRequest={function rTe() {}}>
          <TabList scrollDebounceWait={200}>
            <Tab>Admission Requests</Tab>
            <Tab>Inpatient History</Tab>
          </TabList>
          <TabPanels>
            <TabPanel>
              {patient ? (
                <>
                  <PatientAdmisssionRequests patientUuid={patient.id} />
                </>
              ) : (
                <></>
              )}
            </TabPanel>
            <TabPanel>
              {patient ? (
                <>
                  <PatientAdmissionHistory patientUuid={patient.id} />
                </>
              ) : (
                <></>
              )}
            </TabPanel>
          </TabPanels>
        </Tabs>
      </div>
    </>
  );
};

export default InpatientAdmissions;
