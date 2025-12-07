import { restBaseUrl, showModal, useConfig } from '@openmrs/esm-framework';
import { type ConfigObject, type QueueEntryAction } from '../config-schema';
import { useMemo } from 'react';
import { useSWRConfig } from 'swr';
import { type QueueEntry } from '../types/types';
import { mapVisitQueueEntryProperties, serveQueueEntry } from '../service-queues/service-queues.resource';

type ActionProps = {
  label: string;
  text: string;
  onClick: (queueEntry: QueueEntry) => void;
  showIf?: (queueEntry: QueueEntry) => boolean;
  isDelete?: boolean;
};

export function useMutateQueueEntries() {
    const { mutate } = useSWRConfig();

    return {
        mutateQueueEntries: () => {
            return mutate((key) => {
                return (
                    typeof key === 'string' &&
                    (key.includes(`${restBaseUrl}/queue-entry`) || key.includes(`${restBaseUrl}/visit-queue-entry`))
                );
            }).then(() => {
                window.dispatchEvent(new CustomEvent('queue-entry-updated'));
            });
        },
    };
}

export function useActionPropsByKey() {
  const {
    concepts: { defaultStatusConceptUuid },
    visitQueueNumberAttributeUuid,
  } = useConfig<ConfigObject>();
  const { mutateQueueEntries } = useMutateQueueEntries();

  // Map action strings to component props
  const actionPropsByKey: Record<QueueEntryAction, ActionProps> = useMemo(() => {
    return {
      call: {
        // t('call', 'Call'),
        label: 'call',
        text: 'Call',
        onClick: async (queueEntry: QueueEntry) => {
          const mappedQueueEntry = mapVisitQueueEntryProperties(queueEntry, visitQueueNumberAttributeUuid);
          const callingQueueResponse = await serveQueueEntry(
            mappedQueueEntry.queue.name,
            mappedQueueEntry.visitQueueNumber,
            'calling',
          );
          if (callingQueueResponse.ok) {
            await mutateQueueEntries();
            const dispose = showModal('call-queue-entry-modal', {
              closeModal: () => dispose(),
              queueEntry,
              size: 'sm',
            });
          }
        },
        showIf: (queueEntry: QueueEntry) => {
          return queueEntry.status.uuid === defaultStatusConceptUuid;
        },
      },
      move: {
        // t('move', 'Move'),
        label: 'move',
        text: 'Move',
        onClick: (queueEntry: QueueEntry) => {
          const dispose = showModal('move-queue-entry-modal', {
            closeModal: () => dispose(),
            queueEntry,
            size: 'sm',
          });
        },
      },
      transition: {
        // t('transition', 'Transition'),
        label: 'transition',
        text: 'Transition',
        onClick: (queueEntry: QueueEntry) => {
          const dispose = showModal('transition-queue-entry-modal', {
            closeModal: () => dispose(),
            queueEntry,
            size: 'sm',
          });
        },
      },
      edit: {
        // t('edit', 'Edit'),
        label: 'edit',
        text: 'Edit',
        onClick: (queueEntry: QueueEntry) => {
          const dispose = showModal('edit-queue-entry-modal', {
            closeModal: () => dispose(),
            queueEntry,
            size: 'sm',
          });
        },
      },
      remove: {
        // t('removePatient', 'Remove patient'),
        label: 'removePatient',
        text: 'Remove patient',
        onClick: (queueEntry: QueueEntry) => {
          const dispose = showModal('remove-queue-entry-modal', {
            closeModal: () => dispose(),
            queueEntry,
            size: 'sm',
          });
        },
      },
      delete: {
        // t('deleteEntry', 'Delete entry'),
        label: 'deleteEntry',
        text: 'Delete entry',
        onClick: (queueEntry: QueueEntry) => {
          const dispose = showModal('delete-queue-entry-modal', {
            closeModal: () => dispose(),
            queueEntry,
            size: 'sm',
          });
        },
        isDelete: true,
        showIf: (queueEntry: QueueEntry) => {
          return queueEntry.previousQueueEntry === null;
        },
      },
      undo: {
        // t('undoTransition', 'Undo transition'),
        label: 'undoTransition',
        text: 'Undo transition',
        onClick: (queueEntry: QueueEntry) => {
          const dispose = showModal('undo-transition-queue-entry-modal', {
            closeModal: () => dispose(),
            queueEntry,
            size: 'sm',
          });
        },
        isDelete: true,
        showIf: (queueEntry: QueueEntry) => {
          return queueEntry.previousQueueEntry !== null;
        },
      },
      signOff: {
        // t('signOff', 'Sign off'),
        label: 'signOff',
        text: 'Sign off',
        onClick: (queueEntry: QueueEntry) => {
          const dispose = showModal('sign-off-queue-entry-modal', {
            closeModal: () => dispose(),
            queueEntry,
            size: 'sm',
          });
        },
        showIf: (queueEntry: QueueEntry) => {
          return queueEntry.previousQueueEntry !== null;
        },
      },
    };
  }, [defaultStatusConceptUuid, visitQueueNumberAttributeUuid, mutateQueueEntries]);
  return actionPropsByKey;
}