import React from "react";
import styles from './billing-and-claims-reports-dashboard.scss';
import { Icon } from "@openmrs/esm-framework";
import { Tab, TabList, TabPanel, TabPanels, Tabs } from "@carbon/react";
import ClaimsReportDashboard from "./claims/claims-report-dashboard";
const BillingClaimsReportsDashboard: React.FC = ()=>{
  return <>
  <div className={styles.billClaimLayout}>
       <div className={styles.bcHeader}>
          <span className={styles.bcHeaderIcon}>
            <Icon icon='omrs-icon-report' iconProps={{}}/>
          </span>
          <div className={styles.bcHeaderTitle}>
            <h3 className={styles.bcTitle}> Reports</h3>
          </div>
       </div>
       <div className={styles.bcBody}>
             <Tabs>
            <TabList scrollDebounceWait={200}>
              <Tab>Claims</Tab>
            </TabList>
            <TabPanels>
              <TabPanel>
                <ClaimsReportDashboard />
              </TabPanel>
            </TabPanels>
            </Tabs>
       </div>
  </div>
  </>
}
export default BillingClaimsReportsDashboard;