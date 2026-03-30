import { formatDate, parseDate, showSnackbar, useSession } from '@openmrs/esm-framework';
import React, { useEffect, useState } from 'react';
import { deleteQueueEntry, endQueueEntry, getQueueEntryByLocationUuid } from '../../service-queues.resource';
import { type QueueEntry } from '../../../types/types';
import {
  Link,
  OverflowMenu,
  OverflowMenuItem,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@carbon/react';
import styles from './queue-entry-list.component.scss';
interface QueueEntryListProps {}
const QueueEntryList: React.FC<QueueEntryListProps> = () => {
  const session = useSession();
  const locationUuid = session.sessionLocation.uuid;
  const [queueEntryList, setQueueEntryList] = useState<QueueEntry[]>([]);

  useEffect(() => {
    if (locationUuid) {
      getQueueEntryList(locationUuid);
    }
  }, [locationUuid]);

  async function getQueueEntryList(locationUuid: string) {
    const resp = await getQueueEntryByLocationUuid(locationUuid);
    if (resp) {
      setQueueEntryList(resp);
    }
  }
  if (!queueEntryList || queueEntryList.length === 0) {
    return <h4>No Data to display</h4>;
  }
  async function handleDeleteQueueEntry(queueEntry: QueueEntry) {
    try {
      await deleteQueueEntry(queueEntry.uuid);
      showSnackbar({
        kind: 'success',
        title: 'Queue entry voided successfully',
        subtitle: 'Queue entry voided successfully',
      });
    } catch (error) {
      showSnackbar({
        kind: 'error',
        title: 'Error voiding Queue entry',
        subtitle: error.message ?? 'An error occurred while voiding the queue entry',
      });
    } finally {
      refreshData();
    }
  }
  function refreshData() {
    getQueueEntryList(locationUuid);
  }
  async function handleEndQueueEntry(queueEntry: QueueEntry) {
    try {
      const endedAt = queueEntry.visit.stopDatetime ? queueEntry.visit.stopDatetime : new Date().toISOString();
      await endQueueEntry(queueEntry.uuid, endedAt);
      showSnackbar({
        kind: 'success',
        title: 'Queue entry ended successfully',
        subtitle: 'Queue entry ended successfully',
      });
    } catch (error) {
      showSnackbar({
        kind: 'error',
        title: 'Error closing Queue entry',
        subtitle: error.message ?? 'An error occurred while closing the queue entry',
      });
    } finally {
      refreshData();
    }
  }
  return (
    <>
      <div className={styles.entryListLayout}>
        <Table>
          <TableHead>
            <TableRow>
              <TableHeader>No</TableHeader>
              <TableHeader>Name</TableHeader>
              <TableHeader>Current Queue</TableHeader>
              <TableHeader>Coming From</TableHeader>
              <TableHeader>Status</TableHeader>
              <TableHeader>Priority</TableHeader>
              <TableHeader>Started At</TableHeader>
              <TableHeader>Ended At</TableHeader>
              <TableHeader>Visit End At</TableHeader>
              <TableHeader>Action</TableHeader>
            </TableRow>
          </TableHead>
          <TableBody>
            {queueEntryList &&
              queueEntryList.map((val, index) => (
                <TableRow id={val.uuid}>
                  <TableCell>{index + 1}</TableCell>
                  <TableCell>
                    {val.patient ? (
                      <>
                        <Link href={`${window.spaBase}/patient/${val.patient.uuid}/chart/`}>
                          {val.patient ? val.patient.person.display : val.display}
                        </Link>
                      </>
                    ) : (
                      <></>
                    )}
                  </TableCell>
                  <TableCell>{val.queue.display}</TableCell>
                  <TableCell>{val.queueComingFrom ? val.queueComingFrom.display : ''}</TableCell>
                  <TableCell>{val.status.display}</TableCell>
                  <TableCell>{val.priority.display}</TableCell>
                  <TableCell>{val.startedAt ?? ''}</TableCell>
                  <TableCell>{val.endedAt ? formatDate(parseDate(val.endedAt)) : ''}</TableCell>
                  <TableCell>
                    {val.visit && val.visit.stopDatetime ? formatDate(parseDate(val.visit.stopDatetime)) : ''}
                  </TableCell>
                  <TableCell>
                    <>
                      <OverflowMenu aria-label="overflow-menu">
                        <OverflowMenuItem itemText="End" onClick={() => handleEndQueueEntry(val)} />
                        <OverflowMenuItem itemText="Delete" onClick={() => handleDeleteQueueEntry(val)} />
                      </OverflowMenu>
                    </>
                  </TableCell>
                </TableRow>
              ))}
          </TableBody>
        </Table>
      </div>
    </>
  );
};
export default QueueEntryList;
