/**
 * Types for the patient Case Summary.
 *
 * The Case Summary aggregates OpenMRS data captured during a patient visit and
 * groups it into clinical resource groups (allergies, conditions/diagnoses,
 * medications, lab results, observations/vitals, clinical notes, encounters),
 * alongside a patient demographics block. The grouped payload drives both the
 * on-screen view and the printable document.
 */
import { type OBSERVATION_INTERPRETATION } from '@openmrs/esm-patient-common-lib';

/**
 * The keys of every FHIR-fetched *group* kept as raw `FhirEntry[]` — now only
 * Allergies (plus the synthetic `encounters` list). Everything else is pre-mapped
 * to a purpose-built type on `VisitCaseSummary`, because this app's FHIR2
 * deployments don't reliably populate the resources that would otherwise feed it:
 *  - `vitals` / `clinicalNotes` / `medications` — from the REST visit payload and
 *    a top-level `/order` fetch, not Observation/DocumentReference/MedicationRequest.
 *  - `conditions` — FHIR `Condition`, but mapped to `CaseSummaryDiagnosis`.
 *  - `labOrders` — REST `/order` + the custom `obstree` resource. FHIR
 *    `DiagnosticReport` was dropped: it never links its `result[]` Observations
 *    here, so it carried no values, units, or reference ranges at all.
 */
export type CaseSummaryGroupKey = 'allergies' | 'encounters';

/** A bare FHIR R4 bundle entry. */
export type FhirEntry = {
  resource: {
    resourceType: string;
    id: string;
    [key: string]: unknown;
  };
};

/** A bare FHIR R4 Bundle (search result). */
export type FhirBundle = {
  entry?: Array<FhirEntry>;
  total?: number;
};

/** The patient demographics block for the summary header. */
export type CaseSummaryDemographics = {
  /** Display name, e.g. "SHAOLIN OTANDO ABUYEKA". */
  name: string;
  /** ISO date string. */
  birthDate?: string;
  gender?: string;
  /** Age as a pre-formatted string (e.g. "34Y"). */
  age?: string;
  /** Preferred / primary patient identifier. */
  patientId?: string;
  /** Identifier matched by type, when present. */
  nationalId?: string;
  /** Client Registry (CR) number, matched by identifier type. */
  crNumber?: string;
};

/** Light view of a visit used to scope the summary. */
export type CaseSummaryVisit = {
  uuid: string;
  display?: string;
  startDatetime?: string;
  stopDatetime?: string;
  visitType?: string;
};

/**
 * A single "LABEL: value" observation, parsed from a REST obs `display` string
 * (e.g. `"TEMPERATURE (C): 37.0"` -> `{ label: 'TEMPERATURE (C)', value: '37.0' }`).
 */
export type CaseSummaryObs = {
  label: string;
  value: string;
};

/** A labelled value for display, e.g. a row in the Latest Vitals grid. `value` is absent when not recorded this visit. */
export type CaseSummaryLabelValue = {
  label: string;
  value?: string;
};

/** A visit encounter, lightly mapped for ADT classification and obs-derived vitals/notes. */
export type CaseSummaryEncounter = {
  uuid: string;
  display?: string;
  encounterDatetime?: string;
  encounterTypeUuid?: string;
  /** The encounter type's display, e.g. "GENCONSULTATION". */
  encounterType?: string;
  location?: string;
  provider?: string;
  obs: Array<CaseSummaryObs>;
};

/** One encounter's non-vital obs, rendered as a Clinical Notes entry. */
export type CaseSummaryEncounterNote = {
  encounterUuid: string;
  display?: string;
  /**
   * The encounter type's display. Preferred over `display` for the note heading, since
   * `display` already embeds the date ("GENCONSULTATION 03/08/2026") and would print it
   * twice next to the timestamp.
   */
  encounterType?: string;
  datetime?: string;
  obs: Array<CaseSummaryObs>;
};

/**
 * One FHIR `Condition` entry, shown as an Active Diagnosis. `clinicalStatus` isn't
 * used — this app's Condition entries (recorded as encounter diagnoses) always
 * report it as "unknown", so it can't distinguish active from resolved. `certainty`
 * (FHIR `verificationStatus`) and `primary` (the `diagnosis-rank` extension) are
 * reliably populated instead — see `mapConditionEntry`.
 */
export type CaseSummaryDiagnosis = {
  /**
   * ICD-11 code, when the underlying concept is mapped to one. Resolved from the
   * concept's mappings (`resolveIcd11Codes`) — FHIR only carries it directly on
   * servers that register ICD-11 in `fhir_concept_source`, which this app's don't.
   */
  code?: string;
  /** OpenMRS concept uuid, used to resolve `code`. Not for display. */
  conceptUuid?: string;
  description: string;
  /** e.g. "confirmed" | "provisional" — FHIR Condition's `verificationStatus` coding. */
  certainty?: string;
  /** True when this is the encounter's rank-1 (primary) diagnosis. */
  primary: boolean;
  onsetDate?: string;
};

/**
 * One drug order, from a top-level REST `/order` fetch (see `drugOrderRep` in
 * case-summary.resource.ts — the dosing fields only resolve there, not through a
 * representation nested inside a visit/encounter fetch).
 */
export type CaseSummaryMedication = {
  /** The order's `dateActivated`. */
  date?: string;
  /** Drug name, with strength appended when not already part of the name. */
  drug: string;
  /** Dose with units, e.g. "500 mg". */
  dose?: string;
  route?: string;
  frequency?: string;
  /** Duration with units, e.g. "5 Days". */
  duration?: string;
  /** Free-text dosing instructions, when recorded. */
  instructions?: string;
  /** The visit whose encounter placed this order — orders are fetched patient-wide. */
  visitUuid?: string;
  /** False once stopped, discontinued, or auto-expired. */
  active: boolean;
};

/* ------------------------------------------------------------------ *
 * obstree — raw wire types
 *
 * `GET /ws/rest/v1/obstree?patient={uuid}&concept={uuid[,uuid...]}` is a custom
 * OpenMRS resource that returns a concept tree with the patient's observations
 * attached at the leaves. These types describe the wire shape verbatim; the
 * display model below is what the view consumes.
 * ------------------------------------------------------------------ */

/**
 * Reference-range bounds as obstree reports them. All optional and nullable, and
 * note `0` is a legitimate bound — presence must be tested with `!= null` +
 * `Number.isFinite`, never truthiness.
 */
export type ObsTreeRange = {
  lowAbsolute?: number | null;
  lowCritical?: number | null;
  lowNormal?: number | null;
  hiNormal?: number | null;
  hiCritical?: number | null;
  hiAbsolute?: number | null;
};

/**
 * One observation inside an obstree node. The date and value field names vary by
 * server version, so both candidates are declared and read in order.
 *
 * Extends `ObsTreeRange` because each obs repeats the reference bounds in force when
 * the result was taken — those are preferred over the node's, which are current.
 *
 * `value` arrives as a *string* on this server (`"200.0"`, `"599"`) even for Numeric
 * datatypes, so it must be coerced rather than used directly.
 */
export type ObsTreeObs = ObsTreeRange & {
  uuid?: string;
  obsDatetime?: string;
  effectiveDateTime?: string;
  value?: string | number | { uuid?: string; display?: string } | null;
  /**
   * Server-computed interpretation. Deliberately NOT read: on this server it is
   * populated only for some results (present on an in-range HEMOGLOBIN, absent on an
   * out-of-range HEMATOCRIT), so trusting it would under-report abnormals. The
   * interpretation is computed from the bounds instead — see `assessValue`.
   */
  interpretation?: string;
};

/**
 * A node of the obstree. Self-recursive via `subSets`: a panel expands into member
 * nodes, a single test resolves to one node, and nesting can go deeper than one
 * level. `obs` is EMPTY when the test was ordered but is not yet resulted.
 */
export type ObsTreeNode = ObsTreeRange & {
  conceptUuid?: string;
  display?: string;
  flatName?: string;
  datatype?: string;
  units?: string;
  hasData?: boolean;
  obs?: Array<ObsTreeObs>;
  subSets?: Array<ObsTreeNode>;
};

/**
 * The span of days a result must fall in to count as belonging to the visit.
 *
 * Compared by calendar day, not instant. `stopDatetime` absent means the visit is
 * still open, so there is no upper bound — an ongoing admission keeps accruing
 * results, and a lab posts them hours or days after the sample was taken.
 */
export type ObsVisitWindow = {
  startDatetime?: string;
  stopDatetime?: string;
};

/* ------------------------------------------------------------------ *
 * obstree — display model
 * ------------------------------------------------------------------ */

/**
 * How a numeric result sits relative to its reference range. Aliases the framework's
 * `OBSERVATION_INTERPRETATION` — the same vocabulary upstream `esm-patient-tests-app`
 * returns from its `assessValue` — so there's one definition, not a copy that can
 * drift. Aliased rather than used directly only so call sites read in this module's
 * terms. Type-only import: erased at compile time, so no runtime dependency on the
 * source-only package.
 *
 * `'--'` means "cannot be assessed" — a non-numeric result, or a concept with no
 * bounds configured. It is deliberately NOT `NORMAL`: asserting "normal" for an
 * unbounded analyte on a printed clinical document would be an unsafe claim.
 *
 * NOTE that literal is two ASCII hyphens, which is NOT this module's `EMPTY_VALUE`
 * ('—', an em dash). Never render it directly — route through `interpretationLabel()`.
 */
export type CaseSummaryLabInterpretation = OBSERVATION_INTERPRETATION;

/** One resulted analyte, flattened out of one obstree branch. */
export type CaseSummaryLabResult = {
  conceptUuid?: string;
  /** Analyte name, e.g. "Haemoglobin". */
  test: string;
  /** The parent node's name when this analyte came from a panel; absent at root. */
  panel?: string;
  /** Latest in-window value, coerced to a display string. */
  value: string;
  units?: string;
  /** ISO datetime of that observation. */
  datetime?: string;
  /** Pre-formatted reference range, units excluded, e.g. "13 – 17". */
  range?: string;
  interpretation: CaseSummaryLabInterpretation;
  /** True when the interpretation is neither NORMAL nor unassessable — keeps the view dumb. */
  abnormal: boolean;
};

/** A test or panel ordered during the visit, with whatever it has resolved to. */
export type CaseSummaryTestOrder = {
  uuid: string;
  orderNumber?: string;
  /** The ordered concept — a single test or a panel. Drives the obstree request. */
  conceptUuid: string;
  /** Ordered test/panel name, from the order's concept. */
  test: string;
  orderedDate?: string;
  /** The order type's display, retained for diagnostics while matching is loose. */
  orderTypeDisplay?: string;
  /** Analytes resolved from the obstree, flattened depth-first. */
  results: Array<CaseSummaryLabResult>;
  /**
   * True when the order produced no in-window result. Distinct from "no order at
   * all", which is an empty `labOrders`.
   */
  pending: boolean;
};

/**
 * Inpatient admission details for the visit, derived from its ADT encounters
 * (admission, bed assignment, transfer, discharge). Undefined when the visit
 * has no such encounters, i.e. it was never an inpatient stay.
 */
export type CaseSummaryInpatientDetails = {
  admissionDate?: string;
  ward?: string;
  doctor?: string;
  status?: string;
  dischargeDate?: string;
};

/** The fully assembled, grouped case summary for a single visit. */
export type VisitCaseSummary = {
  patientUuid: string;
  visit: CaseSummaryVisit;
  /**
   * Every visit folded into this summary. More than one when the patient checked in
   * several times on the same day — the summary covers all of them so nothing is lost
   * to whichever visit happened to sort first. See `mergeVisitPayloads`.
   */
  visitUuids: Array<string>;
  /** UUIDs of every encounter that belongs to the visit. */
  encounterUuids: string[];
  demographics: CaseSummaryDemographics;
  /** FHIR-fetched resource arrays keyed by group. Empty arrays mean "no data". */
  groups: Partial<Record<CaseSummaryGroupKey, Array<FhirEntry>>>;
  /** From FHIR `Condition`, pre-mapped rather than a raw group — see `CaseSummaryGroupKey` for why. */
  conditions: Array<CaseSummaryDiagnosis>;
  /** Derived from the REST visit payload's `orders` — see `CaseSummaryGroupKey` for why. */
  medications: Array<CaseSummaryMedication>;
  /** Derived from REST encounter obs — see `CaseSummaryGroupKey` for why. */
  vitals: Array<CaseSummaryLabelValue>;
  /** Derived from REST encounter obs — see `CaseSummaryGroupKey` for why. */
  clinicalNotes: Array<CaseSummaryEncounterNote>;
  /**
   * Test/lab orders placed during this visit, each carrying the analytes obstree
   * resolved for it. An empty array means nothing was ordered — NOT that results
   * are missing; an ordered-but-unresulted test is present with `pending: true`.
   */
  labOrders: Array<CaseSummaryTestOrder>;
  /**
   * Set only when orders existed but the obstree request itself failed, so the view
   * can say "could not be retrieved" rather than looking like "nothing resulted".
   */
  labResultsUnavailable?: boolean;
  /** Present only when the visit includes at least one ADT encounter. */
  inpatientDetails?: CaseSummaryInpatientDetails;
};
