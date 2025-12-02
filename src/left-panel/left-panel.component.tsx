import React from 'react';
import { useTranslation } from 'react-i18next';
import { SideNav } from '@carbon/react';
import { attach, ExtensionSlot, isDesktop, useLayoutType } from '@openmrs/esm-framework';
import styles from './left-panel.scss';

attach('nav-menu-slot', 'bed-management-left-panel');

const LeftPanel: React.FC = () => {
  const { t } = useTranslation();
  const layout = useLayoutType();

  return (
    isDesktop(layout) && (
      <SideNav className={styles.leftPanel} expanded>
        <ExtensionSlot name="dha-workflow-slot" />
      </SideNav>
    )
  );
};

export default LeftPanel;
