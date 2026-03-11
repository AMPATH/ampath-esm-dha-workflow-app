import { Modal, ModalBody, Tab, TabList, TabPanel, TabPanels, Tabs } from '@carbon/react';
import { type HieClient } from '../../types';
import React, { useState } from 'react';
import styles from './client-details-modal.scss';
import ClientDetails from '../../client-details/client-details';
import PaymentOptionsComponent from '../../payment-details/payment-options/payment-options';
import { type CreateClientPaymentModeDto, type HieClientPaymentMode, type PaymentMode } from '../../../shared/types';
import { createClientPaymentMode } from '../../../shared/services/client-payment-mode.resource';
import { showSnackbar } from '@openmrs/esm-framework';

interface ClientDetailsModalProps {
  client: HieClient;
  open: boolean;
  onModalClose: () => void;
  onSubmit: () => void;
  onSendClientToTriage: (crId: string) => void;
}

const ClientDetailsModal: React.FC<ClientDetailsModalProps> = ({
  client,
  open,
  onModalClose,
  onSubmit,
  onSendClientToTriage,
}) => {
  if (!client) {
    return <>No Client data</>;
  }
  return (
    <>
      <Modal
        open={open}
        size="lg"
        onSecondarySubmit={onModalClose}
        onRequestClose={onModalClose}
        onRequestSubmit={() => onSendClientToTriage(client.id)}
        primaryButtonText="Send To Triage"
        secondaryButtonText="Cancel"
      >
        <ModalBody>
          <div className={styles.clientDetailsLayout}>
            <div className={styles.sectionHeader}>
              <h4 className={styles.sectionTitle}>Patient Details</h4>
            </div>
            <div className={styles.sectionContent}>
              <Tabs>
                <TabList contained>
                  <Tab>Patient Details</Tab>
                </TabList>
                <TabPanels>
                  <TabPanel>
                    <ClientDetails client={client} />
                  </TabPanel>
                </TabPanels>
              </Tabs>
            </div>
          </div>
        </ModalBody>
      </Modal>
    </>
  );
};

export default ClientDetailsModal;
