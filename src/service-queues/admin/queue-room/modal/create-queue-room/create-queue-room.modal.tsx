import { Modal, ModalBody, SelectItem, Select, TextInput } from '@carbon/react';
import React, { useEffect, useState } from 'react';
import styles from './create-queue-room.modal.scss';
import { useSession, showSnackbar } from '@openmrs/esm-framework';
import { type Queue, type CreateQueueRoomDto } from '../../../../../types/types';
import { createQueueRoom, getQueuesByLocationUuid } from '../../../../service-queues.resource';
interface CreateQueueRoomModalProps {
  open: boolean;
  onModalClose: () => void;
}

const CreateQueueRoomModal: React.FC<CreateQueueRoomModalProps> = ({ open, onModalClose }) => {
  const session = useSession();
  const location = session.sessionLocation;
  const locationUuid = location.uuid;
  const [queueRoomName, setQueueRoomName] = useState<string>();
  const [description, setDescription] = useState<string>();
  const [queues, setQueues] = useState<Queue[]>([]);
  const [selectedQueueServiceUuid, setSelectedQueueServiceUuid] = useState<string>();
  useEffect(() => {
    fetchQueues();
  }, [locationUuid]);
  const fetchQueues = async () => {
    const queues = await getQueuesByLocationUuid(locationUuid);
    setQueues(queues);
  };
  const handleQueueRoomName = (queueName: string) => {
    setQueueRoomName(queueName);
  };
  const handleQueueRoomDescription = (queueDescription: string) => {
    setDescription(queueDescription);
  };
  const handleQueueService = (queueServiceUuid: string) => {
    setSelectedQueueServiceUuid(queueServiceUuid);
  };
  const handleCreateQueueRoom = async () => {
    const payload = generateCreateQueueRoomPayload();
    if (isValidateCreateQueueRoomDto(payload)) {
      const resp = await createQueueRoom(payload);
      if (resp) {
        showAlert('Queue Room created successfully!', 'success');
        onModalClose();
      }
    }
  };
  const generateCreateQueueRoomPayload = (): CreateQueueRoomDto => {
    return {
      name: queueRoomName,
      description: description,
      queue: {
        uuid: selectedQueueServiceUuid,
      },
    };
  };
  const isValidateCreateQueueRoomDto = (payload: CreateQueueRoomDto): boolean => {
    if (!payload.name) {
      showAlert('Please add the queue room name', 'error');
      return false;
    }
    if (!payload.description) {
      showAlert('Please add the queue room description', 'error');
      return false;
    }
    if (!payload.queue) {
      showAlert('Please add the queue service', 'error');
      return false;
    } else {
      if (!payload.queue.uuid) {
        showAlert('Please select a queue service', 'error');
        return false;
      }
    }
    return true;
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
      <Modal
        open={open}
        size="md"
        onSecondarySubmit={() => onModalClose()}
        onRequestClose={() => onModalClose()}
        onRequestSubmit={handleCreateQueueRoom}
        primaryButtonText="Create Queue Room"
        secondaryButtonText="Cancel"
      >
        <ModalBody>
          <div className={styles.createQueueModalLayout}>
            <div className={styles.sectionHeader}>
              <h4 className={styles.sectionTitle}>Create Queue Room</h4>
            </div>
            <div className={styles.createQueueModalContentSection}>
              <div className={styles.createQueueModalFormRow}>
                <div className={styles.createQueueModalFormControl}>
                  <TextInput
                    id="queue-room-name"
                    labelText="Queue Room Name"
                    onChange={(e) => handleQueueRoomName(e.target.value)}
                    type="text"
                  />
                </div>
              </div>
              <div className={styles.createQueueModalFormRow}>
                <div className={styles.createQueueModalFormControl}>
                  <TextInput
                    id="description"
                    labelText="Description"
                    onChange={(e) => handleQueueRoomDescription(e.target.value)}
                    type="text"
                  />
                </div>
              </div>
              <div className={styles.createQueueModalFormRow}>
                <div className={styles.createQueueModalFormControl}>
                  <Select id="service" labelText="Service Queue" onChange={(e) => handleQueueService(e.target.value)}>
                    <SelectItem value="" text="Select Queue" />
                    {queues.map((queue) => {
                      return <SelectItem value={queue.uuid} text={queue.display} />;
                    })}
                  </Select>
                </div>
              </div>
            </div>
          </div>
        </ModalBody>
      </Modal>
    </>
  );
};

export default CreateQueueRoomModal;
