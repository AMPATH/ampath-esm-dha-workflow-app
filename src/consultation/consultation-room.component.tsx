import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { MetricsCard, MetricsCardHeader, MetricsCardBody, MetricsCardItem } from '../metrics/metrics-cards/metrics-card.component';
import { Button, InlineLoading, OverflowMenu, Stack, Tag } from '@carbon/react';
import styles from '../metrics/metrics-container.scss';
import { type QueueEntryAction } from '../config-schema';
import { ActionOverflowMenuItem } from './action-overflow-menu-item.component';
import { isDesktop, useLayoutType } from '@openmrs/esm-framework';
import { useQueueEntries } from '../hooks/useQueueEntries';
import { ActionButton } from './action-button.component';
import dayjs from 'dayjs';

export default function ConsultationRooms() {
  const { t } = useTranslation();
  const { queueEntries, isLoading } = useQueueEntries();
  const [checkedIn, setCheckedIn] = useState(false);
  const layout = useLayoutType();
  let overflowMenuKeys: QueueEntryAction[] = ['move', 'transition', 'signOff', 'edit', 'remove', 'undo'];

  return (
    <Stack orientation='horizontal' gap={3} className={styles.cardContainer}>
      <MetricsCard>
        <Stack as="div" orientation='horizontal' gap={6}>
          <p>{t('consultationRoom', 'Consultation room')}</p>
          <Tag type="blue" size="sm">
            0 patient(s)
          </Tag>
          <Button kind={checkedIn ? 'danger' : 'primary'} size='sm' onClick={() => setCheckedIn(!checkedIn)}> { !checkedIn ? 'Check in' : 'Check out'}</Button>
        </Stack>
        <MetricsCardBody>
          <Stack as="div">
            {
              isLoading ? (<InlineLoading />) : queueEntries?.data?.results.map((queueEntry, index) => (
                <MetricsCard key={index}>
                  <MetricsCardHeader title={queueEntry.display} />
                  <MetricsCardBody>
                    <p>{`${t('visitTime', 'Visit time')} : ${dayjs(queueEntry.startedAt).format('YYYY-MM-DD HH:mm')}`}</p>
                    <Tag type="blue" size="sm">
                      {queueEntry.priority?.display}
                    </Tag>
                    {
                      checkedIn ? <>
                        <ActionButton key={`move`} actionKey={'move'} queueEntry={queueEntry} />
                        <OverflowMenu aria-label="Actions menu" size={isDesktop(layout) ? 'sm' : 'lg'} align="left" flipped>
                          {overflowMenuKeys.map((actionKey) => (
                            <ActionOverflowMenuItem key={actionKey} actionKey={actionKey} queueEntry={queueEntry} />
                          ))}
                        </OverflowMenu>
                      </> : <></>
                    }
                  </MetricsCardBody>
                </MetricsCard>
              ))
            }
          </Stack>
        </MetricsCardBody>
      </MetricsCard>
    </Stack>
  );
}
