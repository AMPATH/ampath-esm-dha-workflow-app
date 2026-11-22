import React, { useState } from 'react';
import '@carbon/styles/css/styles.css';
import AlertBanner from '../../shared/ui/alert-banner/alert-banner';

interface eventAlertProps{
  title: string;
  message: string;
  kind: 'info' | 'warning' | 'error'
}
const EventAlert: React.FC<eventAlertProps> =( {title,message,kind})=> {
  const [showBanner, setShowBanner] = useState(true);

  const handleCloseBanner = () => {
    setShowBanner(false);
  };

  return (
    <div>
      <AlertBanner
        kind={kind}
        title={title}
        message={message}
        isOpen={showBanner}
        onClose={handleCloseBanner}
        hideCloseButton={false}
        position="sticky"
      />
    </div>
  );
}

export default EventAlert;