import React from 'react';
import MetricsContainer from '../metrics/metrics-container.component';
import ConsultationRooms from './consultation-room.component';

interface ConsultationProps { }
const Consultation: React.FC<ConsultationProps> = () => {
  return (<>
    <MetricsContainer />
    <ConsultationRooms />
  </>
  );
};

export default Consultation;
