import { formatDate, formatDatetime, parseDate } from '@openmrs/esm-framework';
import { type CaseSummaryLabInterpretation, type FhirEntry } from '../types/case-summary.types';

export const EMPTY_VALUE = '—';

type CodeableConcept = { text?: string; coding?: Array<{ system?: string; code?: string; display?: string }> };

function codeableConceptText(cc: CodeableConcept | undefined): string | undefined {
  return cc?.text || cc?.coding?.[0]?.display || cc?.coding?.[0]?.code;
}

export function formatDateSafe(value?: string): string {
  return value ? formatDate(parseDate(value), { time: false }) : EMPTY_VALUE;
}

/** Date *with* time — used where several encounters share a day and need telling apart. */
export function formatDateTimeSafe(value?: string): string {
  return value ? formatDatetime(parseDate(value)) : EMPTY_VALUE;
}

export type AllergyRow = { substance: string; criticality: string; reaction: string };

export function mapAllergyRow(entry: FhirEntry): AllergyRow {
  const r = entry.resource as Record<string, any>;
  return {
    substance: codeableConceptText(r.code) ?? EMPTY_VALUE,
    criticality: r.criticality ?? EMPTY_VALUE,
    reaction: codeableConceptText(r.reaction?.[0]?.manifestation?.[0]) ?? EMPTY_VALUE,
  };
}

/**
 * Human label for a lab interpretation. Exists so the raw union value is never
 * rendered: its unassessable member is `'--'` (two ASCII hyphens), which is NOT
 * `EMPTY_VALUE` ('—', an em dash), and shipping both to the page one character apart
 * would be a bug waiting to happen.
 */
export function interpretationLabel(interpretation: CaseSummaryLabInterpretation): string {
  switch (interpretation) {
    case 'NORMAL':
      return 'Normal';
    case 'LOW':
      return 'Low';
    case 'HIGH':
      return 'High';
    case 'CRITICALLY_LOW':
      return 'Critically low';
    case 'CRITICALLY_HIGH':
      return 'Critically high';
    case 'OFF_SCALE_LOW':
      return 'Off-scale low';
    case 'OFF_SCALE_HIGH':
      return 'Off-scale high';
    default:
      return EMPTY_VALUE;
  }
}

/** Carbon tag tone for a lab interpretation — red for critical/off-scale, magenta for a plain high/low. */
export function interpretationTagType(interpretation: CaseSummaryLabInterpretation): 'red' | 'magenta' {
  return interpretation === 'LOW' || interpretation === 'HIGH' ? 'magenta' : 'red';
}

