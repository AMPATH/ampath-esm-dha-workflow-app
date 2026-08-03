import { fhirBaseUrl, openmrsFetch, restBaseUrl } from '@openmrs/esm-framework';
import useSWR from 'swr';
import { AdmissionEncounterTypeUuids } from '../admissions/constants';
import { IdentifierTypesUuids } from '../resources/identifier-types';
import {
  type CaseSummaryDemographics,
  type CaseSummaryDiagnosis,
  type CaseSummaryEncounter,
  type CaseSummaryEncounterNote,
  type CaseSummaryGroupKey,
  type CaseSummaryInpatientDetails,
  type CaseSummaryLabelValue,
  type CaseSummaryLabInterpretation,
  type CaseSummaryLabResult,
  type CaseSummaryMedication,
  type CaseSummaryObs,
  type CaseSummaryTestOrder,
  type CaseSummaryVisit,
  type FhirBundle,
  type FhirEntry,
  type ObsTreeNode,
  type ObsTreeObs,
  type ObsTreeRange,
  type ObsVisitWindow,
  type VisitCaseSummary,
} from './types/case-summary.types';

/**
 * Custom representations resolve properties by direct Java bean reflection
 * (`ConversionUtil`/`PropertyUtils`), NOT through a resource's `getRepresentationDescription()` —
 * so only *real* getters on the requested class are safe. Two categories break this:
 *  1. Subclass-only fields on a polymorphic collection. `encounter.orders` is declared as
 *     `Set<Order>`, so nested reps type-erase every entry to the base `Order` class — fields
 *     that only exist on `DrugOrder` (`dose`, `doseUnits`, `route`, `frequency`, `duration`,
 *     `drug`) 500 with "Unknown property '<field>' on class org.openmrs.Order". They're only
 *     resolvable via a *direct* fetch of `/order/{uuid}`, which would mean one extra request
 *     per order — so the order's `display` string (OpenMRS already bakes the full dosing
 *     instructions into it) is used as the medication description instead.
 *  2. Resource-layer *virtual* properties that aren't real bean getters at all — e.g. the
 *     `"type": "drugorder"` discriminator seen in "default"/"full" representations doesn't
 *     exist as `Order.getType()`, so requesting `type` in a custom rep 500s the same way.
 *     Drug orders are instead recognised via `orderType` (a genuine `Order` field).
 *
 * This is why medications are NOT read from `encounter.orders` here — see
 * `drugOrderRep` / `fetchDrugOrders`, which fetch `/order` at the top level where the
 * resource resolves as `DrugOrder` and the dosing fields are all available.
 */
const encounterRep =
  'uuid,display,encounterDatetime,voided,encounterType:(uuid,display),' +
  'location:(uuid,display),encounterProviders:(provider:(person:(display))),' +
  'obs:(uuid,display)';

const patientRep =
  'uuid,person:(uuid,display,gender,birthdate,age),' +
  'identifiers:(uuid,display,identifier,preferred,identifierType:(uuid,display))';

/**
 * One REST call gets the whole visit: demographics (nested `patient`), and every
 * encounter's obs (-> vitals/clinical notes) and orders (-> Active Medications).
 * This app's FHIR2 deployments don't reliably populate MedicationRequest/
 * Observation/DocumentReference with what these OpenMRS forms actually capture,
 * so everything that *can* come from this one REST call does. Active Diagnoses,
 * Allergies, and lab results all remain their own — much smaller — FHIR calls;
 * see `getVisitCaseSummary`.
 */
const visitWithEverythingRep =
  `custom:(uuid,display,startDatetime,stopDatetime,visitType:(uuid,display),` +
  `patient:(${patientRep}),encounters:(${encounterRep}))`;

/**
 * Base-`Order` fields only, requested through `encounters.orders`. Safe under the
 * type-erasure rule above precisely because none of these are `DrugOrder`-only:
 * `concept` and `orderType` are real getters on `org.openmrs.Order`.
 *
 * Orders reached this way are *inherently* scoped to the visit — they hang off the
 * visit's own encounters — so no client-side visit filtering is needed for them.
 */
const visitOrderRep =
  'uuid,orderNumber,action,dateActivated,voided,' +
  'concept:(uuid,display),orderType:(uuid,display,javaClassName)';

/**
 * The widened rep: the same visit payload, plus each encounter's orders. When the
 * server accepts it, test orders come free with a request already being made and the
 * separate `/order` round-trips are skipped entirely.
 *
 * `fetchVisitPayload` falls back to `visitWithEverythingRep` if this is rejected,
 * because the visit fetch is the one call that *throws* — a rep the server dislikes
 * would otherwise take down the whole summary, not just the lab section. That has
 * happened three times in this module already (`dose`, `type`, `mappings`).
 */
const visitWithOrdersRep =
  `custom:(uuid,display,startDatetime,stopDatetime,visitType:(uuid,display),` +
  `patient:(${patientRep}),encounters:(${encounterRep},orders:(${visitOrderRep})))`;

/**
 * Matches an identifier by its type's UUID (see `IdentifierTypesUuids`), falling back
 * to a display-name substring for servers where the type UUID isn't configured as
 * expected. Mirrors `getCrNumber` in `active-visits.resource.ts`.
 */
function matchIdentifier(
  identifiers: Array<{
    identifier?: string;
    identifierType?: { uuid?: string; display?: string };
    preferred?: boolean;
  }>,
  typeUuid: string,
  displayFallback: string,
): string | undefined {
  return identifiers.find(
    (id) =>
      id.identifierType?.uuid === typeUuid || (id.identifierType?.display ?? '').toLowerCase().includes(displayFallback),
  )?.identifier;
}

/** Parses a REST obs `display` string, e.g. `"TEMPERATURE (C): 37.0"` -> `{ label, value }`. */
function parseObsDisplay(display?: string): CaseSummaryObs | undefined {
  if (!display) return undefined;
  const separatorIndex = display.indexOf(': ');
  if (separatorIndex === -1) {
    return { label: '', value: display.trim() };
  }
  return { label: display.slice(0, separatorIndex).trim(), value: display.slice(separatorIndex + 2).trim() };
}

export const DRUG_ORDER_TYPE_UUID = '53eb466e-1359-11df-a1f1-0026b9348838';
export const OUTPATIENT_CARE_SETTING_UUID = '6f0c9a92-6f24-11e3-af88-005056821db0';
export const INPATIENT_CARE_SETTING_UUID = 'c365e560-c3ec-11e3-9c1a-0800200c9a66';

/**
 * Every care setting an order can belong to, from this server's `/caresetting`.
 *
 * `/order` takes a single `careSetting`, so covering both means one request each — run
 * in parallel, so it costs no extra latency. Pinning only Outpatient (as this module
 * originally did) silently omitted every order placed during an inpatient stay, which
 * matters especially now that results are windowed across a whole admission.
 */
const CARE_SETTING_UUIDS = [OUTPATIENT_CARE_SETTING_UUID, INPATIENT_CARE_SETTING_UUID];

/**
 * Fetches `/order` rows for one representation across every care setting, merged and
 * de-duplicated by order uuid. A failed care setting contributes nothing rather than
 * failing the whole set — a partial list beats an empty section.
 */
async function fetchOrderRows<T extends { uuid?: string }>(
  patientUuid: string,
  rep: string,
  extraParams?: Record<string, string>,
): Promise<Array<T>> {
  const perSetting = await Promise.all(
    CARE_SETTING_UUIDS.map(async (careSetting) => {
      const params = { patient: patientUuid, careSetting, excludeDiscontinueOrders: 'true', v: rep, ...extraParams };
      const url = `${restBaseUrl}/order?${new URLSearchParams(params).toString()}`;
      const response = await openmrsFetch<{ results?: Array<T> }>(url);
      if (!response.ok) return [];
      const payload = await response.json();
      return payload.results ?? [];
    }),
  );

  const byUuid = new Map<string, T>();
  const withoutUuid: Array<T> = [];
  for (const row of perSetting.flat()) {
    if (!row?.uuid) {
      // Keep it rather than drop it — an unidentifiable row is still real data.
      withoutUuid.push(row);
    } else if (!byUuid.has(row.uuid)) {
      byUuid.set(row.uuid, row);
    }
  }
  return [...byUuid.values(), ...withoutUuid];
}

type VisitEncounterPayload = {
  uuid: string;
  display?: string;
  voided?: boolean;
  encounterDatetime?: string;
  encounterType?: { uuid: string; display?: string };
  location?: { uuid: string; display?: string };
  encounterProviders?: Array<{ provider?: { person?: { display?: string } } }>;
  obs?: Array<{ uuid: string; display?: string }>;
  /** Present only when the widened rep was accepted — see `visitWithOrdersRep`. */
  orders?: Array<TestOrderPayload>;
};

type PatientPayload = {
  person?: { display?: string; gender?: string; birthdate?: string; age?: string };
  identifiers?: Array<{
    identifier?: string;
    identifierType?: { uuid?: string; display?: string };
    preferred?: boolean;
  }>;
};

type VisitWithEverythingPayload = {
  uuid: string;
  display?: string;
  startDatetime?: string;
  stopDatetime?: string;
  visitType?: { uuid: string; display?: string };
  patient?: PatientPayload;
  encounters?: Array<VisitEncounterPayload>;
};

/** Maps the nested `patient` nub of the visit payload to the demographics block. */
export function mapDemographics(patient?: PatientPayload): CaseSummaryDemographics {
  const identifiers = patient?.identifiers ?? [];
  const preferred = identifiers.find((id) => id.preferred);
  return {
    name: patient?.person?.display ?? '',
    birthDate: patient?.person?.birthdate,
    gender: patient?.person?.gender,
    age: patient?.person?.age,
    patientId: preferred?.identifier ?? identifiers[0]?.identifier,
    nationalId: matchIdentifier(identifiers, IdentifierTypesUuids.NATIONAL_ID_UUID, 'national id'),
    crNumber: matchIdentifier(identifiers, IdentifierTypesUuids.CLIENT_REGISTRY_NO_UUID, 'registry'),
  };
}

/**
 * Custom rep for a top-level `/order` fetch. Unlike a rep nested under
 * `encounter.orders`, this one resolves against the concrete `DrugOrder`, so the
 * dosing fields (`dose`, `doseUnits`, `route`, `frequency`, `duration`, `drug`) are
 * all available — see the note on `encounterRep`. `:ref` yields `{uuid, display}`.
 */
const drugOrderRep =
  'custom:(uuid,orderNumber,action,dateActivated,dateStopped,autoExpireDate,' +
  'drug:(display,strength,dosageForm:(display)),concept:(display),' +
  'dose,doseUnits:ref,frequency:ref,route:ref,duration,durationUnits:ref,' +
  'dosingInstructions,instructions,encounter:(uuid,visit:(uuid)))';

type DrugOrderPayload = {
  uuid: string;
  orderNumber?: string;
  action?: string;
  dateActivated?: string;
  dateStopped?: string;
  autoExpireDate?: string;
  drug?: { display?: string; strength?: string; dosageForm?: { display?: string } };
  concept?: { display?: string };
  dose?: number;
  doseUnits?: { display?: string };
  frequency?: { display?: string };
  route?: { display?: string };
  duration?: number;
  durationUnits?: { display?: string };
  dosingInstructions?: string;
  instructions?: string;
  encounter?: { uuid?: string; visit?: { uuid?: string } };
};

/** Formats a value + unit pair, e.g. `(500, 'mg')` -> `"500 mg"`. */
function formatQuantity(value?: number, unit?: string): string | undefined {
  if (value === undefined || value === null) return undefined;
  return unit ? `${value} ${unit}` : String(value);
}

/** An order counts as active until it's stopped, discontinued, or auto-expires. */
export function isDrugOrderActive(order: DrugOrderPayload, now: number = Date.now()): boolean {
  if (order.action === 'DISCONTINUE' || order.dateStopped) return false;
  if (order.autoExpireDate && Date.parse(order.autoExpireDate) < now) return false;
  return true;
}

/** Maps one `/order` drug order to a medication row. */
export function mapDrugOrder(order: DrugOrderPayload, now?: number): CaseSummaryMedication {
  const name = order.drug?.display ?? order.concept?.display ?? '';
  const strength = order.drug?.strength;
  return {
    date: order.dateActivated,
    // `drug.display` usually already embeds the strength, so only append when it doesn't.
    drug: strength && !name.includes(strength) ? `${name} ${strength}`.trim() : name,
    dose: formatQuantity(order.dose, order.doseUnits?.display),
    route: order.route?.display,
    frequency: order.frequency?.display,
    duration: formatQuantity(order.duration, order.durationUnits?.display),
    instructions: order.dosingInstructions ?? order.instructions,
    visitUuid: order.encounter?.visit?.uuid,
    active: isDrugOrderActive(order, now),
  };
}

/**
 * Fetches the patient's drug orders. Patient-level rather than visit-scoped: a
 * medication started at an earlier visit is still current, and scoping to this
 * visit's encounters would empty the section for most patients (the same trap that
 * hid the diagnoses). Each row carries `visitUuid` so callers can tell which visit
 * prescribed it. Filtered server-side to drug orders via `orderTypes`.
 */
export async function fetchDrugOrders(patientUuid: string): Promise<Array<CaseSummaryMedication>> {
  // `orderTypes` is safe to filter server-side here: the uuid is the OpenMRS core Drug
  // Order type and is confirmed against this server's `/ordertype`.
  const rows = await fetchOrderRows<DrugOrderPayload>(patientUuid, drugOrderRep, { orderTypes: DRUG_ORDER_TYPE_UUID });
  return rows.map((order) => mapDrugOrder(order)).filter((m) => !!m.drug);
}

/* ================================================================== *
 * Test/lab orders and their results (REST `/order` + custom `obstree`)
 *
 * FHIR `DiagnosticReport` used to feed this section but carried nothing usable on
 * this app's servers: it never links its `result[]` Observations, so there were no
 * values, units, or reference ranges. `obstree` returns the ordered concept's tree
 * with observations attached at the leaves, which is what the section needs.
 * ================================================================== */

/**
 * Standard OpenMRS "Test Order" order type uuid. Treated as a *hint* that short-
 * circuits matching, NOT as a gate — `isTestOrderType` still accepts by display
 * name, so a server that uses a different uuid keeps working. Deliberately not a
 * `configSchema` entry: that would couple the feature to an ops change on the
 * hosted o3-config before it worked anywhere.
 */
export const TEST_ORDER_TYPE_UUID = '53eb4768-1359-11df-a1f1-0026b9348838';

/**
 * `OrderType.javaClassName` for a lab/test order. This is the *definitive*
 * discriminator — a real `OrderType` getter, and the only field that distinguishes a
 * test order from the several types this server models as a bare `org.openmrs.Order`
 * ("Radiology Order", "Procedure Order", "Medical Supplies Order", the two
 * Consultation types, "SHA Intervention Switch"). Preferred over uuid or display
 * matching for exactly that reason.
 */
const TEST_ORDER_JAVA_CLASS = 'org.openmrs.TestOrder';
const DRUG_ORDER_JAVA_CLASS = 'org.openmrs.DrugOrder';

/** Depth cap for the obstree walk. Real panels nest 1-2 deep; 6 is generous. */
const OBS_TREE_MAX_DEPTH = 6;
/** Node budget for the obstree walk. A depth cap alone does not bound *breadth*. */
const OBS_TREE_MAX_NODES = 500;

/** Base-`Order` fields only — see the reflection note at the top of this file. */
const testOrderRep =
  'custom:(uuid,orderNumber,action,dateActivated,voided,' +
  'concept:(uuid,display),orderType:(uuid,display,javaClassName),encounter:(uuid,visit:(uuid)))';

type TestOrderTypePayload = { uuid?: string; display?: string; javaClassName?: string };

type TestOrderPayload = {
  uuid: string;
  orderNumber?: string;
  action?: string;
  dateActivated?: string;
  voided?: boolean;
  concept?: { uuid?: string; display?: string };
  orderType?: TestOrderTypePayload;
  encounter?: { uuid?: string; visit?: { uuid?: string } };
};

/**
 * Recognises a lab/test order, most-authoritative signal first:
 *  1. `javaClassName` — definitive. This server models six *non*-test types as a bare
 *     `org.openmrs.Order` (Radiology, Procedure, Medical Supplies, two Consultation
 *     types, SHA Intervention Switch), and only the real lab type is a `TestOrder`.
 *  2. the known Test Order uuid.
 *  3. a display containing "test" or "lab" — the safety net for a server whose uuid
 *     differs and whose rep omits `javaClassName`. This server's display is just
 *     "Test", so the substring check (not equality) is what makes it match.
 *
 * Drugs are rejected up front on all three signals: they must never leak into the lab
 * section, and this server labels them "Drug", not "Drug Order".
 */
export function isTestOrderType(orderType?: TestOrderTypePayload): boolean {
  if (orderType?.javaClassName === DRUG_ORDER_JAVA_CLASS) return false;
  if (orderType?.uuid === DRUG_ORDER_TYPE_UUID) return false;
  const display = (orderType?.display ?? '').toLowerCase();
  if (/drug|medication|prescription/.test(display)) return false;

  if (orderType?.javaClassName === TEST_ORDER_JAVA_CLASS) return true;
  // A known non-test java class must not fall through to display matching.
  if (orderType?.javaClassName && orderType.javaClassName !== TEST_ORDER_JAVA_CLASS) return false;
  if (orderType?.uuid === TEST_ORDER_TYPE_UUID) return true;
  return display.includes('test') || display.includes('lab');
}

/** How a visit is identified when deciding whether an order belongs to it. */
export type TestOrderVisitScope = {
  visitUuid?: string;
  /** The visit's own encounter uuids — see `orderBelongsToVisit` for why both are used. */
  encounterUuids?: Array<string>;
};

/**
 * Whether an order belongs to the scoped visit. Two independent signals are accepted,
 * because either can be missing: the order's `encounter.uuid` appearing among the
 * visit's own encounters, or its `encounter.visit.uuid` matching directly. The former
 * doesn't depend on `visit` resolving through a *nested* encounter representation, and
 * the visit's encounter uuids are already in hand from the visit payload.
 *
 * An order carrying neither piece of locating information is kept rather than dropped —
 * its order date is displayed, so showing it is safer than silently hiding it. An order
 * that carries locating info which *contradicts* the scope is dropped.
 */
export function orderBelongsToVisit(order: TestOrderPayload, scope?: TestOrderVisitScope): boolean {
  const visitUuid = scope?.visitUuid;
  const encounterUuids = scope?.encounterUuids ?? [];
  if (!visitUuid && !encounterUuids.length) return true;

  const orderEncounterUuid = order.encounter?.uuid;
  const orderVisitUuid = order.encounter?.visit?.uuid;
  if (orderEncounterUuid && encounterUuids.includes(orderEncounterUuid)) return true;
  if (visitUuid && orderVisitUuid === visitUuid) return true;
  return !orderEncounterUuid && !orderVisitUuid;
}

/**
 * Maps `/order` rows to test orders: drops voided, discontinued, non-test, and
 * concept-less rows, de-dupes by order uuid, and keeps only this visit's orders when a
 * scope is given (see `orderBelongsToVisit`).
 */
export function mapTestOrders(orders: Array<TestOrderPayload>, scope?: TestOrderVisitScope): Array<CaseSummaryTestOrder> {
  const byUuid = new Map<string, CaseSummaryTestOrder>();
  for (const order of orders) {
    const conceptUuid = order.concept?.uuid;
    if (order.voided || order.action === 'DISCONTINUE') continue;
    if (!isTestOrderType(order.orderType)) continue;
    if (!conceptUuid || !order.uuid) continue;
    if (!orderBelongsToVisit(order, scope)) continue;
    if (byUuid.has(order.uuid)) continue;
    byUuid.set(order.uuid, {
      uuid: order.uuid,
      orderNumber: order.orderNumber,
      conceptUuid,
      test: order.concept?.display ?? '',
      orderedDate: order.dateActivated,
      orderTypeDisplay: order.orderType?.display,
      results: [],
      pending: true,
    });
  }
  return Array.from(byUuid.values()).sort((a, b) => (a.orderedDate ?? '').localeCompare(b.orderedDate ?? ''));
}

/** The de-duplicated concept uuids to ask obstree about. */
export function testOrderConceptUuids(orders: Array<CaseSummaryTestOrder>): Array<string> {
  return Array.from(new Set(orders.map((order) => order.conceptUuid).filter(Boolean)));
}

/**
 * Fetches the patient's test orders. Deliberately sends NO `orderTypes` filter and
 * matches client-side instead: `orderTypes=<wrong-uuid>` returns an empty set that is
 * indistinguishable from "this patient has no tests", which is the worst possible
 * failure mode here. Type identification is `isTestOrderType`'s job.
 */
export async function fetchTestOrders(patientUuid: string, scope?: TestOrderVisitScope): Promise<Array<CaseSummaryTestOrder>> {
  const rows = await fetchOrderRows<TestOrderPayload>(patientUuid, testOrderRep);
  return mapTestOrders(rows, scope);
}

/** A reference bound, or `undefined` when absent. `0` is a legitimate bound, so this tests presence — never truthiness. */
function referenceBound(value?: number | null): number | undefined {
  return value != null && Number.isFinite(value) ? value : undefined;
}

/** obstree's date field name varies by server version; both candidates are read in order. */
function readObsDatetime(obs: ObsTreeObs): string | undefined {
  return obs.obsDatetime ?? obs.effectiveDateTime;
}

/** Whether any reference bound is populated on this range-carrying object. */
function hasAnyBound(range: ObsTreeRange): boolean {
  return [range.lowAbsolute, range.lowCritical, range.lowNormal, range.hiNormal, range.hiCritical, range.hiAbsolute].some(
    (bound) => referenceBound(bound) !== undefined,
  );
}

/** Coerces an obs value to a display string. Returns `undefined` for null/blank, so the node is skipped. */
export function readObsValue(value: ObsTreeObs['value']): string | undefined {
  if (value === null || value === undefined) return undefined;
  if (typeof value === 'number') return Number.isFinite(value) ? String(value) : undefined;
  if (typeof value === 'string') return value.trim() || undefined;
  return value.display?.trim() || undefined;
}

/**
 * Classifies a value against its reference range, using upstream
 * `esm-patient-tests-app`'s tier order (absolute -> critical -> normal).
 *
 * Returns `'--'` — NOT `NORMAL` — for a non-numeric result or a concept with no
 * bounds at all. Reporting "normal" for an analyte that was never given a range
 * would be an unsafe claim on a printed clinical document.
 */
export function assessValue(value: string, range: ObsTreeRange): CaseSummaryLabInterpretation {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return '--';

  const lowAbsolute = referenceBound(range.lowAbsolute);
  const lowCritical = referenceBound(range.lowCritical);
  const lowNormal = referenceBound(range.lowNormal);
  const hiNormal = referenceBound(range.hiNormal);
  const hiCritical = referenceBound(range.hiCritical);
  const hiAbsolute = referenceBound(range.hiAbsolute);

  const bounds = [lowAbsolute, lowCritical, lowNormal, hiNormal, hiCritical, hiAbsolute];
  if (bounds.every((bound) => bound === undefined)) return '--';
  // A mis-configured concept (normal-low above normal-high) must not flag every row.
  if (lowNormal !== undefined && hiNormal !== undefined && lowNormal > hiNormal) return 'NORMAL';

  if (hiAbsolute !== undefined && numeric > hiAbsolute) return 'OFF_SCALE_HIGH';
  if (hiCritical !== undefined && numeric > hiCritical) return 'CRITICALLY_HIGH';
  if (hiNormal !== undefined && numeric > hiNormal) return 'HIGH';
  if (lowAbsolute !== undefined && numeric < lowAbsolute) return 'OFF_SCALE_LOW';
  if (lowCritical !== undefined && numeric < lowCritical) return 'CRITICALLY_LOW';
  if (lowNormal !== undefined && numeric < lowNormal) return 'LOW';
  return 'NORMAL';
}

/** True when a result should be visually flagged — i.e. assessed, and not normal. */
export function isAbnormal(interpretation: CaseSummaryLabInterpretation): boolean {
  return interpretation !== 'NORMAL' && interpretation !== '--';
}

/** Formats the *normal* range for display, units excluded. */
export function formatReferenceRange(range: ObsTreeRange): string | undefined {
  const low = referenceBound(range.lowNormal);
  const high = referenceBound(range.hiNormal);
  if (low !== undefined && high !== undefined) return `${low} – ${high}`;
  if (low !== undefined) return `≥ ${low}`;
  if (high !== undefined) return `≤ ${high}`;
  return undefined;
}

/** Sortable timestamp for an obs; undated obs sort last rather than corrupting the order. */
function obsTime(obs: ObsTreeObs): number {
  const parsed = Date.parse(readObsDatetime(obs) ?? '');
  return Number.isFinite(parsed) ? parsed : 0;
}

/**
 * The calendar-date portion of an ISO datetime, e.g. `"2026-08-03"`.
 *
 * Compared as a *string* rather than via `Date`, deliberately. Both the obs datetime
 * and the visit datetime come from the same server in the same UTC offset
 * (`2026-08-03T11:15:05.000+0300`), so their written dates are already on a common
 * basis. Parsing to `Date` would re-interpret them in the browser's timezone, which
 * can shift the calendar day for early-morning or late-evening results and silently
 * exclude them.
 */
function isoDatePart(value?: string): string | undefined {
  return /^(\d{4}-\d{2}-\d{2})/.exec(value ?? '')?.[1];
}

/**
 * Whether an observation's calendar day falls inside the visit.
 *
 * Day-granular on purpose. The floor is the visit's start day: a tree is patient-wide
 * and holds a concept's whole history, so without a floor a months-old HEMOGLOBIN
 * would read as this visit's result. The ceiling is the visit's *stop* day — which
 * covers a multi-day inpatient stay — and is **absent while the visit is still open**,
 * because an ongoing admission keeps accruing results and a lab routinely posts a
 * result a day or more after the sample was taken.
 *
 * ISO date strings compare lexicographically in chronological order, so `<`/`>` on the
 * `YYYY-MM-DD` prefix is exact and avoids the browser-timezone day shift that parsing
 * to `Date` would introduce (see `isoDatePart`).
 */
function isObsInVisitWindow(obs: ObsTreeObs, window?: ObsVisitWindow): boolean {
  const startDay = isoDatePart(window?.startDatetime);
  if (!startDay) return true;
  const obsDay = isoDatePart(readObsDatetime(obs));
  // An undated obs cannot be placed in the visit; leaving the order `pending` beats guessing.
  if (!obsDay || obsDay < startDay) return false;
  const stopDay = isoDatePart(window?.stopDatetime);
  return !stopDay || obsDay <= stopDay;
}

/**
 * The latest observation belonging to the visit (see `isObsInVisitWindow`). Where a
 * concept has several in-window results, the most recent one wins.
 */
function latestObsInVisitWindow(obs: Array<ObsTreeObs> | undefined, window?: ObsVisitWindow): ObsTreeObs | undefined {
  const candidates = (obs ?? []).filter((entry) => isObsInVisitWindow(entry, window));
  if (!candidates.length) return undefined;
  return candidates.reduce((latest, entry) => (obsTime(entry) > obsTime(latest) ? entry : latest));
}

type ObsTreeWalkState = {
  window?: ObsVisitWindow;
  panel?: string;
  depth: number;
  /** Shared across the whole walk — this is what actually bounds a wide tree. */
  budget: { remaining: number };
  /** Concept uuids already emitted, so a concept repeated across branches yields one row. */
  seen: Set<string>;
  results: Array<CaseSummaryLabResult>;
};

function walkObsTree(node: ObsTreeNode | undefined, state: ObsTreeWalkState): void {
  if (!node || typeof node !== 'object') return;
  if (state.depth > OBS_TREE_MAX_DEPTH || state.budget.remaining <= 0) return;
  state.budget.remaining -= 1;

  const latest = latestObsInVisitWindow(node.obs, state.window);
  const value = latest ? readObsValue(latest.value) : undefined;
  const conceptUuid = node.conceptUuid;
  if (latest && value !== undefined && !(conceptUuid && state.seen.has(conceptUuid))) {
    if (conceptUuid) state.seen.add(conceptUuid);
    // The obs carries its own copy of the bounds; prefer it over the node's, since it
    // reflects the range in force when the result was taken. Falls back to the node.
    const range: ObsTreeRange = hasAnyBound(latest) ? latest : node;
    const interpretation = assessValue(value, range);
    state.results.push({
      conceptUuid,
      test: node.display ?? node.flatName ?? '',
      panel: state.panel,
      value,
      units: node.units || undefined,
      datetime: readObsDatetime(latest),
      range: formatReferenceRange(range),
      interpretation,
      abnormal: isAbnormal(interpretation),
    });
  }

  // Recurse even when this node itself emitted: `obs` and `subSets` are not mutually
  // exclusive, and a server that populates both must not have half its data dropped.
  //
  // The ROOT node's display is not used as a panel label — it's the query container
  // ("LABORATORY TESTS"), not a clinical panel, and would prefix every single row.
  const panelForChildren = state.depth === 0 ? undefined : (node.display ?? state.panel);
  for (const child of node.subSets ?? []) {
    if (state.budget.remaining <= 0) break;
    walkObsTree(child, { ...state, panel: panelForChildren, depth: state.depth + 1 });
  }
}

/**
 * Flattens one obstree branch into display rows, depth-first, keeping only nodes with
 * a non-empty `obs` belonging to the visit (see `latestObsInVisitWindow`).
 *
 * Guarded by a depth cap and a shared node budget; both stop the walk silently,
 * because a malformed tree must not take down the summary. No cycle detection: JSON
 * cannot contain reference cycles, so a `WeakSet` here would be dead code. What DOES
 * occur is the same concept appearing in several branches — real trees carry
 * HEMOGLOBIN under COMPLETE BLOOD COUNT, at the root, and under ANTENATAL CARE
 * PROFILE — so concepts are de-duped, first (latest-on-the-day) occurrence winning.
 */
export function flattenObsTree(node: ObsTreeNode, options?: { window?: ObsVisitWindow }): Array<CaseSummaryLabResult> {
  const results: Array<CaseSummaryLabResult> = [];
  walkObsTree(node, {
    window: options?.window,
    depth: 0,
    budget: { remaining: OBS_TREE_MAX_NODES },
    seen: new Set<string>(),
    results,
  });
  return results;
}

/** Absorbs the response envelope, which differs by server: bare node, array, or `{results}`. */
export function normalizeObsTreeResponse(payload: unknown): Array<ObsTreeNode> {
  if (!payload || typeof payload !== 'object') return [];
  if (Array.isArray(payload)) return payload as Array<ObsTreeNode>;
  const record = payload as Record<string, unknown>;
  if (Array.isArray(record.results)) return record.results as Array<ObsTreeNode>;
  const looksLikeNode =
    typeof record.conceptUuid === 'string' || typeof record.display === 'string' || Array.isArray(record.subSets);
  return looksLikeNode ? [payload as ObsTreeNode] : [];
}

/**
 * Fetches the obstree for every ordered concept in ONE request. Returns `ok: false`
 * only for a genuine failure, so the view can distinguish "could not be retrieved"
 * from "nothing resulted" — an empty concept list is a success that skips the network.
 */
/**
 * One obstree request. `concept` is assembled by hand rather than through
 * `URLSearchParams`, which percent-encodes the separator to `%2C`; the resource is
 * documented and verified with a literal comma. Concept uuids are hex-and-dashes, so
 * there is nothing else here needing encoding.
 */
async function requestObsTree(patientUuid: string, conceptParam: string): Promise<{ trees: Array<ObsTreeNode>; ok: boolean }> {
  const url = `${restBaseUrl}/obstree?patient=${encodeURIComponent(patientUuid)}&concept=${conceptParam}`;
  try {
    const response = await openmrsFetch<unknown>(url);
    if (!response.ok) return { trees: [], ok: false };
    return { trees: normalizeObsTreeResponse(await response.json()), ok: true };
  } catch {
    return { trees: [], ok: false };
  }
}

/**
 * Fetches the obstree for every ordered concept, preferring a single comma-separated
 * request. If that is rejected — which a server may do once several concepts are in
 * play, and merging a day's visits makes that common — it retries **one request per
 * concept** in parallel and merges the results.
 *
 * `ok` is false only when nothing at all could be retrieved, so a partial result still
 * renders rather than being replaced by an error. An empty concept list is a success
 * that skips the network entirely.
 */
export async function fetchObsTrees(
  patientUuid: string,
  conceptUuids: Array<string>,
): Promise<{ trees: Array<ObsTreeNode>; ok: boolean }> {
  if (!conceptUuids.length) return { trees: [], ok: true };

  const joined = await requestObsTree(patientUuid, conceptUuids.join(','));
  if (joined.ok || conceptUuids.length === 1) return joined;

  const perConcept = await Promise.all(conceptUuids.map((conceptUuid) => requestObsTree(patientUuid, conceptUuid)));
  return {
    trees: perConcept.flatMap((result) => result.trees),
    ok: perConcept.some((result) => result.ok),
  };
}

/**
 * Pairs each order with its obstree root and flattens the results. Matching is by
 * concept uuid, then display name, then position — position only when there is
 * exactly one of each, so it can never mis-pair. An order that matches nothing stays
 * `pending` rather than disappearing; a tree that matches no order is discarded,
 * since only what was ordered this visit belongs in the section.
 */
export function attachObsTreeResults(
  orders: Array<CaseSummaryTestOrder>,
  trees: Array<ObsTreeNode>,
  options?: { window?: ObsVisitWindow },
): Array<CaseSummaryTestOrder> {
  const unmatched = [...trees];

  const takeTreeFor = (order: CaseSummaryTestOrder): ObsTreeNode | undefined => {
    let index = unmatched.findIndex((tree) => !!tree.conceptUuid && tree.conceptUuid === order.conceptUuid);
    if (index === -1) {
      const test = order.test.trim().toLowerCase();
      index = test ? unmatched.findIndex((tree) => (tree.display ?? '').trim().toLowerCase() === test) : -1;
    }
    if (index === -1 && orders.length === 1 && unmatched.length === 1) index = 0;
    return index === -1 ? undefined : unmatched.splice(index, 1)[0];
  };

  return orders.map((order) => {
    const tree = takeTreeFor(order);
    const results = tree ? flattenObsTree(tree, options) : [];
    return { ...order, results, pending: results.length === 0 };
  });
}

/**
 * Derive inpatient admission details from a visit's ADT encounters (admission,
 * bed assignment/transfer, discharge), sorted chronologically. Returns
 * `undefined` when the visit carries no ADT encounter, i.e. it was never an
 * inpatient stay.
 */
export function buildInpatientDetails(encounters: Array<CaseSummaryEncounter>): CaseSummaryInpatientDetails | undefined {
  const { ADMIT_ENCOUNTER_TYPE_UUID, BED_ASSIGNMENT_ENCOUNTER_TYPE_UUID, TRANSFER_REQUEST_ENCOUNTER_TYPE_UUID, DISCHARGE_ENCOUNTER_TYPE_UUID } =
    AdmissionEncounterTypeUuids;
  const adtEncounterTypeUuids: Array<string> = [
    ADMIT_ENCOUNTER_TYPE_UUID,
    BED_ASSIGNMENT_ENCOUNTER_TYPE_UUID,
    TRANSFER_REQUEST_ENCOUNTER_TYPE_UUID,
    DISCHARGE_ENCOUNTER_TYPE_UUID,
  ];
  const adtEncounters = encounters
    .filter((e) => !!e.encounterTypeUuid && adtEncounterTypeUuids.includes(e.encounterTypeUuid))
    .sort((a, b) => (a.encounterDatetime ?? '').localeCompare(b.encounterDatetime ?? ''));
  if (!adtEncounters.length) {
    return undefined;
  }

  const admission = adtEncounters.find((e) => e.encounterTypeUuid === ADMIT_ENCOUNTER_TYPE_UUID);
  const discharge = [...adtEncounters].reverse().find((e) => e.encounterTypeUuid === DISCHARGE_ENCOUNTER_TYPE_UUID);
  // Ward/doctor reflect the most recent ADT encounter, so a later transfer or
  // bed reassignment overrides the original admission.
  const latest = adtEncounters[adtEncounters.length - 1];

  return {
    admissionDate: admission?.encounterDatetime,
    ward: latest.location,
    doctor: admission?.provider ?? latest.provider,
    status: discharge ? 'Discharged' : 'Admitted',
    dischargeDate: discharge?.encounterDatetime,
  };
}

/** Recognises an obs label as one of the vitals shown in the Latest Vitals grid. */
const VITAL_LABEL_TESTS: Array<(label: string) => boolean> = [
  (l) => /^temperature/i.test(l),
  (l) => /^pulse/i.test(l),
  (l) => /^respiratory rate/i.test(l),
  (l) => /^(blood oxygen saturation|spo2|oxygen saturation)/i.test(l),
  (l) => /^height/i.test(l),
  (l) => /^weight/i.test(l),
  (l) => /^body mass index/i.test(l),
  (l) => /^triage early warning score/i.test(l),
  (l) => /^systolic$/i.test(l),
  (l) => /^diastolic$/i.test(l),
];

function isVitalObs(label: string): boolean {
  return VITAL_LABEL_TESTS.some((test) => test(label));
}

/**
 * Builds the Latest Vitals rows from the visit's encounter obs, picking the most
 * recent value per vital across all encounters. Vitals are matched by obs label
 * text (e.g. "TEMPERATURE (C): 37.0") rather than FHIR Observation, since some
 * FHIR2 deployments don't populate Observation with what these OpenMRS forms
 * actually capture.
 */
export function buildVitalsFromEncounters(encounters: Array<CaseSummaryEncounter>): Array<CaseSummaryLabelValue> {
  const byRecency = [...encounters].sort((a, b) => (b.encounterDatetime ?? '').localeCompare(a.encounterDatetime ?? ''));
  const allObs = byRecency.flatMap((e) => e.obs);
  const latest = (test: (label: string) => boolean) => allObs.find((o) => test(o.label))?.value;

  const systolic = latest((l) => /^systolic$/i.test(l));
  const diastolic = latest((l) => /^diastolic$/i.test(l));

  return [
    { label: 'Temperature', value: latest((l) => /^temperature/i.test(l)) },
    { label: 'Blood Pressure', value: systolic && diastolic ? `${systolic}/${diastolic} mmHg` : undefined },
    { label: 'Pulse', value: latest((l) => /^pulse/i.test(l)) },
    { label: 'Respiratory Rate', value: latest((l) => /^respiratory rate/i.test(l)) },
    { label: 'SpO₂', value: latest((l) => /^(blood oxygen saturation|spo2|oxygen saturation)/i.test(l)) },
    { label: 'Height', value: latest((l) => /^height/i.test(l)) },
    { label: 'Weight', value: latest((l) => /^weight/i.test(l)) },
    { label: 'BMI', value: latest((l) => /^body mass index/i.test(l)) },
    { label: 'TEW Score', value: latest((l) => /^triage early warning score/i.test(l)) },
  ];
}

/**
 * Groups each encounter's non-vital obs into a Clinical Notes entry (per-encounter
 * summary). Encounters with no non-vital obs are omitted. See `buildVitalsFromEncounters`
 * for why this reads REST obs rather than FHIR DocumentReference/Observation.
 */
export function buildEncounterNotes(encounters: Array<CaseSummaryEncounter>): Array<CaseSummaryEncounterNote> {
  return encounters
    .map((e) => ({
      encounterUuid: e.uuid,
      display: e.display,
      encounterType: e.encounterType,
      datetime: e.encounterDatetime,
      obs: e.obs.filter((o) => !isVitalObs(o.label)),
    }))
    .filter((note) => note.obs.length > 0)
    .sort((a, b) => (b.datetime ?? '').localeCompare(a.datetime ?? ''));
}

/**
 * Maps the raw visit payload into everything derived from it: the visit itself,
 * demographics, and encounters (with parsed obs). Conditions ("Active Diagnoses")
 * and medications are deliberately *not* derived here — see `mapConditionEntry`
 * and `fetchDrugOrders` respectively.
 */
export function mapVisitPayload(payload: VisitWithEverythingPayload): {
  visit: CaseSummaryVisit;
  demographics: CaseSummaryDemographics;
  encounterUuids: Array<string>;
  encounters: Array<CaseSummaryEncounter>;
  /**
   * Test orders read off the visit's own encounters. Empty when the widened rep was
   * rejected (see `fetchVisitPayload`) — the caller falls back to `fetchTestOrders`.
   */
  testOrders: Array<CaseSummaryTestOrder>;
} {
  const nonVoided = (payload.encounters ?? []).filter((e) => e.uuid && !e.voided);
  const encounterUuids = nonVoided.map((e) => e.uuid);
  const encounters: Array<CaseSummaryEncounter> = nonVoided.map((e) => ({
    uuid: e.uuid,
    display: e.display,
    encounterDatetime: e.encounterDatetime,
    encounterTypeUuid: e.encounterType?.uuid,
    encounterType: e.encounterType?.display,
    location: e.location?.display,
    provider: e.encounterProviders?.[0]?.provider?.person?.display,
    obs: (e.obs ?? []).map((o) => parseObsDisplay(o.display)).filter((o): o is CaseSummaryObs => !!o),
  }));

  // No visit scoping needed: these orders hang off this visit's own encounters, so
  // they belong to it by construction. The encounter uuid is stitched back on so
  // downstream code has the same shape as the top-level `/order` path.
  const testOrders = mapTestOrders(
    nonVoided.flatMap((encounter) =>
      (encounter.orders ?? []).map((order) => ({ ...order, encounter: { uuid: encounter.uuid } })),
    ),
  );

  return {
    visit: {
      uuid: payload.uuid,
      display: payload.display,
      startDatetime: payload.startDatetime,
      stopDatetime: payload.stopDatetime,
      visitType: payload.visitType?.display,
    },
    demographics: mapDemographics(payload.patient),
    encounterUuids,
    encounters,
    testOrders,
  };
}

/**
 * How many recent visits to pull when looking for same-day siblings. One outpatient
 * day realistically holds a handful of visits; anything beyond the anchor's day is
 * simply ignored.
 */
const VISIT_LOOKBACK_LIMIT = 10;

/**
 * The patient's recent visits, newest first, including ended ones.
 *
 * `includeInactive=true` returns active *and* closed visits, which is what lets a
 * single request both prefer the active visit and find its same-day siblings — an
 * earlier OPD visit that has already been closed still belongs on the same day's
 * summary.
 */
async function fetchRecentVisits(patientUuid: string, rep: string): Promise<Array<VisitWithEverythingPayload>> {
  const params = {
    patient: patientUuid,
    includeInactive: 'true',
    limit: String(VISIT_LOOKBACK_LIMIT),
    sort: 'desc',
    v: rep,
  };
  const url = `${restBaseUrl}/visit?${new URLSearchParams(params).toString()}`;
  const response = await openmrsFetch<{ results?: Array<VisitWithEverythingPayload> }>(url);
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to fetch visit: ${response.status} - ${errorText}`);
  }
  const payload = await response.json();
  return payload.results ?? [];
}

/**
 * The visit the summary is anchored on: the most recent still-open one, else simply the
 * most recent. Preferring an open visit stops an ongoing inpatient stay being shadowed
 * by a same-day outpatient visit that merely started later.
 */
export function pickAnchorVisit(visits: Array<VisitWithEverythingPayload>): VisitWithEverythingPayload | undefined {
  return visits.find((visit) => !visit.stopDatetime) ?? visits[0];
}

/**
 * Every visit that started on the same calendar day as the anchor, anchor included.
 * Compared on the written date — see `isoDatePart` for why not via `Date`.
 */
export function sameDayVisits(
  visits: Array<VisitWithEverythingPayload>,
  anchor: VisitWithEverythingPayload,
): Array<VisitWithEverythingPayload> {
  const anchorDay = isoDatePart(anchor.startDatetime);
  if (!anchorDay) return [anchor];
  return visits.filter((visit) => isoDatePart(visit.startDatetime) === anchorDay);
}

/**
 * Folds several same-day visits into one payload, so a patient checked in more than
 * once in a day gets a single comprehensive summary rather than whichever visit
 * happened to sort first.
 *
 * The anchor supplies identity and demographics. Encounters are unioned and
 * de-duplicated. The span runs from the earliest start to the latest stop — and is left
 * **open when any of the merged visits is still open**, since results are still
 * arriving against it (see `isObsInVisitWindow`).
 */
export function mergeVisitPayloads(visits: Array<VisitWithEverythingPayload>): VisitWithEverythingPayload {
  const [anchor] = visits;
  if (visits.length === 1) return anchor;

  const encountersByUuid = new Map<string, VisitEncounterPayload>();
  for (const encounter of visits.flatMap((visit) => visit.encounters ?? [])) {
    if (encounter?.uuid && !encountersByUuid.has(encounter.uuid)) encountersByUuid.set(encounter.uuid, encounter);
  }

  const starts = visits.map((visit) => visit.startDatetime).filter((value): value is string => !!value);
  const stops = visits.map((visit) => visit.stopDatetime);
  const anyOpen = stops.some((stop) => !stop);
  const closedStops = stops.filter((value): value is string => !!value);

  return {
    ...anchor,
    startDatetime: starts.length ? starts.reduce((earliest, value) => (value < earliest ? value : earliest)) : anchor.startDatetime,
    stopDatetime: anyOpen || !closedStops.length ? undefined : closedStops.reduce((latest, value) => (value > latest ? value : latest)),
    encounters: Array.from(encountersByUuid.values()),
  };
}

async function fetchVisitByRep(
  patientUuid: string,
  visitUuid: string | undefined,
  rep: string,
): Promise<{ payload: VisitWithEverythingPayload; visitUuids: Array<string> }> {
  // An explicitly requested visit is returned as-is — asking for one visit should not
  // silently fold in its neighbours.
  if (visitUuid) {
    const url = `${restBaseUrl}/visit/${visitUuid}?v=${rep}`;
    const response = await openmrsFetch<VisitWithEverythingPayload>(url);
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Failed to fetch visit: ${response.status} - ${errorText}`);
    }
    const payload = await response.json();
    return { payload, visitUuids: [payload.uuid].filter(Boolean) };
  }

  const visits = await fetchRecentVisits(patientUuid, rep);
  const anchor = pickAnchorVisit(visits);
  if (!anchor) {
    throw new Error('No visit found for this patient.');
  }
  const merged = sameDayVisits(visits, anchor);
  return { payload: mergeVisitPayloads(merged), visitUuids: merged.map((visit) => visit.uuid).filter(Boolean) };
}

async function fetchVisitPayload(
  patientUuid: string,
  visitUuid?: string,
): Promise<{ payload: VisitWithEverythingPayload; visitUuids: Array<string>; ordersIncluded: boolean }> {
  try {
    return { ...(await fetchVisitByRep(patientUuid, visitUuid, visitWithOrdersRep)), ordersIncluded: true };
  } catch (error) {
    if (error instanceof Error && error.message.startsWith('No visit found')) throw error;
    return { ...(await fetchVisitByRep(patientUuid, visitUuid, visitWithEverythingRep)), ordersIncluded: false };
  }
}

/**
 * Fetch a patient-level FHIR R4 resource type and normalise the Bundle into entries.
 * Returns `[]` rather than throwing, since every group here is supplementary to the
 * visit fetch and must not be able to take the summary down.
 *
 * Deliberately has no encounter-scoping or client-side filter options: both existed
 * for `DiagnosticReport` and `MedicationRequest`, and both of those moved to REST
 * (`/obstree` and `/order`) because FHIR2 didn't carry the data. The two remaining
 * callers — Allergies and Condition — are patient-level standing records that must
 * NOT be scoped to the visit, or a patient's existing allergies and diagnoses would
 * vanish from the summary.
 */
export async function fetchFhirGroup(resourceType: string, patientUuid: string): Promise<Array<FhirEntry>> {
  const queryString = new URLSearchParams({ patient: patientUuid, _summary: 'data' }).toString();
  const url = `${fhirBaseUrl}/${resourceType}?${queryString}`;
  const response = await openmrsFetch<FhirBundle>(url);
  if (!response.ok) return [];
  const payload: FhirBundle = await response.json();
  return payload.entry ?? [];
}

const DIAGNOSIS_RANK_EXTENSION_URL = 'http://fhir.openmrs.org/R4/StructureDefinition/diagnosis-rank';

/**
 * True for a coding/concept-source that identifies ICD-11. Matched loosely rather
 * than against a fixed string because the naming differs by layer and deployment:
 * this app's server names the concept source `ICD-11-WHO`, while FHIR would use a
 * URI such as `http://id.who.int/icd/release/11/mms`.
 */
function isIcd11(nameOrSystem?: string): boolean {
  const value = nameOrSystem?.toLowerCase();
  return !!value && value.includes('icd') && value.includes('11');
}

/**
 * Maps one FHIR `Condition` entry to an Active Diagnoses row. Returns `undefined`
 * when it has no description. Uses `verificationStatus` (not `clinicalStatus`,
 * which this app's Condition entries always report as "unknown") and the
 * `diagnosis-rank` extension for "primary" — see the note on `CaseSummaryDiagnosis`.
 *
 * `code` is only set here when the server emits a genuine ICD-11 coding (i.e. it has
 * ICD-11 registered in `fhir_concept_source`). This app's server doesn't, so the only
 * coding is a system-less one carrying the OpenMRS concept uuid — kept as
 * `conceptUuid` so `resolveIcd11Codes` can look the real code up, and deliberately
 * *not* surfaced as `code`, since a uuid in an ICD-11 column is worse than a blank.
 */
export function mapConditionEntry(entry: FhirEntry): CaseSummaryDiagnosis | undefined {
  const r = entry.resource as Record<string, any>;
  const codings: Array<Record<string, any>> = r.code?.coding ?? [];
  const description = r.code?.text ?? codings[0]?.display;
  if (!description) return undefined;
  const rank = (r.extension as Array<Record<string, any>> | undefined)?.find((e) => e.url === DIAGNOSIS_RANK_EXTENSION_URL)?.valueInteger;
  return {
    code: codings.find((c) => isIcd11(c.system))?.code,
    conceptUuid: codings.find((c) => !c.system)?.code,
    description,
    certainty: r.verificationStatus?.coding?.[0]?.code,
    primary: rank === 1,
    onsetDate: r.onsetDateTime ?? r.recordedDate,
  };
}

/**
 * Custom rep for a concept's ICD-11 mapping. Note `conceptMappings`, not `mappings`:
 * custom reps resolve by bean reflection, and the real getter is
 * `Concept.getConceptMappings()` — see the note on `orderRep`.
 */
const conceptMappingsRep = 'custom:(uuid,display,conceptMappings:(conceptReferenceTerm:(code,name,conceptSource:(name))))';

type ConceptMappingsPayload = {
  conceptMappings?: Array<{
    conceptReferenceTerm?: { code?: string; name?: string; conceptSource?: { name?: string } };
  }>;
};

/**
 * Concept uuid -> ICD-11 code (or `undefined` when the concept has no ICD-11
 * mapping). Concept mappings are static reference data, so caching for the session
 * is safe; it matters because SWR revalidation re-runs `getVisitCaseSummary`, and
 * common diagnoses recur across patients. A lookup that failed transiently stays
 * cached as unresolved until reload — acceptable for a display-only code.
 */
const icd11CodeCache = new Map<string, string | undefined>();

/** Looks up one concept's ICD-11 code. Resolves to `undefined` instead of throwing — a code lookup must never break the summary. */
async function fetchIcd11Code(conceptUuid: string): Promise<string | undefined> {
  try {
    const response = await openmrsFetch<ConceptMappingsPayload>(`${restBaseUrl}/concept/${conceptUuid}?v=${conceptMappingsRep}`);
    if (!response.ok) return undefined;
    const payload = await response.json();
    return payload.conceptMappings?.find((m) => isIcd11(m.conceptReferenceTerm?.conceptSource?.name))?.conceptReferenceTerm?.code;
  } catch {
    return undefined;
  }
}

/**
 * Fills in the ICD-11 `code` for diagnoses that don't already carry one, from each
 * concept's mappings. Lookups are deduped by concept and cached, and run in
 * parallel — one request per distinct unmapped concept (typically 1-5 per visit).
 */
export async function resolveIcd11Codes(diagnoses: Array<CaseSummaryDiagnosis>): Promise<Array<CaseSummaryDiagnosis>> {
  const unresolved = Array.from(
    new Set(diagnoses.filter((d) => !d.code && d.conceptUuid).map((d) => d.conceptUuid as string)),
  ).filter((conceptUuid) => !icd11CodeCache.has(conceptUuid));

  await Promise.all(
    unresolved.map(async (conceptUuid) => {
      icd11CodeCache.set(conceptUuid, await fetchIcd11Code(conceptUuid));
    }),
  );

  return diagnoses.map((d) => (d.code || !d.conceptUuid ? d : { ...d, code: icd11CodeCache.get(d.conceptUuid) }));
}

/**
 * Assembles the full case summary for a visit. Demographics, encounters, vitals, and
 * clinical notes come from a single REST call (`fetchVisitPayload`), plus four
 * supplementary calls for what can't be nested under a visit: Active Diagnoses
 * (FHIR Condition), Allergies (FHIR AllergyIntolerance), and two REST `/order`
 * fetches — medications (where the `DrugOrder` dosing fields resolve) and test
 * orders. Test results then need a second wave, because obstree is keyed by the
 * concepts those orders carry; it shares the wave `resolveIcd11Codes` already
 * occupies, so it adds no new round-trip layer.
 *
 * When `visitUuid` is omitted, the patient's most recent visit is resolved as part
 * of that same first call.
 */
export async function getVisitCaseSummary(patientUuid: string, visitUuid?: string): Promise<VisitCaseSummary> {
  const { payload: visitPayload, visitUuids, ordersIncluded } = await fetchVisitPayload(patientUuid, visitUuid);
  const { visit, demographics, encounterUuids, encounters, testOrders: visitTestOrders } = mapVisitPayload(visitPayload);

  const [allergies, conditionEntries, medications, testOrders] = await Promise.all([
    fetchFhirGroup('AllergyIntolerance', patientUuid), // patient-level, not encounter-scoped
    // NOT encounter-scoped: a Condition is the patient's standing problem-list entry.
    // OpenMRS does attach the `encounter` it was first recorded in, but that's usually
    // an *earlier* visit's encounter, so scoping to this visit's encounters would drop
    // every diagnosis the patient already had on arrival.
    fetchFhirGroup('Condition', patientUuid),
    fetchDrugOrders(patientUuid),
    // The widened visit rep already carried the orders, so skip the extra round-trips.
    ordersIncluded ? Promise.resolve(visitTestOrders) : fetchTestOrders(patientUuid, { visitUuid: visit.uuid, encounterUuids }),
  ]);

  const [conditions, obsTrees] = await Promise.all([
    resolveIcd11Codes(conditionEntries.map(mapConditionEntry).filter((c): c is CaseSummaryDiagnosis => !!c)),
    fetchObsTrees(patientUuid, testOrderConceptUuids(testOrders)),
  ]);

  // Results are restricted to the visit's own span of days, so a months-old value for
  // the same concept is never shown as though this visit's order had produced it. An
  // open visit has no upper bound — see `isObsInVisitWindow`.
  const labOrders = attachObsTreeResults(testOrders, obsTrees.trees, {
    window: { startDatetime: visit.startDatetime, stopDatetime: visit.stopDatetime },
  });

  const encounterEntries: Array<FhirEntry> = encounterUuids.map((uuid) => ({
    resource: { resourceType: 'Encounter', id: uuid },
  }));

  const groups: VisitCaseSummary['groups'] = {
    allergies,
    encounters: encounterEntries,
  };

  return {
    patientUuid,
    visit,
    visitUuids,
    encounterUuids,
    demographics,
    groups,
    conditions,
    medications,
    vitals: buildVitalsFromEncounters(encounters),
    clinicalNotes: buildEncounterNotes(encounters),
    labOrders,
    // Only true for a genuine fetch failure, so the view can say "could not be
    // retrieved" instead of the section looking like nothing was resulted.
    labResultsUnavailable: !obsTrees.ok || undefined,
    inpatientDetails: buildInpatientDetails(encounters),
  };
}

/**
 * SWR hook for the visit case summary. When `visitUuid` is omitted the most
 * recent visit is resolved as part of the same underlying call. Returns the
 * standard `{ data, isLoading, error, mutate }` shape used across the app.
 */
export function useVisitCaseSummary(patientUuid?: string, visitUuid?: string) {
  const key = patientUuid ? `case-summary:${patientUuid}:${visitUuid ?? 'latest'}` : null;
  const { data, isLoading, error, mutate } = useSWR<VisitCaseSummary, Error>(key, () =>
    getVisitCaseSummary(patientUuid as string, visitUuid),
  );
  return { summary: data, isLoading, error, mutate };
}

export const CASE_SUMMARY_GROUPS: Array<{ key: CaseSummaryGroupKey; label: string }> = [
  { key: 'allergies', label: 'Allergies' },
];
