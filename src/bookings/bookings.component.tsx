import React from 'react';
import styles from './bookings.component.scss';
interface BookingsProps {}
const Bookings: React.FC<BookingsProps> = () => {
  return (
    <>
      <div className={styles.bookingsLayout}>
        <div className={styles.bookingsHeader}>
          <h4>Daily Bookings</h4>
        </div>
        <div className={styles.bookingsFilters}>
          <h4>Report Filters</h4>
        </div>
        <div className={styles.bookingsContent}>
          <p>Content</p>
        </div>
      </div>
    </>
  );
};

export default Bookings;
