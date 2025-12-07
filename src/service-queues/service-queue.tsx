/* eslint-disable no-console */
import React, { useMemo } from 'react';
import MetricsContainer from './metrics/metrics-container.component';
import QueueRoom from './queue-room.component';
import { type QueueEntryAction } from '../config-schema';

interface ServiceQueueProps {
  isTriage: boolean;
}
const ServiceQueue: React.FC<ServiceQueueProps> = ({ isTriage }) => {
  const roomParams = useMemo(() => {
    return isTriage ? {
      serviceUuid: 'triage-service-uuid',
      overflowMenuKeys: ['call', 'transition', 'edit', 'remove', 'undo'] as QueueEntryAction[],
      defaultMenuKey: 'call' as QueueEntryAction
    } : {
      serviceUuid: '7f7ec7ad-cdd7-4ed9-bc2e-5c5bd9f065b2',
      overflowMenuKeys: ['move', 'transition', 'signOff', 'edit', 'remove', 'undo'] as QueueEntryAction[],
      defaultMenuKey: 'move' as QueueEntryAction
    };
  }
    , [isTriage]);

  return (<>
    <MetricsContainer />
    <QueueRoom serviceUuid={roomParams.serviceUuid} overflowMenuKeys={roomParams.overflowMenuKeys} defaultMenuKey={roomParams.defaultMenuKey}/>
  </>
  );
};

export default ServiceQueue;