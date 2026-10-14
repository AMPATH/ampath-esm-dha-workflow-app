import dayjs from 'dayjs';
import type {
  ShrAnnotation,
  ShrAnyResource,
  ShrCodeableConcept,
  ShrCondition,
  ShrDosageInstruction,
  ShrEncounter,
  ShrEpisodeOfCare,
  ShrAllergyIntolerance,
  ShrImmunization,
  ShrMedicationAdministration,
  ShrMedicationDispense,
  ShrMedicationRequest,
  ShrObservation,
  ShrPatient,
  ShrProcedure,
  ShrQuantity,
  ShrReaction,
  ShrReference,
  ShrServiceRequest,
  ShrSpecimen,
} from '../shr.types';
import { lookupCodeDisplay } from '../shr-terminology.resource';

/**
 * Plain-language presentation of SHR resources.
 *
 * This deliberately does *not* mirror the raw field-by-field resource inspector
 * in `ampath-esm-hie-registry-manager-app` (`shr-condition`,
 * `shr-medication-request/…`, and friends). Those components were read only to
 * learn which fields each resource actually carries; the labels and column
 * choices here are written for a clinician, so no FHIR field name, resource-type
 * internal, coding system or raw JSON reaches the screen.
 */

export const NOT_RECORDED = '—';

export interface ShrColumn {
  key: string;
  header: string;
}

export interface ShrDetailField {
  label: string;
  value: string;
}

export interface ShrRow {
  id: string;
  /** Column key → display string. */
  cells: Record<string, string>;
  details: ShrDetailField[];
  /** Value shown as the status tag in the table, if this category has one. */
  statusKey?: string;
  /** Timestamp used to sort rows newest-first; empty when the resource carries no date. */
  sortDate: string;
}

interface ResourcePresenter {
  columns: ShrColumn[];
  /** Which column (if any) renders as a status tag rather than plain text. */
  statusColumn?: string;
  present: (resource: any) => { cells: Record<string, string>; details: ShrDetailField[] };
  sortDate?: (resource: any) => string;
}

// ── small formatting helpers ─────────────────────────────────────────────────

/**
 * Human text for a codeable concept: its text, else a coding's display, else the
 * display for its code in the bundled copy of its code system (see
 * `shr-terminology.resource`), else its bare code.
 */
export function conceptText(concept?: ShrCodeableConcept): string {
  if (!concept) {
    return '';
  }
  if (concept.text?.trim()) {
    return concept.text.trim();
  }
  const coding = concept.coding?.find((c) => c?.display?.trim()) ?? concept.coding?.find((c) => c?.code?.trim());
  const resolved = lookupCodeDisplay(coding?.system, coding?.code);
  return (coding?.display || resolved || coding?.code || '').trim();
}

function conceptList(concepts?: ShrCodeableConcept[]): string {
  return (concepts ?? []).map(conceptText).filter(Boolean).join(', ');
}

/** "in-progress" → "In progress"; "ACTIVE" → "Active". */
export function humanise(value?: string | null): string {
  const raw = String(value ?? '').trim();
  if (!raw) {
    return '';
  }
  const spaced = raw.replace(/[-_]+/g, ' ').toLowerCase();
  return spaced.charAt(0).toUpperCase() + spaced.slice(1);
}

/** Date only — what the table columns show. */
export function formatDay(value?: string | null): string {
  if (!value) {
    return '';
  }
  const parsed = dayjs(value);
  return parsed.isValid() ? parsed.format('DD MMM YYYY') : String(value);
}

/** Date and time — what the expanded detail panel shows when a time is meaningful. */
export function formatMoment(value?: string | null): string {
  if (!value) {
    return '';
  }
  const parsed = dayjs(value);
  if (!parsed.isValid()) {
    return String(value);
  }
  return /\d{2}:\d{2}/.test(String(value)) ? parsed.format('DD MMM YYYY, HH:mm') : parsed.format('DD MMM YYYY');
}

/** A person or organisation behind a reference: its display name, else its identifier. */
function referenceName(ref?: ShrReference): string {
  return (ref?.display || ref?.identifier?.value || '').trim();
}

function referenceNames(refs?: ShrReference[]): string {
  return (refs ?? []).map(referenceName).filter(Boolean).join(', ');
}

/** True when `resource.extension[]` carries the given url suffix with `valueBoolean: true`. */
function hasBooleanExtension(resource: any, urlSuffix: string): boolean {
  return (resource?.extension ?? []).some(
    (ext: any) => typeof ext?.url === 'string' && ext.url.endsWith(urlSuffix) && ext.valueBoolean === true,
  );
}

function noteText(notes?: ShrAnnotation[]): string {
  return (notes ?? [])
    .map((n) => n?.text?.trim())
    .filter(Boolean)
    .join(' · ');
}

function firstDate(...values: Array<string | undefined>): string {
  return values.find((v) => Boolean(v)) ?? '';
}

/** Drop empty rows so the detail panel never shows a label with nothing under it. */
function fields(entries: Array<[string, string]>): ShrDetailField[] {
  return entries.filter(([, value]) => Boolean(value?.trim())).map(([label, value]) => ({ label, value }));
}

/**
 * Carbon `Tag` colour for a status word, used for the status column.
 *
 * Allergy criticality rides the same tag slot (the allergy presenter tags its
 * Criticality column — the safety signal an allergy list exists to surface),
 * so its words are mapped first: `high` is the danger word.
 */
export function statusTagType(status: string): 'green' | 'blue' | 'red' | 'gray' | 'teal' | 'purple' {
  const s = status.trim().toLowerCase();
  if (!s) {
    return 'gray';
  }
  if (s === 'high') {
    return 'red';
  }
  if (s === 'unable-to-assess') {
    return 'purple';
  }
  if (s === 'low') {
    return 'gray';
  }
  if (/(^active|completed|final|confirmed|available|fulfilled|resolved)/.test(s)) {
    return 'green';
  }
  if (/(progress|pending|draft|preliminary|on hold|scheduled|amended)/.test(s)) {
    return 'blue';
  }
  if (/(stopped|cancel|revoked|error|refuted|unsatisfactory|failed|inactive)/.test(s)) {
    return 'red';
  }
  if (/(unknown|unconfirmed|provisional|differential)/.test(s)) {
    return 'purple';
  }
  return 'teal';
}

// ── per-resource presenters ──────────────────────────────────────────────────

const conditionPresenter: ResourcePresenter = {
  columns: [
    { key: 'condition', header: 'Condition' },
    { key: 'status', header: 'Status' },
    { key: 'onset', header: 'Onset' },
    { key: 'recorded', header: 'Recorded' },
  ],
  statusColumn: 'status',
  sortDate: (r: ShrCondition) => firstDate(r.recordedDate, r.onsetDateTime),
  present: (r: ShrCondition) => ({
    cells: {
      condition: conceptText(r.code),
      status: humanise(conceptText(r.clinicalStatus)),
      onset: formatDay(r.onsetDateTime),
      recorded: formatDay(r.recordedDate),
    },
    details: fields([
      ['Condition', conceptText(r.code)],
      ['Status', humanise(conceptText(r.clinicalStatus))],
      ['How certain', humanise(conceptText(r.verificationStatus))],
      ['Severity', humanise(conceptText(r.severity))],
      ['Grouping', conceptList(r.category)],
      ['Started', formatMoment(r.onsetDateTime)],
      ['Date recorded', formatMoment(r.recordedDate)],
      ['Recorded during', referenceName(r.encounter)],
      ['Notes', noteText(r.note)],
    ]),
  }),
};

/** The manifestations across reactions, for the table's Reaction column. */
function reactionSummary(reactions?: ShrReaction[]): string {
  return (reactions ?? [])
    .map((reaction) => conceptList(reaction?.manifestation))
    .filter(Boolean)
    .join('; ');
}

/**
 * Reactions for the detail panel: one passage per reaction — manifestations
 * (or, failing those, the reacting substance), then the severity in brackets —
 * joined with a middle dot. A reaction carrying only a severity still shows
 * ("(Severe)"), and an allergy with no reactions at all yields '' so `fields`
 * drops the row entirely.
 */
function reactionLines(reactions?: ShrReaction[]): string {
  return (reactions ?? [])
    .map((reaction) => {
      const what = conceptList(reaction?.manifestation) || conceptText(reaction?.substance);
      const severity = reaction?.severity ? `(${humanise(reaction.severity)})` : '';
      return [what, severity].filter(Boolean).join(' ');
    })
    .filter(Boolean)
    .join(' · ');
}

const allergyIntolerancePresenter: ResourcePresenter = {
  columns: [
    { key: 'allergy', header: 'Allergy' },
    { key: 'status', header: 'Status' },
    { key: 'criticality', header: 'Criticality' },
    { key: 'reaction', header: 'Reaction' },
    { key: 'recorded', header: 'Recorded' },
  ],
  // Criticality is the tagged column rather than status: a high-criticality
  // allergy is the one thing this list exists to shout about, and statusTagType
  // maps it to red. Clinical status reads fine as plain text beside it.
  statusColumn: 'criticality',
  // recordedDate is when the allergy was entered; onset/lastOccurrence are the
  // clinical dates it may carry instead, in that order of authority.
  sortDate: (r: ShrAllergyIntolerance) => firstDate(r.recordedDate, r.onsetDateTime, r.lastOccurrence),
  present: (r: ShrAllergyIntolerance) => ({
    cells: {
      allergy: conceptText(r.code),
      // AllergyIntolerance has no `status` — its workflow state is clinicalStatus.
      status: humanise(conceptText(r.clinicalStatus)),
      criticality: humanise(r.criticality),
      reaction: reactionSummary(r.reaction),
      recorded: formatDay(r.recordedDate),
    },
    details: fields([
      ['Allergy to', conceptText(r.code)],
      ['Kind', humanise(r.type)],
      ['Category', (r.category ?? []).map(humanise).filter(Boolean).join(', ')],
      ['Status', humanise(conceptText(r.clinicalStatus))],
      ['How certain', humanise(conceptText(r.verificationStatus))],
      ['Criticality', humanise(r.criticality)],
      ['Reactions', reactionLines(r.reaction)],
      ['Started', formatMoment(r.onsetDateTime)],
      ['Last reaction', formatMoment(r.lastOccurrence)],
      ['Recorded by', referenceName(r.recorder)],
      ['Recorded during', referenceName(r.encounter)],
      ['Date recorded', formatMoment(r.recordedDate)],
    ]),
  }),
};

/** "500 mg, 3 times daily for 7 days" assembled from whatever the SHR sent. */
function dosageSummary(r: { dosageInstruction?: ShrDosageInstruction[] }): string {
  const instruction = r.dosageInstruction?.[0];
  if (!instruction) {
    return '';
  }
  if (instruction.text?.trim()) {
    return instruction.text.trim();
  }
  const dose = instruction.doseAndRate?.[0]?.doseQuantity;
  const doseText = dose?.value != null ? `${dose.value}${dose.unit ? ` ${dose.unit}` : ''}` : '';
  const frequency = conceptText(instruction.timing?.code);
  const repeat = instruction.timing?.repeat;
  const duration = repeat?.duration != null ? `for ${repeat.duration} ${repeat.durationUnit ?? ''}`.trim() : '';
  return [doseText, frequency, duration].filter(Boolean).join(', ');
}

const medicationRequestPresenter: ResourcePresenter = {
  columns: [
    { key: 'medication', header: 'Medication' },
    { key: 'status', header: 'Status' },
    { key: 'dosage', header: 'Dosage' },
    { key: 'prescriber', header: 'Prescriber' },
    { key: 'date', header: 'Date' },
  ],
  statusColumn: 'status',
  sortDate: (r: ShrMedicationRequest) => firstDate(r.authoredOn, r.dispenseRequest?.validityPeriod?.start),
  present: (r: ShrMedicationRequest) => {
    const instruction = r.dosageInstruction?.[0];
    return {
      cells: {
        medication: conceptText(r.medicationCodeableConcept),
        status: humanise(r.status),
        dosage: dosageSummary(r),
        prescriber: referenceName(r.requester),
        date: formatDay(r.authoredOn),
      },
      details: fields([
        ['Medication', conceptText(r.medicationCodeableConcept)],
        ['Status', humanise(r.status)],
        ['Dosage', dosageSummary(r)],
        ['How to take it', conceptText(instruction?.route)],
        ['Only as needed', instruction?.asNeededBoolean ? 'Yes' : ''],
        ['Urgency', humanise(r.priority)],
        ['Repeats allowed', r.dispenseRequest?.numberOfRepeatsAllowed?.toString() ?? ''],
        ['Valid from', formatMoment(r.dispenseRequest?.validityPeriod?.start)],
        ['Prescribed by', referenceName(r.requester)],
        ['Date prescribed', formatMoment(r.authoredOn)],
        ['Prescribed during', referenceName(r.encounter)],
        ['Notes', noteText(r.note)],
      ]),
    };
  },
};

const encounterPresenter: ResourcePresenter = {
  columns: [
    { key: 'visit', header: 'Visit' },
    { key: 'status', header: 'Status' },
    { key: 'facility', header: 'Facility' },
    { key: 'started', header: 'Started' },
    { key: 'ended', header: 'Ended' },
  ],
  statusColumn: 'status',
  sortDate: (r: ShrEncounter) => firstDate(r.period?.start, r.period?.end),
  present: (r: ShrEncounter) => ({
    cells: {
      visit: conceptList(r.type) || r.class?.display || '',
      status: humanise(r.status),
      facility: referenceName(r.serviceProvider),
      started: formatDay(r.period?.start),
      ended: formatDay(r.period?.end),
    },
    details: fields([
      ['Visit', conceptList(r.type)],
      ['Setting', r.class?.display ?? ''],
      ['Status', humanise(r.status)],
      ['Urgency', humanise(conceptText(r.priority))],
      ['Facility', referenceName(r.serviceProvider)],
      ['Started', formatMoment(r.period?.start)],
      ['Ended', formatMoment(r.period?.end)],
      [
        'Seen by',
        (r.participant ?? [])
          .map((p) => (p?.individual?.display || p?.individual?.identifier?.value || '').trim())
          .filter(Boolean)
          .join(', '),
      ],
    ]),
  }),
};

/**
 * The episode's facility. Episodes reference organizations by bare
 * `Organization/FID-…` references with no display name (unlike this SHR's
 * encounters, which carry one), so fall through to the id segment — a facility
 * code is meaningful on its own where a bare encounter id would not be.
 */
function episodeFacility(r: ShrEpisodeOfCare): string {
  return referenceName(r.managingOrganization) || r.managingOrganization?.reference?.split('/').pop() || '';
}

const episodeOfCarePresenter: ResourcePresenter = {
  columns: [
    { key: 'episode', header: 'Episode' },
    { key: 'status', header: 'Status' },
    { key: 'facility', header: 'Facility' },
    { key: 'started', header: 'Started' },
    { key: 'ended', header: 'Ended' },
  ],
  statusColumn: 'status',
  sortDate: (r: ShrEpisodeOfCare) => firstDate(r.period?.start, r.period?.end),
  present: (r: ShrEpisodeOfCare) => ({
    cells: {
      episode: conceptList(r.type),
      status: humanise(r.status),
      facility: episodeFacility(r),
      started: formatDay(r.period?.start),
      ended: formatDay(r.period?.end),
    },
    details: fields([
      ['Episode', conceptList(r.type)],
      ['Status', humanise(r.status)],
      ['Facility', episodeFacility(r)],
      ['Started', formatMoment(r.period?.start)],
      ['Ended', formatMoment(r.period?.end)],
      ['Care manager', referenceName(r.careManager)],
    ]),
  }),
};

/** A quantity with its unit when one was sent: "10 tablets". */
function quantityText(quantity?: ShrQuantity): string {
  return quantity?.value != null ? `${quantity.value}${quantity?.unit ? ` ${quantity.unit}` : ''}` : '';
}

const immunizationPresenter: ResourcePresenter = {
  columns: [
    { key: 'vaccine', header: 'Vaccine' },
    { key: 'status', header: 'Status' },
    { key: 'date', header: 'Given' },
  ],
  statusColumn: 'status',
  sortDate: (r: ShrImmunization) => r.occurrenceDateTime ?? '',
  present: (r: ShrImmunization) => ({
    cells: {
      vaccine: conceptText(r.vaccineCode),
      status: humanise(r.status),
      // occurrence[x] may be a bare string ("sometime in childhood") — show it
      // as-is rather than as a mis-formatted date.
      date: formatDay(r.occurrenceDateTime) || r.occurrenceString || '',
    },
    details: fields([
      ['Vaccine', conceptText(r.vaccineCode)],
      ['Status', humanise(r.status)],
      ['Not given because', conceptText(r.statusReason)],
      ['Dose', quantityText(r.doseQuantity)],
      ['Batch', r.lotNumber ?? ''],
      ['Manufacturer', referenceName(r.manufacturer)],
      ['Given at', referenceName(r.encounter)],
      ['Given by', referenceNames(r.performer?.map((p) => p?.actor))],
      ['Date given', formatMoment(r.occurrenceDateTime) || r.occurrenceString || ''],
      ['Notes', noteText(r.note)],
    ]),
  }),
};

const procedurePresenter: ResourcePresenter = {
  columns: [
    { key: 'procedure', header: 'Procedure' },
    { key: 'status', header: 'Status' },
    { key: 'when', header: 'When' },
    { key: 'doneBy', header: 'Done by' },
  ],
  statusColumn: 'status',
  sortDate: (r: ShrProcedure) => firstDate(r.performedDateTime, r.performedPeriod?.start),
  present: (r: ShrProcedure) => ({
    cells: {
      procedure: conceptText(r.code),
      status: humanise(r.status),
      // performed[x] may be a bare string — show it as-is, like immunizations.
      when: formatDay(firstDate(r.performedDateTime, r.performedPeriod?.start)) || r.performedString || '',
      doneBy: referenceNames(r.performer?.map((p) => p?.actor)),
    },
    details: fields([
      ['Procedure', conceptText(r.code)],
      ['Status', humanise(r.status)],
      ['Not done because', conceptText(r.statusReason)],
      ['Grouping', conceptList(r.category)],
      ['Reason', conceptList(r.reasonCode)],
      ['When', formatMoment(firstDate(r.performedDateTime, r.performedPeriod?.start)) || r.performedString || ''],
      ['Done by', referenceNames(r.performer?.map((p) => p?.actor))],
      ['Reported by', referenceName(r.asserter)],
      ['Recorded during', referenceName(r.encounter)],
      ['Date recorded', formatMoment(r.recordedDate)],
      ['Notes', noteText(r.note)],
    ]),
  }),
};

const medicationDispensePresenter: ResourcePresenter = {
  columns: [
    { key: 'medication', header: 'Medication' },
    { key: 'status', header: 'Status' },
    { key: 'quantity', header: 'Quantity' },
    { key: 'handedOver', header: 'Handed over' },
  ],
  statusColumn: 'status',
  sortDate: (r: ShrMedicationDispense) => firstDate(r.whenHandedOver, r.whenPrepared),
  present: (r: ShrMedicationDispense) => ({
    cells: {
      medication: conceptText(r.medicationCodeableConcept),
      status: humanise(r.status),
      quantity: quantityText(r.quantity),
      handedOver: formatDay(r.whenHandedOver),
    },
    details: fields([
      ['Medication', conceptText(r.medicationCodeableConcept)],
      ['Status', humanise(r.status)],
      ['Not dispensed because', conceptText(r.statusReason)],
      ['Quantity', quantityText(r.quantity)],
      ['Days supply', quantityText(r.daysSupply)],
      ['Dosage', dosageSummary(r)],
      ['Handed over', formatMoment(r.whenHandedOver)],
      ['Prepared on', formatMoment(r.whenPrepared)],
      ['Dispensed by', referenceNames(r.performer?.map((p) => p?.actor))],
      ['Notes', noteText(r.note)],
    ]),
  }),
};

const medicationAdministrationPresenter: ResourcePresenter = {
  columns: [
    { key: 'medication', header: 'Medication' },
    { key: 'status', header: 'Status' },
    { key: 'given', header: 'Given' },
  ],
  statusColumn: 'status',
  sortDate: (r: ShrMedicationAdministration) => firstDate(r.effectiveDateTime, r.effectivePeriod?.start),
  present: (r: ShrMedicationAdministration) => ({
    cells: {
      medication: conceptText(r.medicationCodeableConcept),
      status: humanise(r.status),
      given: formatDay(firstDate(r.effectiveDateTime, r.effectivePeriod?.start)),
    },
    details: fields([
      ['Medication', conceptText(r.medicationCodeableConcept)],
      ['Status', humanise(r.status)],
      // Array on Administration (a CodeableConcept on Dispense) — several
      // reasons can come back together.
      ['Not given because', conceptList(r.statusReason)],
      ['Dosage', r.dosage?.text ?? quantityText(r.dosage?.dose)],
      ['Given at', formatMoment(firstDate(r.effectiveDateTime, r.effectivePeriod?.start))],
      ['Given by', referenceNames(r.performer?.map((p) => p?.actor))],
      ['Notes', noteText(r.note)],
    ]),
  }),
};

/** The observation's result, whichever `value[x]` the SHR happened to send. */
function observationResult(r: ShrObservation): string {
  const coded = conceptText(r.valueCodeableConcept);
  if (coded) {
    return coded;
  }
  if (r.valueQuantity?.value != null) {
    return `${r.valueQuantity.value}${r.valueQuantity.unit ? ` ${r.valueQuantity.unit}` : ''}`;
  }
  if (r.valueString?.trim()) {
    return r.valueString.trim();
  }
  if (typeof r.valueInteger === 'number') {
    return String(r.valueInteger);
  }
  if (typeof r.valueBoolean === 'boolean') {
    return r.valueBoolean ? 'Yes' : 'No';
  }
  return '';
}

const observationPresenter: ResourcePresenter = {
  columns: [
    { key: 'test', header: 'Test' },
    { key: 'result', header: 'Result' },
    { key: 'status', header: 'Status' },
    { key: 'date', header: 'Date' },
  ],
  statusColumn: 'status',
  sortDate: (r: ShrObservation) => firstDate(r.effectiveDateTime, r.effectivePeriod?.start, r.issued),
  present: (r: ShrObservation) => ({
    cells: {
      test: conceptText(r.code),
      result: observationResult(r),
      status: humanise(r.status),
      date: formatDay(firstDate(r.effectiveDateTime, r.effectivePeriod?.start, r.issued)),
    },
    details: fields([
      ['Test', conceptText(r.code)],
      ['Result', observationResult(r)],
      ['Status', humanise(r.status)],
      ['What it means', conceptList(r.interpretation)],
      ['Date taken', formatMoment(firstDate(r.effectiveDateTime, r.effectivePeriod?.start))],
      ['Date reported', formatMoment(r.issued)],
      ['Recorded during', referenceName(r.encounter)],
      ['Notes', noteText(r.note)],
    ]),
  }),
};

const vitalSignPresenter: ResourcePresenter = {
  columns: [
    { key: 'vitalSign', header: 'Vital sign' },
    { key: 'result', header: 'Reading' },
    { key: 'status', header: 'Status' },
    { key: 'date', header: 'Recorded' },
  ],
  statusColumn: 'status',
  sortDate: (r: ShrObservation) => firstDate(r.effectiveDateTime, r.effectivePeriod?.start, r.issued),
  present: (r: ShrObservation) => ({
    cells: {
      vitalSign: conceptText(r.code),
      result: observationResult(r),
      status: humanise(r.status),
      date: formatDay(firstDate(r.effectiveDateTime, r.effectivePeriod?.start, r.issued)),
    },
    details: fields([
      ['Vital sign', conceptText(r.code)],
      ['Reading', observationResult(r)],
      ['Status', humanise(r.status)],
      ['What it means', conceptList(r.interpretation)],
      ['Recorded at', formatMoment(firstDate(r.effectiveDateTime, r.effectivePeriod?.start))],
      ['Reported', formatMoment(r.issued)],
      ['Recorded during', referenceName(r.encounter)],
      ['Notes', noteText(r.note)],
    ]),
  }),
};

const examFindingPresenter: ResourcePresenter = {
  columns: [
    { key: 'bodyRegion', header: 'Body region' },
    { key: 'finding', header: 'Finding' },
    { key: 'status', header: 'Status' },
    { key: 'date', header: 'Recorded' },
  ],
  statusColumn: 'status',
  sortDate: (r: ShrObservation) => firstDate(r.effectiveDateTime, r.effectivePeriod?.start, r.issued),
  present: (r: ShrObservation) => {
    const noFindings = hasBooleanExtension(r, 'em-no-findings-on-exam');
    // Not humanised: `conceptText` already resolves this to the SHA code
    // system's own display (e.g. "Lower extremities") when reachable, which
    // reads correctly as-is; if the lookup couldn't run, it falls back to the
    // bare code (e.g. "XA45A6"), and title-casing that would read worse
    // ("Xa45a6"), not better.
    const bodyRegion = conceptText(r.bodySite) || conceptText(r.code);
    const finding = noFindings ? 'No findings' : humanise(observationResult(r));
    return {
      cells: {
        bodyRegion,
        finding,
        status: humanise(r.status),
        date: formatDay(firstDate(r.effectiveDateTime, r.effectivePeriod?.start, r.issued)),
      },
      details: fields([
        ['Body region', bodyRegion],
        ['Finding', finding],
        ['Status', humanise(r.status)],
        ['What it means', conceptList(r.interpretation)],
        ['Recorded at', formatMoment(firstDate(r.effectiveDateTime, r.effectivePeriod?.start))],
        ['Reported', formatMoment(r.issued)],
        ['Recorded during', referenceName(r.encounter)],
        ['Notes', noteText(r.note)],
      ]),
    };
  },
};

const serviceRequestPresenter: ResourcePresenter = {
  columns: [
    { key: 'request', header: 'Request' },
    { key: 'status', header: 'Status' },
    { key: 'urgency', header: 'Urgency' },
    { key: 'requestedBy', header: 'Requested by' },
    { key: 'date', header: 'Date' },
  ],
  statusColumn: 'status',
  sortDate: (r: ShrServiceRequest) => firstDate(r.authoredOn, r.occurrenceDateTime, r.occurrencePeriod?.start),
  present: (r: ShrServiceRequest) => ({
    cells: {
      request: conceptText(r.code) || conceptList(r.category) || conceptList(r.reasonCode),
      status: humanise(r.status),
      urgency: humanise(r.priority),
      requestedBy: referenceName(r.requester),
      date: formatDay(r.authoredOn),
    },
    details: fields([
      ['Request', conceptText(r.code) || conceptList(r.category)],
      ['Status', humanise(r.status)],
      ['Urgency', humanise(r.priority)],
      ['Grouping', conceptList(r.category)],
      ['Reason', conceptList(r.reasonCode)],
      ['Requested by', referenceName(r.requester)],
      ['To be done by', referenceNames(r.performer)],
      ['Planned for', formatMoment(firstDate(r.occurrenceDateTime, r.occurrencePeriod?.start))],
      ['Date requested', formatMoment(r.authoredOn)],
      ['Requested during', referenceName(r.encounter)],
      ['Notes', noteText(r.note)],
    ]),
  }),
};

const specimenPresenter: ResourcePresenter = {
  columns: [
    { key: 'specimen', header: 'Specimen' },
    { key: 'status', header: 'Status' },
    { key: 'collected', header: 'Collected' },
  ],
  statusColumn: 'status',
  sortDate: (r: ShrSpecimen) => firstDate(r.collection?.collectedDateTime, r.receivedTime),
  present: (r: ShrSpecimen) => ({
    cells: {
      specimen: conceptText(r.type),
      status: humanise(r.status),
      collected: formatDay(r.collection?.collectedDateTime),
    },
    details: fields([
      ['Specimen', conceptText(r.type)],
      ['Status', humanise(r.status)],
      ['Taken from', conceptText(r.collection?.bodySite)],
      ['Collected on', formatMoment(r.collection?.collectedDateTime)],
      ['Collected by', referenceName(r.collection?.collector)],
      ['Received on', formatMoment(r.receivedTime)],
      ['Notes', noteText(r.note)],
    ]),
  }),
};

const patientPresenter: ResourcePresenter = {
  columns: [
    { key: 'name', header: 'Name' },
    { key: 'sex', header: 'Sex' },
    { key: 'birthDate', header: 'Date of birth' },
  ],
  sortDate: (r: ShrPatient) => r.meta?.lastUpdated ?? '',
  present: (r: ShrPatient) => {
    const name = r.name?.[0];
    const display = (name?.text || [name?.given?.join(' '), name?.family].filter(Boolean).join(' ') || '').trim();
    return {
      cells: {
        name: display,
        sex: humanise(r.gender),
        birthDate: formatDay(r.birthDate),
      },
      details: fields([
        ['Name', display],
        ['Sex', humanise(r.gender)],
        ['Date of birth', formatDay(r.birthDate)],
      ]),
    };
  },
};

/**
 * Fallback for a category a site adds by config before this file knows about it.
 * Still plain-language: it shows whatever human-readable name, status and date
 * the resource carries, and nothing else.
 */
const fallbackPresenter: ResourcePresenter = {
  columns: [
    { key: 'summary', header: 'Record' },
    { key: 'status', header: 'Status' },
    { key: 'date', header: 'Date' },
  ],
  statusColumn: 'status',
  sortDate: (r: any) => genericDate(r),
  present: (r: any) => {
    const summary = genericSummary(r);
    const date = genericDate(r);
    // `status` covers every workflow-statused type; clinicalStatus covers the
    // kinds whose state lives there (AllergyIntolerance-shaped ones — its own
    // presenter handles it, this is for the next such type still on fallback).
    const status = r?.status ?? conceptText(r?.clinicalStatus);
    return {
      cells: {
        summary,
        status: humanise(status),
        date: formatDay(date),
      },
      details: fields([
        ['Record', summary],
        ['Status', humanise(status)],
        ['Date', formatMoment(date)],
      ]),
    };
  },
};

function genericSummary(r: any): string {
  return (
    conceptText(r?.code) ||
    conceptText(r?.type) ||
    conceptList(r?.type) ||
    conceptText(r?.medicationCodeableConcept) ||
    conceptText(r?.vaccineCode) ||
    r?.name?.[0]?.text ||
    r?.description ||
    ''
  );
}

function genericDate(r: any): string {
  return firstDate(
    r?.recordedDate,
    r?.onsetDateTime,
    r?.authoredOn,
    r?.effectiveDateTime,
    r?.effectivePeriod?.start,
    r?.occurrenceDateTime,
    r?.occurrencePeriod?.start,
    r?.performedDateTime,
    r?.performedPeriod?.start,
    r?.whenHandedOver,
    r?.whenPrepared,
    r?.lastOccurrence,
    r?.date,
    r?.period?.start,
    r?.issued,
    r?.recorded,
    r?.meta?.lastUpdated,
  );
}

const PRESENTERS: Record<string, ResourcePresenter> = {
  AllergyIntolerance: allergyIntolerancePresenter,
  Condition: conditionPresenter,
  Immunization: immunizationPresenter,
  MedicationRequest: medicationRequestPresenter,
  MedicationDispense: medicationDispensePresenter,
  MedicationAdministration: medicationAdministrationPresenter,
  Procedure: procedurePresenter,
  Encounter: encounterPresenter,
  EpisodeOfCare: episodeOfCarePresenter,
  Observation: observationPresenter,
  ServiceRequest: serviceRequestPresenter,
  Specimen: specimenPresenter,
  Patient: patientPresenter,
};

/**
 * Presenter overrides keyed by `ShrResourceTypeConfig.categoryCode` — lets a
 * category-split tab (Vitals, Exam findings) render differently from the plain
 * `resourceType` presenter its siblings use.
 */
const CATEGORY_PRESENTERS: Record<string, ResourcePresenter> = {
  'vital-signs': vitalSignPresenter,
  exam: examFindingPresenter,
};

function presenterFor(resourceType: string, categoryCode?: string): ResourcePresenter {
  if (categoryCode && CATEGORY_PRESENTERS[categoryCode]) {
    return CATEGORY_PRESENTERS[categoryCode];
  }
  return PRESENTERS[resourceType] ?? fallbackPresenter;
}

export function columnsFor(resourceType: string, categoryCode?: string): ShrColumn[] {
  return presenterFor(resourceType, categoryCode).columns;
}

export function statusColumnFor(resourceType: string, categoryCode?: string): string | undefined {
  return presenterFor(resourceType, categoryCode).statusColumn;
}

/** Turn the resources of one category into sorted, display-ready table rows. */
export function buildRows(resourceType: string, resources: ShrAnyResource[], categoryCode?: string): ShrRow[] {
  const presenter = presenterFor(resourceType, categoryCode);
  return resources
    .map((resource, index) => {
      const { cells, details } = presenter.present(resource);
      const filled: Record<string, string> = {};
      presenter.columns.forEach(({ key }) => {
        filled[key] = cells[key]?.trim() || NOT_RECORDED;
      });
      return {
        // Never rendered — Carbon just needs a unique, stable row key. The index
        // keeps it unique even when two resources share a FHIR id.
        id: `${resourceType}-${categoryCode ?? ''}-${index}-${(resource as any)?.id ?? ''}`,
        cells: filled,
        details,
        statusKey: presenter.statusColumn,
        sortDate: presenter.sortDate?.(resource) ?? '',
      };
    })
    .sort((a, b) => (a.sortDate === b.sortDate ? 0 : a.sortDate < b.sortDate ? 1 : -1));
}
