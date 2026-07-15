import React, { useCallback, useEffect, useState } from 'react';
import styles from './billing-claims-dashboard.component.scss';
import { Breadcrumb, BreadcrumbItem, Tab, TabList, TabPanel, TabPanels, Tabs } from '@carbon/react';
import { ArrowUpRight, Document, Location, Time, Wallet, WarningAlt } from '@carbon/react/icons';
import FacilityBills from './facility-bills/facility-bills.component';
import ClaimsAccounting from './claims-accounting/claims-accounting.component';
import Clearance from './clearance/clearance.component';
import { useSession } from '@openmrs/esm-framework';
import { getClearanceCounts } from '../../../shared/services/consultation-clearance.resource';
import { getClaimCounts } from './claims-accounting/claims-accounting.resource';
import { getRemittances } from './claims-accounting/remittances.resource';

const BillingClaimsDashboard: React.FC = () => {
  const session = useSession();
  const locationUuid = session.sessionLocation?.uuid ?? '';
  const facilityName = session.sessionLocation?.display ?? '';
  const [activeTab, setActiveTab] = useState<number>(0);
  const [billingDate, setBillingDate] = useState<string>(new Date().toLocaleDateString('en-CA'));

  const [awaiting, setAwaiting] = useState(0);
  const [claimCounts, setClaimCounts] = useState<Record<string, number>>({});
  const [toReconcile, setToReconcile] = useState(0);

  const loadCounts = useCallback(() => {
    getClearanceCounts(locationUuid).then((c) => setAwaiting(c.awaiting));
    getClaimCounts().then(setClaimCounts);
    getRemittances().then((rs) => setToReconcile(rs.filter((r) => r.status === 'RECEIVED').length));
  }, [locationUuid]);

  useEffect(() => {
    loadCounts();
  }, [loadCounts, activeTab]);

  const totalClaims = Object.values(claimCounts).reduce((a, b) => a + b, 0);

  const kpis = [
    {
      key: 'awaiting',
      Icon: Time,
      value: awaiting,
      label: 'Awaiting clearance',
      caption: 'Patients held at the queue',
      tone: styles.toneAmber,
      tab: 0,
    },
    {
      key: 'drafts',
      Icon: Document,
      value: claimCounts.draft ?? 0,
      label: 'Draft claims',
      caption: 'Not yet submitted',
      tone: styles.toneBlue,
      tab: 2,
    },
    {
      key: 'rework',
      Icon: WarningAlt,
      value: (claimCounts.rejected ?? 0) + (claimCounts.recalled ?? 0),
      label: 'Claims to rework',
      caption: 'Rejected or recalled',
      tone: styles.toneRed,
      tab: 2,
    },
    {
      key: 'reconcile',
      Icon: Wallet,
      value: toReconcile,
      label: 'Remittances to reconcile',
      caption: 'Payment advice received',
      tone: styles.toneTeal,
      tab: 2,
    },
  ];

  return (
    <div className={styles.page}>
      <Breadcrumb noTrailingSlash className={styles.breadcrumb}>
        <BreadcrumbItem href={`${window.spaBase}/home`}>Home</BreadcrumbItem>
        <BreadcrumbItem isCurrentPage>Billing &amp; Claims</BreadcrumbItem>
      </Breadcrumb>

      <header className={styles.pageHead}>
        <div className={styles.pageHeadText}>
          <h3 className={styles.title}>Billing &amp; Claims</h3>
          <p className={styles.subtitle}>Clear consultation fees, manage facility bills, and run SHA virtual claims.</p>
        </div>
        {facilityName ? (
          <span className={styles.facilityChip}>
            <Location size={16} />
            {facilityName}
          </span>
        ) : null}
      </header>

      <section className={styles.kpiGrid} aria-label="Summary">
        {kpis.map((k) => (
          <button
            key={k.key}
            type="button"
            className={`${styles.kpiCard} ${k.tone} ${k.value === 0 ? styles.kpiZero : ''}`}
            onClick={() => setActiveTab(k.tab)}
          >
            <span className={styles.kpiIcon}>
              <k.Icon size={18} />
            </span>
            <span className={styles.kpiBody}>
              <span className={styles.kpiTop}>
                <span className={styles.kpiValue}>{k.value}</span>
                <span className={styles.kpiLabel}>{k.label}</span>
              </span>
              <span className={styles.kpiCaption}>{k.caption}</span>
            </span>
            <ArrowUpRight size={16} className={styles.kpiArrow} />
          </button>
        ))}
      </section>

      <div className={styles.card}>
        <Tabs selectedIndex={activeTab} onChange={({ selectedIndex }) => setActiveTab(selectedIndex)}>
          <TabList className={styles.tabList} aria-label="Billing sections">
            <Tab>
              Clearance{awaiting ? <span className={styles.tabPill}>{awaiting}</span> : null}
            </Tab>
            <Tab>Bills</Tab>
            <Tab>
              SHA claims{totalClaims ? <span className={styles.tabPill}>{totalClaims}</span> : null}
            </Tab>
          </TabList>
          <TabPanels>
            <TabPanel className={styles.panel}>
              <Clearance onChange={loadCounts} />
            </TabPanel>
            <TabPanel className={styles.panel}>
              <FacilityBills
                locationUuid={locationUuid}
                billingDate={billingDate}
                onDateChange={(d) => setBillingDate(d || new Date().toLocaleDateString('en-CA'))}
              />
            </TabPanel>
            <TabPanel className={styles.panel}>
              <ClaimsAccounting />
            </TabPanel>
          </TabPanels>
        </Tabs>
      </div>
    </div>
  );
};

export default BillingClaimsDashboard;
