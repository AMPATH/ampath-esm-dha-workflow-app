import React from 'react';
import styles from './maternity-queues.component.scss';
import { Tab, TabList, TabPanel, TabPanels, Tabs } from '@carbon/react';
import MaternityTriage from './queues/triage/maternity-triage';
interface MchQueuesProps {}
const MaternityQueues: React.FC<MchQueuesProps> = () => {
  return (
    <div className={styles.mnchLayout}>
      <div className={styles.mnchHeader}>
        <h4>Maternity</h4>
      </div>
      <div className={styles.mnchContent}>
        <Tabs>
          <TabList contained>
            <Tab>Triage</Tab>
          </TabList>
          <TabPanels>
            <TabPanel>
              <MaternityTriage />
            </TabPanel>

          </TabPanels>
        </Tabs>
      </div>
    </div>
  );
};
export default MaternityQueues;
