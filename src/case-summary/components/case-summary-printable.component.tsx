import React from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, Tag } from '@carbon/react';
import { useSession } from '@openmrs/esm-framework';
import { type VisitCaseSummary } from '../types/case-summary.types';
import {
  EMPTY_VALUE,
  formatDateSafe,
  formatDateTimeSafe,
  interpretationLabel,
  interpretationTagType,
  mapAllergyRow,
} from './case-summary-printable.utils';
import styles from './case-summary-printable.component.scss';

interface CaseSummaryPrintableProps {
  summary: VisitCaseSummary;
}

const CaseSummaryPrintable = React.forwardRef<HTMLDivElement, CaseSummaryPrintableProps>(({ summary }, ref) => {
  const session = useSession();
  const {
    demographics,
    groups,
    inpatientDetails,
    visit,
    visitUuids,
    vitals,
    clinicalNotes,
    conditions,
    medications,
    labOrders,
    labResultsUnavailable,
  } = summary;

  const allergyRows = (groups.allergies ?? []).map(mapAllergyRow);
  // The section is "Active Medications" — the resource layer returns every drug
  // order on the visit (with an `active` flag) so this is a presentation choice.
  const activeMedications = medications.filter((m) => m.active);

  return (
    <div className={styles.document} ref={ref}>
      <header className={styles.header}>
        <div className={styles.facility}>{session?.sessionLocation?.display ?? EMPTY_VALUE}</div>
        <h3 className={styles.title}>Patient Clinical Summary</h3>
        <div className={styles.visitMeta}>
          {visit.display ?? visit.visitType ?? 'Visit'} · {formatDateSafe(visit.startDatetime)}
          {/* Say so when the day's visits were combined, so a reader isn't left
              wondering why the content spans more than the named visit. */}
          {visitUuids.length > 1 ? ` · ${visitUuids.length} visits combined` : ''}
        </div>
      </header>

      <section className={styles.section}>
        <h5 className={styles.sectionTitle}>Demographics</h5>
        <div className={styles.keyValueGrid}>
          <KeyValue label="Name" value={demographics.name || EMPTY_VALUE} />
          <KeyValue label="DOB" value={formatDateSafe(demographics.birthDate)} />
          <KeyValue label="Gender" value={demographics.gender ?? EMPTY_VALUE} />
          <KeyValue label="Patient ID" value={demographics.patientId ?? EMPTY_VALUE} />
          <KeyValue label="National ID" value={demographics.nationalId ?? EMPTY_VALUE} />
          <KeyValue label="CR Number" value={demographics.crNumber ?? EMPTY_VALUE} />
        </div>
      </section>

      <section className={styles.section}>
        <h5 className={styles.sectionTitle}>Allergies</h5>
        {allergyRows.length ? (
          <Table size="sm" aria-label="allergies" useZebraStyles>
            <TableHead>
              <TableRow>
                <TableHeader>Substance</TableHeader>
                <TableHeader>Criticality</TableHeader>
                <TableHeader>Reaction</TableHeader>
              </TableRow>
            </TableHead>
            <TableBody>
              {allergyRows.map((row, i) => (
                <TableRow key={i}>
                  <TableCell>{row.substance}</TableCell>
                  <TableCell>{row.criticality}</TableCell>
                  <TableCell>{row.reaction}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        ) : (
          <p className={styles.empty}>No known allergies recorded.</p>
        )}
      </section>

      <section className={styles.section}>
        <h5 className={styles.sectionTitle}>Active Diagnoses</h5>
        {conditions.length ? (
          <Table size="sm" aria-label="active diagnoses" useZebraStyles>
            <TableHead>
              <TableRow>
                <TableHeader>ICD-11</TableHeader>
                <TableHeader>Description</TableHeader>
                <TableHeader>Certainty</TableHeader>
                <TableHeader>Primary</TableHeader>
              </TableRow>
            </TableHead>
            <TableBody>
              {conditions.map((row, i) => (
                <TableRow key={i}>
                  <TableCell className={styles.mono}>{row.code ?? EMPTY_VALUE}</TableCell>
                  <TableCell>{row.description}</TableCell>
                  <TableCell>{row.certainty ?? EMPTY_VALUE}</TableCell>
                  <TableCell>{row.primary ? 'Yes' : EMPTY_VALUE}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        ) : (
          <p className={styles.empty}>No active diagnoses recorded.</p>
        )}
      </section>

      <section className={styles.section}>
        <h5 className={styles.sectionTitle}>Latest Vitals</h5>
        <div className={styles.keyValueGrid}>
          {vitals.map((row) => (
            <KeyValue key={row.label} label={row.label} value={row.value ?? EMPTY_VALUE} />
          ))}
        </div>
      </section>

      <section className={styles.section}>
        <h5 className={styles.sectionTitle}>Active Medications</h5>
        {activeMedications.length ? (
          <Table size="sm" aria-label="active medications" useZebraStyles>
            <TableHead>
              <TableRow>
                <TableHeader>Date</TableHeader>
                <TableHeader>Drug Name</TableHeader>
                <TableHeader>Dose</TableHeader>
                <TableHeader>Route</TableHeader>
                <TableHeader>Frequency</TableHeader>
                <TableHeader>Duration</TableHeader>
              </TableRow>
            </TableHead>
            <TableBody>
              {activeMedications.map((row, i) => (
                <TableRow key={i}>
                  <TableCell>{formatDateSafe(row.date)}</TableCell>
                  <TableCell>{row.drug}</TableCell>
                  <TableCell>{row.dose ?? EMPTY_VALUE}</TableCell>
                  <TableCell>{row.route ?? EMPTY_VALUE}</TableCell>
                  <TableCell>{row.frequency ?? EMPTY_VALUE}</TableCell>
                  <TableCell>{row.duration ?? EMPTY_VALUE}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        ) : (
          <p className={styles.empty}>No active medications recorded.</p>
        )}
      </section>

      <section className={styles.section}>
        <h5 className={styles.sectionTitle}>Test Results</h5>
        {/* Three distinct states, which is the point of this section: nothing ordered,
            ordered but not yet resulted, and ordered but the lookup failed. A failed
            lookup is reported *alongside* the orders, never instead of them — which
            tests were requested is useful even when their values can't be shown. */}
        {!labOrders.length ? (
          <p className={styles.empty}>No tests were ordered during this visit.</p>
        ) : (
          <div className={styles.testOrders}>
            {labResultsUnavailable ? (
              <p className={styles.empty}>Results could not be retrieved — the tests ordered are listed below.</p>
            ) : null}
            {labOrders.map((order) => (
              <div key={order.uuid} className={styles.testOrder}>
                <div className={styles.testOrderHead}>
                  <span className={styles.testOrderName}>{order.test || EMPTY_VALUE}</span>
                  <span className={styles.testOrderMeta}>Ordered {formatDateSafe(order.orderedDate)}</span>
                  {order.pending ? (
                    <Tag size="sm" type="gray">
                      Pending
                    </Tag>
                  ) : null}
                </div>
                {order.results.length ? (
                  <Table size="sm" aria-label={`results for ${order.test}`} useZebraStyles>
                    <TableHead>
                      <TableRow>
                        <TableHeader>Test</TableHeader>
                        <TableHeader>Result</TableHeader>
                        <TableHeader>Units</TableHeader>
                        <TableHeader>Reference</TableHeader>
                        <TableHeader>Date</TableHeader>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {order.results.map((row, i) => (
                        <TableRow key={row.conceptUuid ?? i}>
                          <TableCell>{row.panel && row.panel !== row.test ? `${row.panel} · ${row.test}` : row.test}</TableCell>
                          <TableCell>
                            <span className={row.abnormal ? styles.abnormalValue : undefined}>{row.value}</span>
                            {row.abnormal ? (
                              <Tag size="sm" type={interpretationTagType(row.interpretation)}>
                                {interpretationLabel(row.interpretation)}
                              </Tag>
                            ) : null}
                          </TableCell>
                          <TableCell>{row.units ?? EMPTY_VALUE}</TableCell>
                          <TableCell>{row.range ?? EMPTY_VALUE}</TableCell>
                          <TableCell>{formatDateSafe(row.datetime)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                ) : (
                  <p className={styles.empty}>Awaiting results.</p>
                )}
              </div>
            ))}
          </div>
        )}
      </section>

      <section className={styles.section}>
        <h5 className={styles.sectionTitle}>Clinical Notes</h5>
        {clinicalNotes.length ? (
          <div className={styles.notes}>
            {clinicalNotes.map((note) => (
              <div key={note.encounterUuid} className={styles.noteEntry}>
                <div className={styles.noteHead}>
                  <span className={styles.noteName}>{note.encounterType ?? note.display ?? 'Encounter'}</span>
                  {note.datetime ? <span className={styles.noteTime}>{formatDateTimeSafe(note.datetime)}</span> : null}
                </div>
                {/* A label/value grid rather than run-on "LABEL: value" lines — with a
                    dozen fields per encounter, aligned columns are the difference
                    between scannable and a wall of text. */}
                <dl className={styles.noteFields}>
                  {note.obs.map((o, i) => (
                    <React.Fragment key={i}>
                      {o.label ? (
                        <>
                          <dt className={styles.noteLabel}>{o.label}</dt>
                          <dd className={styles.noteValue}>{o.value}</dd>
                        </>
                      ) : (
                        // No "LABEL: value" split was possible — let it run full width.
                        <dd className={styles.noteValueFull}>{o.value}</dd>
                      )}
                    </React.Fragment>
                  ))}
                </dl>
              </div>
            ))}
          </div>
        ) : (
          <p className={styles.empty}>No clinical notes recorded.</p>
        )}
      </section>

      {/* Omitted entirely for an outpatient visit — a heading over "not applicable" is
          just noise on a printed page. `inpatientDetails` is only set when the visit
          carries an ADT encounter. */}
      {inpatientDetails ? (
        <section className={styles.section}>
          <h5 className={styles.sectionTitle}>Inpatient Details</h5>
          <div className={styles.keyValueGrid}>
            <KeyValue label="Admission Date" value={formatDateSafe(inpatientDetails.admissionDate)} />
            <KeyValue label="Status" value={inpatientDetails.status ?? EMPTY_VALUE} />
            <KeyValue label="Ward" value={inpatientDetails.ward ?? EMPTY_VALUE} />
            <KeyValue label="Doctor" value={inpatientDetails.doctor ?? EMPTY_VALUE} />
            <KeyValue label="Discharge Date" value={formatDateSafe(inpatientDetails.dischargeDate)} />
          </div>
        </section>
      ) : null}
    </div>
  );
});

CaseSummaryPrintable.displayName = 'CaseSummaryPrintable';

const KeyValue: React.FC<{ label: string; value: string }> = ({ label, value }) => (
  <div className={styles.keyValueItem}>
    <span className={styles.keyValueLabel}>{label}</span>
    <span className={styles.keyValueValue}>{value}</span>
  </div>
);

export default CaseSummaryPrintable;
