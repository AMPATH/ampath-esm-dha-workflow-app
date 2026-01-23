import React, { useEffect, useState } from 'react';
import styles from './admissions-dashboard.component.scss';
import StatCard from '../service-queues/service-queue/stats/stat-card/stat-card.component';
import { Tab, TabList, TabPanel, TabPanels, Tabs } from '@carbon/react';
import MchTriage from '../mch/queues/triage/mch-triage';
import MchConsultation from '../mch/queues/consultation/mch-consultation';
import { useSession } from '@openmrs/esm-framework';
import { getAdmissionLoactionData } from './admissions.resource';
import { type AdmissionLocationData } from './types';

const AdmissionsDashboard: React.FC = () => {
  const [dashboardData, setDashboardData] = useState<AdmissionLocationData>(null);
  const session = useSession();
  const locationUuid = session.sessionLocation.uuid;
  useEffect(() => {
    getDashboardData();
  }, [locationUuid]);
  const getDashboardData = async () => {
    const res = await getAdmissionLoactionData(locationUuid);
    setDashboardData(res);
    console.log('res', res);
    debugger;
  };
  const getFreeBeds = (dashboardData: AdmissionLocationData): number => {
    return (dashboardData?.totalBeds ?? 0) - (dashboardData.occupiedBeds ?? 0);
  };
  const getBedOccupancy = (dashboardData: AdmissionLocationData): number => {
    return (dashboardData?.occupiedBeds / dashboardData.totalBeds) * 100;
  };
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
              <Tab>{dashboardData?.ward?.display} Ward</Tab>
            </TabList>
            <TabPanels>
              <TabPanel></TabPanel>
            </TabPanels>
          </Tabs>
        </div>
      </div>
    </>
  );
};
export default AdmissionsDashboard;
