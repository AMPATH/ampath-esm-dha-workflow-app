import React, { useEffect, useState } from 'react';
import styles from './daily-bookings.component.scss';
import { Button, InlineLoading, Tab, TabList, TabPanel, TabPanels, Tabs } from '@carbon/react';
import DailyBookingsFilter from './filters/daily-bookings-filter.component';
import { showSnackbar } from '@openmrs/esm-framework';
import { type DailyBookingsResult, type BookingFilter, DailyBookingType } from '../types';
import DailiyBookingsPatientList from './patient-list/daily-bookings-patient-list.component';
import { getDailyBookings } from './daily-bookings.resource';

interface DailyBookingsProps {}
const DailyBookings: React.FC<DailyBookingsProps> = () => {
  const [filters, setFilters] = useState<BookingFilter>();
  const [appointments, setAppointments] = useState<DailyBookingsResult[]>([]);
  const [visits, setVisits] = useState<DailyBookingsResult[]>([]);
  const [hasNotReturned, setHasNotReturned] = useState<DailyBookingsResult[]>([]);
  const [selectedTab, setSelectedTab] = useState<DailyBookingType>(DailyBookingType.Appointments);
  const [loading, setLoading] = useState<boolean>(false);

  useEffect(() => {
    if (filters) {
      getDailyBookingsByType(selectedTab);
    }
  }, [filters]);

  const handleFilterSelected = (filters: BookingFilter) => {
    setFilters(filters);
  };
  const handleSelectedTab = (userSelectedTab: DailyBookingType) => {
    setSelectedTab(userSelectedTab);
  };
  const getDailyBookingsByType = async (dailyBookingType: DailyBookingType) => {
    const isValidFilter = isValidFilterset(filters);
    if (!isValidFilter) return;
    setLoading(true);
    try {
      const resp = await getDailyBookings(filters, dailyBookingType);
      if (selectedTab === DailyBookingType.Appointments) {
        setAppointments(resp);
      }
      if (selectedTab === DailyBookingType.Visits) {
        setVisits(resp);
      }
      if (selectedTab === DailyBookingType.HasNotReturned) {
        setHasNotReturned(resp);
      }
    } catch (e) {
      showSnackbar({
        kind: 'error',
        title: e.message ?? 'An error ocurred while fetching data',
        subtitle: '',
      });
    } finally {
      setLoading(false);
    }
  };
  const isValidFilterset = (filters: BookingFilter) => {
    if (!filters) {
      return false;
    }
    if (!filters.startDate) {
      showSnackbar({
        kind: 'error',
        title: 'Start Date not set',
        subtitle: '',
      });
      return false;
    }
    if (!filters.locationUuids) {
      showSnackbar({
        kind: 'error',
        title: 'User location not set',
        subtitle: '',
      });
      return false;
    }
    if (!filters.department) {
      showSnackbar({
        kind: 'error',
        title: 'Department not set',
        subtitle: '',
      });
      return false;
    }
    return true;
  };
  const handleRefresh = () => {
    getDailyBookingsByType(selectedTab);
  };
  return (
    <>
      <div className={styles.bookingsLayout}>
        <div className={styles.bookingsHeader}>
          <h4>Daily Bookings</h4>
        </div>
        <div className={styles.bookingsFilters}>
          <DailyBookingsFilter filterSelected={handleFilterSelected} />
        </div>
        <div className={styles.bookingsContent}>
          <div className={styles.contentActions}>
            <Button kind="primary" onClick={handleRefresh} disabled={loading}>
              {loading ? <InlineLoading description="Fetching..." /> : 'Refresh'}
            </Button>
          </div>
          <div className={styles.contentData}>
            <Tabs>
              <TabList contained>
                <Tab onClick={() => handleSelectedTab(DailyBookingType.Appointments)}>Appointments</Tab>
                <Tab onClick={() => handleSelectedTab(DailyBookingType.Visits)}>Visits</Tab>
                <Tab onClick={() => handleSelectedTab(DailyBookingType.HasNotReturned)}>Has Not Returned</Tab>
              </TabList>
              <TabPanels>
                <TabPanel>
                  {appointments && appointments.length > 0 ? (
                    <DailiyBookingsPatientList patientListData={appointments} />
                  ) : (
                    <></>
                  )}
                </TabPanel>
                <TabPanel>
                  {visits && visits.length > 0 ? <DailiyBookingsPatientList patientListData={visits} /> : <></>}
                </TabPanel>
                <TabPanel>
                  {hasNotReturned && hasNotReturned.length > 0 ? (
                    <DailiyBookingsPatientList patientListData={hasNotReturned} />
                  ) : (
                    <></>
                  )}
                </TabPanel>
              </TabPanels>
            </Tabs>
          </div>
        </div>
      </div>
    </>
  );
};

export default DailyBookings;
