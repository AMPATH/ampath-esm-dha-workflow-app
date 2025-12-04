import React from 'react';
import { useTranslation } from 'react-i18next';
import { MetricsCard, MetricsCardHeader, MetricsCardBody, MetricsCardItem } from '../metrics/metrics-cards/metrics-card.component';
import { useConsultationQueues } from '../metrics/metrics.resource';
import { InlineLoading, Stack, Tag } from '@carbon/react';
import styles from '../metrics/metrics-container.scss';

export default function ConsultationRooms() {
  const { t } = useTranslation();
  const { data, isLoading } = useConsultationQueues();

  return (
    <Stack orientation='horizontal' gap={3} className={styles.cardContainer}>
      <MetricsCard>
        <MetricsCardHeader title={t('consultationRoom', 'Consultation room')} />
        <MetricsCardBody>
          <Stack as="div">
            <MetricsCard>
              <MetricsCardHeader title={`Client X`} />
              <MetricsCardBody>
                <MetricsCardItem label={t('visitTime', 'Visit time')} value={new Date().toLocaleString()} />
                <Tag
                  size="md"
                  type="blue"
                >
                  Move
                </Tag>
              </MetricsCardBody>
            </MetricsCard>
            <MetricsCard>
              <MetricsCardHeader title={`Client Y`} />
              <MetricsCardBody>
                <MetricsCardItem label={t('visitTime', 'Visit time')} value={new Date().toLocaleString()} />
                <Tag
                  size="md"
                  type="blue"
                >
                  Move
                </Tag>
              </MetricsCardBody>
            </MetricsCard>
          </Stack>
          {/* {
          isLoading ? (<InlineLoading />) : data.data.results.map((result, index) => (
            <MetricsCard key={index}>
              <MetricsCardHeader title={result.patient.display} />
              <MetricsCardBody>
                <Tag
                  size="md"
                  type="blue"
                >
                  Move
                </Tag>
                <MetricsCardItem label={t('visitTime', 'Visit time')} value={new Date(result.visit.startDatetime).toLocaleString()} />
              </MetricsCardBody>
            </MetricsCard>
          ))
        } */}
        </MetricsCardBody>
      </MetricsCard>
      <MetricsCard>
        <MetricsCardHeader title={t('consultationRoom', 'Consultation room')} />
        <MetricsCardBody>
          <Stack as="div">
            <MetricsCard>
              <MetricsCardHeader title={`Client X`} />
              <MetricsCardBody>
                <MetricsCardItem label={t('visitTime', 'Visit time')} value={new Date().toLocaleString()} />
                <Tag
                  size="md"
                  type="blue"
                >
                  Move
                </Tag>
              </MetricsCardBody>
            </MetricsCard>
            <MetricsCard>
              <MetricsCardHeader title={`Client Y`} />
              <MetricsCardBody>
                <MetricsCardItem label={t('visitTime', 'Visit time')} value={new Date().toLocaleString()} />
                <Tag
                  size="md"
                  type="blue"
                >
                  Move
                </Tag>
              </MetricsCardBody>
            </MetricsCard>
          </Stack>
        </MetricsCardBody>
      </MetricsCard>
    </Stack>
  );
}
