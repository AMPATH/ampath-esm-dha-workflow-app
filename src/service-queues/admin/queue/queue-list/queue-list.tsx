import React, { useEffect, useState } from 'react';
import { type Queue } from '../../../../types/types';
import { Button, IconButton, Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@carbon/react';
import { showNotification, showSnackbar, useSession } from '@openmrs/esm-framework';
import { deleteQueue, getQueuesByLocationUuid, useQueues } from '../../../service-queues.resource';
import styles from './queue-list.scss';
import CreateQueueModal from '../modal/create-queue/create-queue.modal';
import { Add, Delete, Edit } from '@carbon/react/icons';
import EditQueueModal from '../modal/edit-queue/edit-queue.modal';

interface QueueListProps {}

const AdminQueueList: React.FC<QueueListProps> = () => {
  const session = useSession();
  const locationUuid = session.sessionLocation.uuid;
  const [queues, setQueues] = useState<Queue[]>([]);
  const [selectedQueue,setSelectedQueue] = useState<Queue>()
  const [displayCreateQueueModal, setDisplayCreateQueueModal] = useState<boolean>(false);
  const [displayEditQueueModal, setDisplayEditQueueModal] = useState<boolean>(false);
  useEffect(() => {
    fetchQueues();
  }, [locationUuid]);

  const fetchQueues = async () => {
    const queues = await getQueuesByLocationUuid(locationUuid);
    setQueues(queues);
  };
  const handleDeleteQueue = async (queueUuid: string) => {
    await deleteQueue(queueUuid);
    fetchQueues();
    showAlert('Queue deleted successfully', 'success');
  };
  const handleCloseCreateQueueModal = () => {
    setDisplayCreateQueueModal(false);
  };
  const handleCloseEditQueueModal = () => {
    setDisplayEditQueueModal(false);
    fetchQueues();
  };
  const handleEditQueue = async (queue: Queue) => {
    setSelectedQueue(queue);
    setDisplayEditQueueModal(true);
  };
  const handleAddQueue = async () => {
    setDisplayCreateQueueModal(true);
    fetchQueues();
  };
  const handleRefresh = ()=>{
    fetchQueues();
  }
  const showAlert = (message: string, alertType: 'success' | 'error') => {
    showSnackbar({
      kind: alertType,
      title: 'Queue Deleted',
      subtitle: message,
    });
  };
  return (
    <>
      <div className={styles.queueListLayout}>
        <div className={styles.layoutHeader}>
          <h4>Queue Management</h4>
        </div>
        <div className={styles.layoutAction}>
          <IconButton label="Add" onClick={() => handleAddQueue()}>
            <Add />
          </IconButton>
          <Button kind='ghost' onClick={handleRefresh}>
            Refresh
          </Button>
        </div>
        <div>
          <Table>
            <TableHead>
              <TableRow>
                <TableHeader>No</TableHeader>
                <TableHeader>Name</TableHeader>
                <TableHeader>Description</TableHeader>
                <TableHeader>Location</TableHeader>
                <TableHeader>Service</TableHeader>
                <TableHeader>Action</TableHeader>
              </TableRow>
            </TableHead>
            <TableBody>
              {queues.map((queue, index) => (
                <TableRow key={queue.uuid}>
                  <TableCell>{index + 1}</TableCell>
                  <TableCell>{queue.name}</TableCell>
                  <TableCell>{queue.description}</TableCell>
                  <TableCell>{(queue.location as any).name}</TableCell>
                  <TableCell>{queue.service.display}</TableCell>
                  <TableCell>
                    <div className={styles.actionBtns}>
                      <Delete onClick={() => handleDeleteQueue(queue.uuid)} className={styles.iconBtn} />
                      <Edit onClick={() => handleEditQueue(queue)} className={styles.iconBtn} />
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
        <CreateQueueModal open={displayCreateQueueModal} onModalClose={handleCloseCreateQueueModal} />
        {
          selectedQueue && displayEditQueueModal ? (<EditQueueModal open={displayEditQueueModal} queue={selectedQueue} onModalClose={handleCloseEditQueueModal} />): (<></>)
        }
        
      </div>
    </>
  );
};

export default AdminQueueList;
