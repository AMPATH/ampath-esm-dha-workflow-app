import React from 'react';
import { Workspace2, type Workspace2DefinitionProps } from '@openmrs/esm-framework';
import SendToQueueModal, { type SendToQueueWorkspaceProps } from './send-to-queue.modal';

const SendToQueueWorkspace: React.FC<Workspace2DefinitionProps<SendToQueueWorkspaceProps>> = ({
  closeWorkspace,
  workspaceProps,
}) => {
  if (!workspaceProps) {
    return (
      <Workspace2 title="Initiate SHA claim">
        <div>Loading workspace...</div>
      </Workspace2>
    );
  }

  return (
    <Workspace2 title={workspaceProps.workspaceTitle ?? 'Initiate SHA claim'}>
      <SendToQueueModal {...workspaceProps} closeWorkspace={() => void closeWorkspace()} />
    </Workspace2>
  );
};

export default SendToQueueWorkspace;