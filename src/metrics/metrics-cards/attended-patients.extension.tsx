import React from 'react';
import { useTranslation } from 'react-i18next';
import { MetricsCard, MetricsCardHeader, MetricsCardBody, MetricsCardItem } from './metrics-card.component';
import { useServiceMetricsCount } from '../metrics.resource';

export default function AttendedToPatientsExtension() {
  const { t } = useTranslation();
  const { serviceCount, isLoading } = useServiceMetricsCount("COMPLETED");

  return (
    <MetricsCard>
      <MetricsCardHeader title={t('patientsAttendedTo', 'Patients attended to')} />
      <MetricsCardBody>
        <MetricsCardItem label={t('patients', 'Patients')} value={isLoading ? '--' : serviceCount ?? 0} />
      </MetricsCardBody>
    </MetricsCard>
  );
}
