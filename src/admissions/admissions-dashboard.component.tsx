import React, { useEffect, useState } from 'react';
import styles from './admissions-dashboard.component.scss';
import StatCard from '../service-queues/service-queue/stats/stat-card/stat-card.component';
import { Tab, TabList, TabPanel, TabPanels, Tabs } from '@carbon/react';
import { useSession } from '@openmrs/esm-framework';
import { getAdmissionLoactionData, getAdmissionRequests, getAdmittedPatientsData } from './admissions.resource';
import { type Disposition, type AdmissionLocationData, BedLayout } from './types';
import AdmittedPatientsList from './admitted-list/admitted-patients-list';
import AdmissionsRequestList from './admission-request-list/admission-request-list';

const AdmissionsDashboard: React.FC = () => {
  const [dashboardData, setDashboardData] = useState<AdmissionLocationData>(null);
  const [admissionListData, setAdmissionListData] = useState<Disposition[]>([]);
  const [admittedPatientsData, setAdmittedPatientsData] = useState<BedLayout[]>([]);
  const session = useSession();
  const locationUuid = session.sessionLocation.uuid;
  useEffect(() => {
      fetchData();
  }, [locationUuid]);
  const fetchData = ()=>{
    getDashboardData();
    getAdmissionListData();
    getAdmittedPatients();
  }
  const getDashboardData = async () => {
    const res = await getAdmissionLoactionData(locationUuid);
    setDashboardData(res);
  };
  const getFreeBeds = (dashboardData: AdmissionLocationData): number => {
    return (dashboardData?.totalBeds ?? 0) - (dashboardData.occupiedBeds ?? 0);
  };
  const getBedOccupancy = (dashboardData: AdmissionLocationData): number => {
    return parseFloat(((dashboardData?.occupiedBeds / dashboardData.totalBeds) * 100).toFixed(2));
  };
  const getAdmissionListData = async () => {
    const res = await getAdmissionRequests(locationUuid);
    setAdmissionListData(res);
  };
  const getAdmittedPatients = async () => {
    const res = await getAdmittedPatientsData(locationUuid); 
    setAdmittedPatientsData(res);
  };   
  const handleRefresh = ()=>{
      fetchData();
  }     
  return (
    <>
      <div className={styles.admissionsLayout}>
        <div className={styles.headerSection}>
          <h4>Admissions</h4>
        </div>
        <div className={styles.statsSection}>
          <>
            {dashboardData ? (
              <>
                <StatCard title="Number of beds" count={dashboardData.totalBeds} />
                <StatCard title="Admitted Patients" count={dashboardData.occupiedBeds} />
                <StatCard title="Free Beds" count={getFreeBeds(dashboardData)} />
                <StatCard title="Bed Occupancy" count={getBedOccupancy(dashboardData)} other="%" />
              </>
            ) : (
              <></>
            )}
          </>
        </div>
        <div className={styles.contentSection}>
          <Tabs>
            <TabList contained>
              <Tab>Admission Requests</Tab>
              <Tab>Admitted</Tab>
              <Tab>Discharged</Tab>
            </TabList>
              <TabPanels>
                <TabPanel>
                  {admissionListData ? <AdmissionsRequestList 
                  admissionListData={admissionListData} 
                  bedLayouts={admittedPatientsData}
                  refresh={handleRefresh}
                  /> : <></>}
                </TabPanel>
                <TabPanel>
                  {admittedPatientsData ? 
                  <AdmittedPatientsList 
                  admittedPatientsData={admittedPatientsData} 
                  refresh={handleRefresh}
                  /> : <></>}
                </TabPanel>
                <TabPanel></TabPanel>
              </TabPanels>
          </Tabs>
        </div>
      </div>
    </>
  );
};
export default AdmissionsDashboard;