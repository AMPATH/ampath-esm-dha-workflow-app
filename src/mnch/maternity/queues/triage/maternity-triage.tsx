import React from 'react';
import ServiceQueueComponent from '../../../../service-queues/service-queue/service-queue.component';
import { QUEUE_SERVICE_UUIDS } from '../../../../shared/constants/concepts';

interface TriageProps {}
const MaternityTriage: React.FC<TriageProps> = () => {
  return (
    <>
      <div>
        <ServiceQueueComponent serviceTypeUuid={QUEUE_SERVICE_UUIDS.MATERNITY_TRIAGE_SERVICE_UUID} title="Maternity Triage" />
      </div>
    </>
  );
};
export default MaternityTriage;
