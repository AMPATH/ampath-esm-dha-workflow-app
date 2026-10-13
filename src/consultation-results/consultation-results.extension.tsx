import React, { useCallback, useState } from 'react';
import {
  ActionableNotification,
  Button,
  DataTable,
  DataTableSkeleton,
  InlineNotification,
  Modal,
  SkeletonText,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableHeader,
  TableRow,
  Tag,
} from '@carbon/react';
import { Renew, Time, WarningAlt } from '@carbon/react/icons';
import { formatDatetime, formatTime, launchWorkspace2, parseDate, useConfig, usePatient } from '@openmrs/esm-framework';
import { type ConfigObject } from '../config-schema';
import { useTodaysConsultation, useTodaysLabOrders } from './consultation-results.resource';
import { type LabOrderWithResult, type LabResultObs, type ObsValue } from './consultation-results.types';
import styles from './consultation-results.extension.scss';

interface ConsultationResultsExtensionProps {
  patientUuid?: string;
}

type TagType = 'green' | 'blue' | 'cyan' | 'warm-gray' | 'red' | 'gray';

const PATIENT_FORM_ENTRY_WORKSPACE = 'patient-form-entry-workspace';

function formatValue(value: ObsValue): string {
  if (value === null || value === undefined || value === '') {
    return '';
  }
  if (typeof value === 'object') {
    return value.display;
  }
  return String(value);
}

function formatResult(result: LabResultObs | null): string {
  if (!result) {
    return '—';
  }
  const members = result.groupMembers ?? [];
  if (members.length > 0) {
    return members
      .map((member) => {
        const flag = member.interpretation ? ` (${member.interpretation.toLowerCase()})` : '';
        return `${member.concept.display}: ${formatValue(member.value)}${flag}`;
      })
      .join('; ');
  }
  const flag = result.interpretation ? ` (${result.interpretation.toLowerCase()})` : '';
  return `${formatValue(result.value)}${flag}`;
}

/** A test is final once its result is in or the lab has rejected it; anything else is still pending. */
function isOrderFinal(order: LabOrderWithResult): boolean {
  return (
    !!order.result ||
    order.fulfillerStatus === 'COMPLETED' ||
    order.fulfillerStatus === 'DECLINED' ||
    order.fulfillerStatus === 'EXCEPTION'
  );
}

function getOrderStatus(order: LabOrderWithResult): { label: string; type: TagType } {
  if (order.result || order.fulfillerStatus === 'COMPLETED') {
    return { label: 'Completed', type: 'green' };
  }
  switch (order.fulfillerStatus) {
    case 'IN_PROGRESS':
      return { label: 'In progress', type: 'blue' };
    case 'RECEIVED':
      return { label: 'Received', type: 'cyan' };
    case 'ON_HOLD':
      return { label: 'On hold', type: 'warm-gray' };
    case 'DECLINED':
      return { label: 'Rejected', type: 'red' };
    case 'EXCEPTION':
      return { label: 'Exception', type: 'red' };
    default:
      return { label: 'Ordered', type: 'gray' };
  }
}

const headers = [
  { key: 'test', header: 'Test' },
  { key: 'ordered', header: 'Ordered' },
  { key: 'status', header: 'Status' },
  { key: 'result', header: 'Result' },
];

const CardHeader: React.FC<{ onRefresh: () => void; isRefreshing: boolean }> = ({ onRefresh, isRefreshing }) => (
  <div className={styles.header}>
    <h4 className={styles.title}>Today&apos;s lab results &amp; consultation</h4>
    <Button kind="ghost" size="sm" renderIcon={Renew} onClick={onRefresh} disabled={isRefreshing}>
      Refresh
    </Button>
  </div>
);

/** Stands in for the consultation summary and the results table while they load. */
const CardBodySkeleton: React.FC<{ rowCount: number }> = ({ rowCount }) => (
  <>
    <div className={styles.consultation}>
      <div className={styles.consultationDetails}>
        <SkeletonText heading width="320px" />
        <SkeletonText width="220px" />
      </div>
    </div>
    <DataTableSkeleton
      headers={headers}
      columnCount={headers.length}
      rowCount={rowCount}
      showHeader={false}
      showToolbar={false}
      size="sm"
      zebra
    />
  </>
);

const ConsultationResultsExtension: React.FC<ConsultationResultsExtensionProps> = ({
  patientUuid: patientUuidProp,
}) => {
  const { patientUuid: chartPatientUuid } = usePatient();
  const patientUuid = patientUuidProp ?? chartPatientUuid;
  const { consultationResults } = useConfig<ConfigObject>();
  const {
    consultationEncounterTypeUuid,
    consultationFormUuids,
    consultationFormName,
    primaryDiagnosisRank,
    testOrderTypeUuid,
  } = consultationResults;

  const {
    orders,
    error: ordersError,
    isLoading: isLoadingOrders,
    mutate: mutateOrders,
  } = useTodaysLabOrders(patientUuid, testOrderTypeUuid);
  const {
    consultation,
    error: consultationError,
    isLoading: isLoadingConsultation,
    mutate: mutateConsultation,
  } = useTodaysConsultation(patientUuid, consultationEncounterTypeUuid, consultationFormUuids);

  // Only a clinician-initiated refresh shows the skeleton; the background polling updates silently.
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isCompleteAnywayOpen, setIsCompleteAnywayOpen] = useState(false);
  const refresh = useCallback(async () => {
    setIsRefreshing(true);
    try {
      await Promise.all([mutateOrders(), mutateConsultation()]);
    } finally {
      setIsRefreshing(false);
    }
  }, [mutateOrders, mutateConsultation]);

  const openConsultationForm = useCallback(() => {
    if (consultation) {
      launchWorkspace2(PATIENT_FORM_ENTRY_WORKSPACE, {
        form: {
          uuid: consultation.form?.uuid ?? consultationFormUuids[0],
          display: consultation.form?.display ?? consultationFormName,
        },
        encounterUuid: consultation.uuid,
      });
    } else {
      launchWorkspace2(PATIENT_FORM_ENTRY_WORKSPACE, {
        form: { uuid: consultationFormUuids[0], display: consultationFormName },
      });
    }
  }, [consultation, consultationFormUuids, consultationFormName]);

  if (isLoadingOrders || isLoadingConsultation) {
    return (
      <div className={styles.container}>
        <CardHeader onRefresh={refresh} isRefreshing />
        <CardBodySkeleton rowCount={2} />
      </div>
    );
  }

  // Nothing to act on today: keep the patient summary uncluttered.
  if (!orders.length && !consultation && !ordersError && !consultationError) {
    return null;
  }

  const primaryDiagnoses = (consultation?.diagnoses ?? []).filter(
    (diagnosis) => !diagnosis.voided && diagnosis.rank === primaryDiagnosisRank,
  );
  const isConsultationComplete = primaryDiagnoses.length > 0;
  const pendingOrders = orders.filter((order) => !isOrderFinal(order));
  const rejectedOrders = orders.filter(
    (order) => !order.result && (order.fulfillerStatus === 'DECLINED' || order.fulfillerStatus === 'EXCEPTION'),
  );
  // Completing (adding the final diagnosis) only makes sense once every test is resulted or rejected.
  const isAwaitingLabs = !!consultation && !isConsultationComplete && pendingOrders.length > 0;
  // Saved without a final diagnosis and no lab work ordered: nothing is blocking, the diagnosis is simply missing.
  const isDiagnosisMissingWithoutLabs = !!consultation && !isConsultationComplete && orders.length === 0;

  const rows = orders.map((order) => {
    const status = getOrderStatus(order);
    return {
      id: order.uuid,
      test: order.concept.display,
      ordered: formatTime(parseDate(order.dateActivated)),
      status: (
        <Tag size="sm" type={status.type}>
          {status.label}
        </Tag>
      ),
      result: <span className={styles.result}>{formatResult(order.result)}</span>,
    };
  });

  return (
    <div className={styles.container}>
      <CardHeader onRefresh={refresh} isRefreshing={isRefreshing} />

      {isRefreshing ? (
        <CardBodySkeleton rowCount={Math.max(orders.length, 1)} />
      ) : (
        <>
          {(ordersError || consultationError) && (
            <InlineNotification
              kind="error"
              lowContrast
              hideCloseButton
              title="Could not load today's lab results or consultation."
              subtitle={(ordersError ?? consultationError)?.message}
            />
          )}

          <div className={styles.consultation}>
            <div className={styles.consultationDetails}>
              {consultation ? (
                <>
                  <span className={styles.consultationName}>
                    {consultation.form?.display ?? consultationFormName} · saved{' '}
                    {formatDatetime(parseDate(consultation.encounterDatetime), { mode: 'wide' })}
                  </span>
                  <div className={styles.diagnosisRow}>
                    <span className={styles.diagnosisLabel}>Primary diagnosis</span>
                    {isConsultationComplete ? (
                      <span className={styles.diagnosisValue}>
                        {primaryDiagnoses.map((diagnosis) => diagnosis.display).join(', ')}
                      </span>
                    ) : (
                      <Tag
                        className={styles.diagnosisTag}
                        size="md"
                        type={isDiagnosisMissingWithoutLabs ? 'gray' : 'purple'}
                        renderIcon={isDiagnosisMissingWithoutLabs ? WarningAlt : Time}
                      >
                        {isDiagnosisMissingWithoutLabs ? 'Not recorded' : 'Pending'}
                      </Tag>
                    )}
                  </div>
                </>
              ) : (
                <span className={styles.consultationName}>No consultation saved today</span>
              )}
              {!isConsultationComplete && !isAwaitingLabs && orders.length > 0 && (
                <span className={styles.helper}>
                  {pendingOrders.length > 0
                    ? `${pendingOrders.length} of ${orders.length} lab test(s) still awaiting results`
                    : rejectedOrders.length > 0
                      ? `All lab tests are back (${rejectedOrders.length} rejected by the lab)`
                      : 'All lab results are back'}
                </span>
              )}
            </div>
            <Button
              kind={isConsultationComplete ? 'tertiary' : 'primary'}
              size="sm"
              onClick={openConsultationForm}
              disabled={isAwaitingLabs}
            >
              {!consultation
                ? 'Start consultation'
                : isConsultationComplete
                  ? 'View consultation'
                  : isAwaitingLabs
                    ? `Awaiting results (${pendingOrders.length})`
                    : 'Complete consultation'}
            </Button>
          </div>

          {isDiagnosisMissingWithoutLabs && (
            <InlineNotification
              kind="info"
              lowContrast
              hideCloseButton
              className={styles.awaitingNotice}
              title="Primary diagnosis not recorded"
              subtitle="No lab tests were ordered today, so nothing is holding this consultation. Click Complete consultation to add the primary diagnosis."
            />
          )}

          {isAwaitingLabs && (
            <ActionableNotification
              inline
              kind="warning"
              lowContrast
              hideCloseButton
              hasFocus={false}
              className={styles.awaitingNotice}
              title="Waiting for lab results"
              subtitle={
                <span className={styles.awaitingDetails}>
                  <span>
                    {pendingOrders
                      .map(
                        (order) =>
                          `${order.concept.display} (${getOrderStatus(order).label}, ${formatTime(parseDate(order.dateActivated))})`,
                      )
                      .join(', ')}
                  </span>
                  <span>Complete consultation unlocks when every test is resulted or rejected.</span>
                </span>
              }
              actionButtonLabel="Complete anyway"
              onActionButtonClick={() => setIsCompleteAnywayOpen(true)}
            />
          )}

          {orders.length > 0 ? (
            <DataTable rows={rows} headers={headers} size="sm" useZebraStyles>
              {({ rows, headers, getTableProps, getHeaderProps, getRowProps }) => (
                <TableContainer>
                  <Table {...getTableProps()}>
                    <TableHead>
                      <TableRow>
                        {headers.map((header) => (
                          <TableHeader {...getHeaderProps({ header })} key={header.key}>
                            {header.header}
                          </TableHeader>
                        ))}
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {rows.map((row) => (
                        <TableRow {...getRowProps({ row })} key={row.id}>
                          {row.cells.map((cell) => (
                            <TableCell key={cell.id}>{cell.value}</TableCell>
                          ))}
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              )}
            </DataTable>
          ) : (
            !isDiagnosisMissingWithoutLabs && <p className={styles.helper}>No lab tests ordered today.</p>
          )}
        </>
      )}

      <Modal
        open={isCompleteAnywayOpen}
        danger
        size="sm"
        modalHeading="Complete consultation without all lab results?"
        primaryButtonText="Complete anyway"
        secondaryButtonText="Wait for results"
        onRequestClose={() => setIsCompleteAnywayOpen(false)}
        onSecondarySubmit={() => setIsCompleteAnywayOpen(false)}
        onRequestSubmit={() => {
          setIsCompleteAnywayOpen(false);
          openConsultationForm();
        }}
      >
        <div className={styles.modalBody}>
          <p className={styles.modalIntro}>
            {pendingOrders.length === 1
              ? '1 lab test ordered today has no result yet.'
              : `${pendingOrders.length} lab tests ordered today have no result yet.`}
          </p>

          <div className={styles.pendingSection}>
            <span className={styles.pendingSectionTitle}>Pending lab tests</span>
            <ul className={styles.pendingList}>
              {pendingOrders.map((order) => {
                const status = getOrderStatus(order);
                return (
                  <li key={order.uuid} className={styles.pendingItem}>
                    <span className={styles.pendingTest}>{order.concept.display}</span>
                    <span className={styles.pendingMeta}>
                      <Tag size="sm" type={status.type}>
                        {status.label}
                      </Tag>
                      <span className={styles.helper}>Ordered {formatTime(parseDate(order.dateActivated))}</span>
                    </span>
                  </li>
                );
              })}
            </ul>
          </div>

          <InlineNotification
            kind="warning"
            lowContrast
            hideCloseButton
            className={styles.modalNotice}
            title="Final diagnosis without these results"
            subtitle="The diagnosis will be recorded before these results are available. Review them when they come back and update the consultation if needed."
          />
        </div>
      </Modal>
    </div>
  );
};

export default ConsultationResultsExtension;
