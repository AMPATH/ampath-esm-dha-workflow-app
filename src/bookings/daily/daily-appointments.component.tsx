import React from 'react';
interface DailyAppointmentsProps {
  startDate: string;
  locationUuid: string;
}
const DailyAppointments: React.FC<DailyAppointmentsProps> = ({ startDate, locationUuid }) => {
  return <>Daily Appoinments</>;
};
export default DailyAppointments;
