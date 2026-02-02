import { Tab, TabList, TabPanel, TabPanels, Tabs } from '@carbon/react';
import React from 'react';
import AdminQueueList from './queue/queue-list/queue-list';
import styles from './service-queue-admin-dashboard.component.scss';
import QueueRoomList from './queue-room/queue-room-list/queue-room-list';
interface ServiceQueueAdminDashboardProps {}
const ServiceQueueAdminDashboard: React.FC<ServiceQueueAdminDashboardProps> = () => {
  return (
    <>
      <div className={styles.queueDashboardLayout}>
        <Tabs>
          <TabList contained>
            <Tab>Service Queues</Tab>
            <Tab>Queue Rooms</Tab>
          </TabList>
          <TabPanels>
            <TabPanel>
              <AdminQueueList />
            </TabPanel>
            <TabPanel>
              <QueueRoomList />
            </TabPanel>
          </TabPanels>
        </Tabs>
      </div>
    </>
  );
};
export default ServiceQueueAdminDashboard;
