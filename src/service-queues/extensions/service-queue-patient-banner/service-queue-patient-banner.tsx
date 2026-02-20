import React, { useCallback, useEffect, useRef, useState } from 'react';
import styles from './service-queue-patient-banner.scss';
import { Button, InlineLoading, Tag } from '@carbon/react';
import { getTagTypeByPriority } from '../../../shared/utils/get-tag-type';
import { usePatient, useSession } from '@openmrs/esm-framework';
import { getActiveQueueEntryByPatientUuid } from '../../service-queues.resource';
import { type QueueEntry } from '../../../types/types';
import MovePatientModal from '../../modals/move/move-patient.component';

interface ServiceQueuePatientBannerProps {
  renderedFrom: string;
  patientUuid: string;
}
const ServiceQueuePatientBanner: React.FC<ServiceQueuePatientBannerProps> = ({ renderedFrom, patientUuid }) => {
  const session = useSession();
  const location = session.sessionLocation;
  const [currentQueueEntry, setCurrentQueueEntry] = useState<QueueEntry>();
  const [showTransferModal, setShowTransferModal] = useState<boolean>(false);
  const isPatientChart = renderedFrom === 'patient-chart';
  const getPatientCurrentServiceQueue = useCallback(async () => {
    if (!patientUuid || !isPatientChart) return null;

    try {
      const resp = await getActiveQueueEntryByPatientUuid(patientUuid);
      if (resp.length > 0) {
        setCurrentQueueEntry(resp[0]);
      } else {
        setCurrentQueueEntry(null);
      }
    } catch (error) {
      console.error(error);
    }
  }, [patientUuid]);
  useEffect(() => {
    getPatientCurrentServiceQueue();
  }, [patientUuid]);

  const redirectToTriagePage = () => {
    window.location.href = `${window.spaBase}/home/triage`;
  };

  const handleTransferModalClose = () => {
    setShowTransferModal(false);
  };
  const displayTransferModal = () => {
    setShowTransferModal(true);
  };

  const handleTransferSuccess = () => {
    handleTransferModalClose();
    redirectToTriagePage();
  };

  if (!isPatientChart) {
    return null;
  }
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
                <Button className={styles.transferBtn} size="xs" onClick={displayTransferModal}>
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
                onTransferSuccess={handleTransferSuccess}
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
