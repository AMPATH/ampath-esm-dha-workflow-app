import React from 'react';
import { InlineNotification } from '@carbon/react';
import styles from './alert-banner.scss';


interface alertBannerProps  {
  kind: 'info' | 'error' | 'warning';
  title:string;
  message:string;
  isOpen: boolean;
  hideCloseButton: boolean;
  onClose: any;
  position: string;
}
const AlertBanner: React.FC<alertBannerProps> = ({
  kind = 'info',
  title,
  message,
  isOpen = true,
  hideCloseButton = false,
  onClose,
  position = 'sticky',
}) => {
  if (!isOpen) return null;

  const positionClass = styles[position] || styles.sticky;

  return (
    <div className={`${styles.bannerWrapper} ${positionClass}`} role="region" aria-label="Notification Banner">
      <InlineNotification
        kind={kind}
        title={title}
        subtitle={message}
        hideCloseButton={hideCloseButton}
        onCloseButtonClick={onClose}
        lowContrast={false}
        className={styles.fullWidthNotification}
      />
    </div>
  );
};

export default AlertBanner;