import React, { useState } from 'react';
import { MetricsCard, MetricsCardBody } from './metrics/metrics-cards/metrics-card.component';
import { Button, InlineLoading, Stack, Tag } from '@carbon/react';
import styles from './service-queue.scss';
import { useQueues } from './service-queues.resource';
import { Room } from './room/room.component';
import { type QueueEntryAction } from '../config-schema';

interface QueueRoomProps {
  serviceUuid: string;
  overflowMenuKeys: QueueEntryAction[];
  defaultMenuKey: QueueEntryAction;
}

const QueueRoom: React.FC<QueueRoomProps> = ({ serviceUuid, defaultMenuKey, overflowMenuKeys }) => {
  const { data: queuesData, isLoading: isLoadingQueues } = useQueues(serviceUuid);
  const [checkedInRoomUuids, setCheckedInRoomUuids] = useState([]);

  return <Stack orientation='horizontal' gap={1} className={styles.cardContainer}>
    {
      isLoadingQueues ? <InlineLoading /> : queuesData.data.results.map((queue, index) => (
        <MetricsCard key={index} >
          <Stack as="div" orientation='horizontal' gap={4} className={styles.cardHeaderStack}>
            <p>{queue.display}</p>
            <Tag type="blue" size="sm">
              0 patient(s)
            </Tag>
            <Button kind={checkedInRoomUuids.includes(queue.uuid) ? 'danger' : 'primary'} size='sm' onClick={() => setCheckedInRoomUuids((prev) => (prev.includes(queue.uuid) ? prev.filter(q => q !== queue.uuid) : [...prev, queue.uuid]))}> {!checkedInRoomUuids.includes(queue.uuid) ? 'Check in' : 'Check out'}</Button>
          </Stack>
          <MetricsCardBody>
            <Room checkedInRoomUuids={checkedInRoomUuids} queueUuid={queue.uuid} overflowMenuKeys={overflowMenuKeys} defaultMenuKey={defaultMenuKey}/>
          </MetricsCardBody>
        </MetricsCard>
      ))
    }
  </Stack>
}

export default QueueRoom;
