import React, { useCallback, useEffect, useRef, useState } from 'react';
import styles from './service-queue-patient-banner.scss';
import { Button, InlineLoading, Tag } from '@carbon/react';
import { getTagTypeByPriority } from '../../../shared/utils/get-tag-type';
import { usePatient, useSession } from '@openmrs/esm-framework';
import { getActiveQueueEntryByPatientUuid } from '../../service-queues.resource';
import { type QueueEntry } from '../../../types/types';
import MovePatientModal from '../../modals/move/move-patient.component';

interface ServiceQueuePatientBannerProps {}
const ServiceQueuePatientBanner: React.FC<ServiceQueuePatientBannerProps> = () => {
  const { isLoading, patient, error } = usePatient();
  const session = useSession();
  const location = session.sessionLocation;
  const [currentQueueEntry, setCurrentQueueEntry] = useState<QueueEntry>();
  const [showTransferModal, setShowTransferModal] = useState<boolean>(false);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const getPatientCurrentServiceQueue = useCallback(async () => {
    if (!patient?.id) return;

    try {
      const resp = await getActiveQueueEntryByPatientUuid(patient.id);
      if (resp.length > 0) {
        setCurrentQueueEntry(resp[0]);
      }
    } catch (error) {
      console.error(error);
    }
  }, [patient?.id]);
  let timeout;
  useEffect(() => {
    getPatientCurrentServiceQueue();
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [patient]);

  if (isLoading) {
    return <InlineLoading description="Fetching service queue data..." />;
  }
  if (error) {
    return <></>;
  }
  if (!patient) {
    return <></>;
  }

  const handleTransferModalClose = () => {
    setShowTransferModal(false);
    timeoutRef.current = setTimeout(getPatientCurrentServiceQueue, 5000);
  };
  const displayTransferModal = () => {
    setShowTransferModal(true);
  };
  return (
    <>
      {currentQueueEntry ? (
        <>
          <div className={styles.bannerLayout}>
            <div className={styles.sectionContent}>
              <div>
                <span>{currentQueueEntry.queue.display}</span>
              </div>
              <div>
                <Tag size="md" type={getTagTypeByPriority(currentQueueEntry.priority.display)}>
                  {currentQueueEntry.priority.display}
                </Tag>
              </div>
              <div>
                <Button kind="secondary" size="sm" onClick={displayTransferModal}>
                  Transfer
                </Button>
              </div>
            </div>
          </div>
          {showTransferModal && location ? (
            <>
              <MovePatientModal
                open={showTransferModal}
                currentQueueEntryUuid={currentQueueEntry.uuid}
                locationUuid={location.uuid}
                onModalClose={handleTransferModalClose}
              />
            </>
          ) : (
            <></>
          )}
        </>
      ) : (
        <></>
      )}
    </>
  );
};
export default ServiceQueuePatientBanner;
