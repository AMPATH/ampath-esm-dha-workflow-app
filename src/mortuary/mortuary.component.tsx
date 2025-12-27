import React, { useEffect, useState } from 'react';
import { ExtensionSlot, WorkspaceContainer } from '@openmrs/esm-framework';

const Mortuary: React.FC = () => {
  
  return (
    <div>
      <ExtensionSlot name="mortuary-dashboard-slot" />
    </div>
  );
};

export default Mortuary;
