import { showSnackbar, useSession } from '@openmrs/esm-framework';
import React, { useEffect, useState } from 'react';
import { deleteQueueRoom, getQueueRoomsByLocationUuid } from '../../../service-queues.resource';
import { type QueueRoom } from '../../../../types/types';
import styles from './queue-room-list.scss';
import { Button, IconButton, Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@carbon/react';
import { Add, Delete, Edit } from '@carbon/react/icons';
import EditQueueModal from '../../queue/modal/edit-queue/edit-queue.modal';
import CreateQueueRoomModal from '../modal/create-queue-room/create-queue-room.modal';
import EditQueueRoomModal from '../modal/edit-queue-room/edit-queue-room.modal';
interface QueueRoomListProps {}
const QueueRoomList: React.FC<QueueRoomListProps> = () => {
  const session = useSession();
  const locationUuid = session.sessionLocation.uuid;
  const [queueRooms, setQueueRooms] = useState<QueueRoom[]>([]);
  const [selectedQueueRoom, setSelectedQueueRoom] = useState<QueueRoom>();
  const [displayCreateRoomQueueModal, setDisplayCreateQueueRoomModal] = useState<boolean>(false);
  const [displayEditQueueRoomModal, setDisplayEditQueueRoomModal] = useState<boolean>(false);
  useEffect(() => {
    fetchQueueRooms();
  }, [locationUuid]);

  const fetchQueueRooms = async () => {
    const queueRooms = await getQueueRoomsByLocationUuid(locationUuid);
    setQueueRooms(queueRooms);
  };
  const handleDeleteQueueRoom = async (queueUuid: string) => {
    await deleteQueueRoom(queueUuid);
    fetchQueueRooms();
    showAlert('Queue Room deleted successfully', 'success');
  };
  const handleCloseCreateQueueRoomModal = () => {
    setDisplayCreateQueueRoomModal(false);
  };
  const handleCloseEditQueueRoomModal = () => {
    setDisplayEditQueueRoomModal(false);
    fetchQueueRooms();
  };
  const handleEditQueueRoom = async (queue: QueueRoom) => {
    setSelectedQueueRoom(queue);
    setDisplayEditQueueRoomModal(true);
  };
  const handleAddQueue = async () => {
    setDisplayCreateQueueRoomModal(true);
    fetchQueueRooms();
  };
  const handleRefresh = () => {
    fetchQueueRooms();
  };
  const showAlert = (message: string, alertType: 'success' | 'error') => {
    showSnackbar({
      kind: alertType,
      title: 'Queue Deleted',
      subtitle: message,
    });
  };
  return (
    <>
      <div className={styles.queueRoomListLayout}>
        <div className={styles.layoutHeader}>
          <h4>Queue Room Management</h4>
        </div>
        <div className={styles.layoutAction}>
          <IconButton label="Add" onClick={() => handleAddQueue()}>
            <Add />
          </IconButton>
          <Button kind="ghost" onClick={handleRefresh}>
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
                <TableHeader>Queue</TableHeader>
                <TableHeader>Service</TableHeader>
                <TableHeader>Action</TableHeader>
              </TableRow>
            </TableHead>
            <TableBody>
              {queueRooms.map((queueRoom, index) => (
                <TableRow key={queueRoom.uuid}>
                  <TableCell>{index + 1}</TableCell>
                  <TableCell>{queueRoom.display}</TableCell>
                  <TableCell>{queueRoom.description}</TableCell>
                  <TableCell>{(queueRoom.queue.location.display as any).name}</TableCell>
                  <TableCell>{queueRoom.queue.display}</TableCell>
                  <TableCell>{queueRoom.queue.service.display}</TableCell>
                  <TableCell>
                    <div className={styles.actionBtns}>
                      <Delete onClick={() => handleDeleteQueueRoom(queueRoom.uuid)} className={styles.iconBtn} />
                      <Edit onClick={() => handleEditQueueRoom(queueRoom)} className={styles.iconBtn} />
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
        <CreateQueueRoomModal open={displayCreateRoomQueueModal} onModalClose={handleCloseCreateQueueRoomModal} />
        {selectedQueueRoom && displayEditQueueRoomModal ? (
          <>
            <EditQueueRoomModal
              open={displayEditQueueRoomModal}
              queueRoom={selectedQueueRoom}
              onModalClose={handleCloseEditQueueRoomModal}
            />
          </>
        ) : (
          <></>
        )}
      </div>
    </>
  );
};
export default QueueRoomList;
