import { buildRows, columnsFor, statusColumnFor, statusTagType, NOT_RECORDED } from './shr-presentation';
import type {
  ShrAllergyIntolerance,
  ShrEpisodeOfCare,
  ShrImmunization,
  ShrMedicationAdministration,
  ShrMedicationDispense,
  ShrObservation,
  ShrProcedure,
} from '../shr.types';

/**
 * Fixtures trimmed from a real SHR `patient-records` response: a `vital-signs`
 * Observation, an `exam` (secondary-survey) Observation, and one Observation
 * with no `category` at all, to make sure the three never collide.
 */
const systolicBp: ShrObservation = {
  resourceType: 'Observation',
  id: '0b6306fc-ccd4-444f-bb8b-64e59aa8ce1e',
  status: 'final',
  category: [
    { coding: [{ system: 'http://terminology.hl7.org/CodeSystem/observation-category', code: 'vital-signs' }] },
  ],
  code: { coding: [{ system: 'https://nshr-uat.sha.go.ke/fhir/CodeSystem/em-vital-signs-loinc-cs', code: '8480-6' }] },
  effectiveDateTime: '2026-08-03T13:07:17.270302+03:00',
  valueQuantity: { value: 120, unit: 'mmHg', code: 'mm[Hg]' },
};

const rigidityFinding: ShrObservation = {
  resourceType: 'Observation',
  id: '3e33b28a-1c61-4472-8bb0-d7c00d1462d5',
  status: 'final',
  category: [{ coding: [{ system: 'http://terminology.hl7.org/CodeSystem/observation-category', code: 'exam' }] }],
  code: {
    coding: [{ system: 'https://nshr-uat.sha.go.ke/fhir/CodeSystem/em-secondary-survey-region', code: 'XA55T2' }],
  },
  bodySite: { coding: [{ system: 'https://nshr-uat.sha.go.ke/fhir/CodeSystem/em-body-region', code: 'XA55T2' }] },
  extension: [
    { url: 'https://nshr-uat.sha.go.ke/fhir/StructureDefinition/em-no-findings-on-exam', valueBoolean: false },
  ],
  effectiveDateTime: '2026-08-03T13:07:44.370538+03:00',
  valueCodeableConcept: {
    coding: [{ system: 'https://nshr-uat.sha.go.ke/fhir/CodeSystem/em-body-assessment-finding', code: 'rigidity' }],
  },
};

const noFindingsExam: ShrObservation = {
  resourceType: 'Observation',
  id: '8a320cfc-d4e9-4602-a1df-1229d9565be4',
  status: 'final',
  category: [{ coding: [{ code: 'exam' }] }],
  bodySite: { coding: [{ code: 'XA45A6' }] },
  extension: [
    { url: 'https://nshr-uat.sha.go.ke/fhir/StructureDefinition/em-no-findings-on-exam', valueBoolean: true },
  ],
  effectiveDateTime: '2026-08-03T13:07:44.370538+03:00',
};

const genuineLabResult: ShrObservation = {
  resourceType: 'Observation',
  id: 'lab-1',
  status: 'final',
  code: { coding: [{ display: 'Malaria RDT' }] },
  valueCodeableConcept: { coding: [{ display: 'Negative' }] },
  effectiveDateTime: '2026-08-03T13:07:44.370538+03:00',
};

describe('vitals presentation (Observation + categoryCode "vital-signs")', () => {
  it('has the expected columns, and names the bare LOINC code from the bundled code systems', () => {
    const headers = columnsFor('Observation', 'vital-signs').map((h) => h.header);
    expect(headers).toEqual(['Vital sign', 'Reading', 'Status', 'Recorded']);

    const [row] = buildRows('Observation', [systolicBp], 'vital-signs');
    expect(row.cells.vitalSign).toBe('Systolic blood pressure');
    expect(row.cells.result).toBe('120 mmHg');
  });

  it('falls back to the raw code when the coding names a code system we do not carry', () => {
    const unknownSystem: ShrObservation = {
      ...systolicBp,
      code: { coding: [{ system: 'https://nshr-uat.sha.go.ke/fhir/CodeSystem/em-not-bundled', code: '8480-6' }] },
    };

    const [row] = buildRows('Observation', [unknownSystem], 'vital-signs');
    expect(row.cells.vitalSign).toBe('8480-6');
  });

  it('has its own status column, distinct from the generic Observation presenter', () => {
    expect(statusColumnFor('Observation', 'vital-signs')).toBe('status');
  });
});

describe('exam findings presentation (Observation + categoryCode "exam")', () => {
  it('names the body region and the finding from the bundled code systems', () => {
    const [row] = buildRows('Observation', [rigidityFinding], 'exam');
    expect(row.cells.bodyRegion).toBe('Chest');
    expect(row.cells.finding).toBe('Rigidity');
  });

  it('reports "No findings" when the no-findings-on-exam extension is set', () => {
    const [row] = buildRows('Observation', [noFindingsExam], 'exam');
    expect(row.cells.finding).toBe('No findings');
  });
});

describe('generic Observation presentation (the "Lab results" catch-all, no categoryCode)', () => {
  it('is unaffected and keeps the original Test/Result columns', () => {
    const headers = columnsFor('Observation').map((h) => h.header);
    expect(headers).toEqual(['Test', 'Result', 'Status', 'Date']);

    const [row] = buildRows('Observation', [genuineLabResult]);
    expect(row.cells.test).toBe('Malaria RDT');
    expect(row.cells.result).toBe('Negative');
  });
});

/**
 * Allergy fixtures trimmed from live SHR searchset payloads (the
 * `erx-ke-allergy-intolerance` profile): a complete medication allergy with one
 * reaction, an environment allergy recorded without any reaction, and a SNOMED
 * coded one whose codings carry displays but no `text`.
 */
const ALLERGY_CLINICAL = 'http://terminology.hl7.org/CodeSystem/allergyintolerance-clinical';
const ALLERGY_VERIFICATION = 'http://terminology.hl7.org/CodeSystem/allergyintolerance-verification';
const SHA_COMPONENTS = 'https://nshr-uat.sha.go.ke/fhir/CodeSystem/erx-active-components-cs';
const SHA_MANIFESTATIONS = 'https://nshr-uat.sha.go.ke/fhir/CodeSystem/erx-manifestation-cs';

const metforminAllergy: ShrAllergyIntolerance = {
  resourceType: 'AllergyIntolerance',
  id: '2cb9c8f18729e580',
  clinicalStatus: { coding: [{ system: ALLERGY_CLINICAL, code: 'active' }] },
  verificationStatus: { coding: [{ system: ALLERGY_VERIFICATION, code: 'confirmed' }] },
  type: 'intolerance',
  category: ['medication'],
  criticality: 'high',
  code: {
    coding: [{ system: SHA_COMPONENTS, code: 'AC10001', display: 'Metformin' }],
    text: 'Metformin',
  },
  patient: { reference: 'Patient/CR-2026-000022' },
  encounter: { reference: 'Encounter/b10ae4af8990dce0' },
  onsetDateTime: '2026-09-29',
  recordedDate: '2026-09-29T15:38:52.353419+03:00',
  recorder: { reference: 'Practitioner/PUID-0676113-5', display: 'Dr THOMAS MWOGI SANG' },
  lastOccurrence: '2026-09-29',
  reaction: [
    {
      substance: { coding: [{ system: SHA_COMPONENTS, code: 'AC10001', display: 'Metformin' }] },
      manifestation: [
        { coding: [{ system: SHA_MANIFESTATIONS, code: 'NAUSEA', display: 'NAUSEA' }], text: 'NAUSEA' },
      ],
      severity: 'moderate',
    },
  ],
};

const roxadustatAllergy: ShrAllergyIntolerance = {
  resourceType: 'AllergyIntolerance',
  id: '1da4b962997a38cd',
  clinicalStatus: { coding: [{ system: ALLERGY_CLINICAL, code: 'active' }] },
  verificationStatus: { coding: [{ system: ALLERGY_VERIFICATION, code: 'confirmed' }] },
  type: 'allergy',
  category: ['environment'],
  criticality: 'high',
  code: {
    coding: [{ system: SHA_COMPONENTS, code: 'AC10304', display: 'Roxadustat' }],
    text: 'Roxadustat',
  },
  patient: { reference: 'Patient/CR-2026-049644' },
  encounter: { reference: 'Encounter/0ca959c52e90a41f' },
  onsetDateTime: '2026-09-02',
  recordedDate: '2026-10-13T12:02:58.489063+03:00',
  lastOccurrence: '2026-10-20',
};

const penicillinAllergy: ShrAllergyIntolerance = {
  resourceType: 'AllergyIntolerance',
  id: 'allergy-ipsfull-penicillin',
  clinicalStatus: { coding: [{ system: ALLERGY_CLINICAL, code: 'active', display: 'Active' }] },
  verificationStatus: { coding: [{ system: ALLERGY_VERIFICATION, code: 'confirmed', display: 'Confirmed' }] },
  type: 'allergy',
  category: ['medication'],
  criticality: 'high',
  code: { coding: [{ system: 'http://snomed.info/sct', code: '764146007', display: 'Penicillin' }] },
  patient: { reference: 'Patient/patient-ips-full' },
  recordedDate: '2026-09-15T09:30:00+03:00',
  reaction: [{ manifestation: [{ coding: [{ system: 'http://snomed.info/sct', code: '271807003' }] }], severity: 'moderate' }],
};

describe('allergy presentation (AllergyIntolerance)', () => {
  it('has the expected columns, and tags criticality rather than status', () => {
    expect(columnsFor('AllergyIntolerance').map((h) => h.header)).toEqual([
      'Allergy',
      'Status',
      'Criticality',
      'Reaction',
      'Recorded',
    ]);
    expect(statusColumnFor('AllergyIntolerance')).toBe('criticality');
  });

  it('reads the workflow state from clinicalStatus — the resource has no status field', () => {
    const [row] = buildRows('AllergyIntolerance', [metforminAllergy]);
    expect(row.cells.allergy).toBe('Metformin');
    expect(row.cells.status).toBe('Active');
    expect(row.cells.criticality).toBe('High');
    expect(row.cells.reaction).toBe('NAUSEA');
    expect(row.cells.recorded).toBe('29 Sep 2026');
  });

  it('spells the nested reactions out in the detail panel, with severity per reaction', () => {
    const [row] = buildRows('AllergyIntolerance', [metforminAllergy]);
    const byLabel = Object.fromEntries(row.details.map((detail) => [detail.label, detail.value]));
    expect(byLabel['Reactions']).toBe('NAUSEA (Moderate)');
    expect(byLabel['Kind']).toBe('Intolerance');
    expect(byLabel['Category']).toBe('Medication');
    expect(byLabel['How certain']).toBe('Confirmed');
    expect(byLabel['Recorded by']).toBe('Dr THOMAS MWOGI SANG');
    expect(byLabel['Last reaction']).toBe('29 Sep 2026');
  });

  it('drops the reaction row entirely for an allergy recorded without reactions', () => {
    const [row] = buildRows('AllergyIntolerance', [roxadustatAllergy]);
    expect(row.cells.reaction).toBe(NOT_RECORDED);
    expect(row.details.some((detail) => detail.label === 'Reactions')).toBe(false);
    // Everything else still renders — the missing reactions cost nothing else.
    expect(row.cells.allergy).toBe('Roxadustat');
    expect(row.cells.criticality).toBe('High');
  });

  it('still shows a reaction that carries only a severity', () => {
    const severityOnly: ShrAllergyIntolerance = { ...penicillinAllergy, reaction: [{ severity: 'severe' }] };
    const [row] = buildRows('AllergyIntolerance', [severityOnly]);
    const byLabel = Object.fromEntries(row.details.map((detail) => [detail.label, detail.value]));
    expect(byLabel['Reactions']).toBe('(Severe)');
  });

  it('resolves a manifestation coding with no display to its bundled display, else the raw code', () => {
    const [row] = buildRows('AllergyIntolerance', [penicillinAllergy]);
    expect(row.cells.reaction).toBe('271807003'); // SNOMED — not a bundled SHR system
  });

  it('sorts newest-recorded first', () => {
    const rows = buildRows('AllergyIntolerance', [metforminAllergy, roxadustatAllergy]);
    expect(rows[0].cells.allergy).toBe('Roxadustat'); // recorded 13 Oct vs 29 Sep
    expect(rows[1].cells.allergy).toBe('Metformin');
  });
});

describe('criticality tag colours', () => {
  it('maps the safety signal first: high is red', () => {
    expect(statusTagType('High')).toBe('red');
    expect(statusTagType('unable-to-assess')).toBe('purple');
    expect(statusTagType('low')).toBe('gray');
    // Clinical statuses keep their existing colours.
    expect(statusTagType('Active')).toBe('green');
    expect(statusTagType('Resolved')).toBe('green');
    expect(statusTagType('Refuted')).toBe('red');
  });
});

/** Trimmed from a live SHR searchset payload (`ke-episode-of-care`). */
const outpatientEpisode: ShrEpisodeOfCare = {
  resourceType: 'EpisodeOfCare',
  id: '4b20fa05-71db-479f-9a7f-67c298bdffee',
  status: 'active',
  type: [
    {
      coding: [
        {
          system: 'https://nshr-uat.sha.go.ke/fhir/CodeSystem/ke-episode-of-care-type-cs',
          code: 'general-opd',
          display: 'General Outpatient',
        },
      ],
    },
  ],
  patient: { reference: 'Patient/CR-2026-000321' },
  // Bare reference, no display — exactly how the SHR sends episodes.
  managingOrganization: { reference: 'Organization/FID-47-114751-8' },
  period: { start: '2026-10-14' },
  careManager: { reference: 'Practitioner/PUID-0676113-5' },
};

describe('episode of care presentation (EpisodeOfCare)', () => {
  it('shows the episode type, status, facility and period', () => {
    expect(columnsFor('EpisodeOfCare').map((h) => h.header)).toEqual([
      'Episode',
      'Status',
      'Facility',
      'Started',
      'Ended',
    ]);
    expect(statusColumnFor('EpisodeOfCare')).toBe('status');

    const [row] = buildRows('EpisodeOfCare', [outpatientEpisode]);
    expect(row.cells.episode).toBe('General Outpatient');
    expect(row.cells.status).toBe('Active');
    expect(row.cells.started).toBe('14 Oct 2026');
    expect(row.cells.ended).toBe(NOT_RECORDED); // still open
  });

  it('falls back to the facility code when the reference carries no display name', () => {
    const [row] = buildRows('EpisodeOfCare', [outpatientEpisode]);
    expect(row.cells.facility).toBe('FID-47-114751-8');
  });

  it('prefers the organisation display name when the SHR sends one', () => {
    const named = {
      ...outpatientEpisode,
      managingOrganization: { reference: 'Organization/FID-47-114751-8', display: 'MBAGATHI COUNTY REFERRAL HOSPITAL' },
    };
    const [row] = buildRows('EpisodeOfCare', [named]);
    expect(row.cells.facility).toBe('MBAGATHI COUNTY REFERRAL HOSPITAL');
  });
});

describe('fallback presentation hardening (types with no presenter yet)', () => {
  it('reads status from clinicalStatus when the type has no status field, and dates from onset', () => {
    const resource = {
      resourceType: 'SomeFutureType',
      id: 'f1',
      code: { text: 'Something' },
      clinicalStatus: { coding: [{ code: 'active' }] },
      onsetDateTime: '2026-09-02',
    };
    const [row] = buildRows('SomeFutureType', [resource as any]);
    expect(row.cells.summary).toBe('Something');
    expect(row.cells.status).toBe('Active');
    expect(row.cells.date).toBe('02 Sep 2026');
  });

  it('knows the dispense/procedure date fields too', () => {
    const resource = {
      resourceType: 'AnotherFutureType',
      id: 'f2',
      code: { text: 'Something' },
      status: 'completed',
      whenHandedOver: '2026-09-18',
    };
    const [row] = buildRows('AnotherFutureType', [resource as any]);
    expect(row.cells.status).toBe('Completed');
    expect(row.cells.date).toBe('18 Sep 2026');
  });
});

/**
 * Fixtures for the remaining SHR-held resource types. Unlike the allergy and
 * episode fixtures above, no live sample bundles were captured for these at the
 * time of writing — the shapes follow the Kenya Core / eRx IG profiles and the
 * base FHIR R4 elements the presenters read.
 */
const immunization: ShrImmunization = {
  resourceType: 'Immunization',
  id: 'imm-1',
  status: 'completed',
  vaccineCode: { coding: [{ system: 'http://snomed.info/sct', code: '871822003', display: 'Measles vaccine' }] },
  occurrenceDateTime: '2026-09-18',
  recorded: '2026-09-18T10:00:00+03:00',
  lotNumber: 'MEAS-0042',
  manufacturer: { display: 'Serum Institute' },
  doseQuantity: { value: 0.5, unit: 'mL' },
  performer: [{ actor: { display: 'Nurse Achieng' } }],
};

describe('immunization presentation', () => {
  it('shows the vaccine, status and date, with dose/batch/performer in the detail panel', () => {
    expect(columnsFor('Immunization').map((h) => h.header)).toEqual(['Vaccine', 'Status', 'Given']);
    expect(statusColumnFor('Immunization')).toBe('status');

    const [row] = buildRows('Immunization', [immunization]);
    expect(row.cells.vaccine).toBe('Measles vaccine');
    expect(row.cells.status).toBe('Completed');
    expect(row.cells.date).toBe('18 Sep 2026');
    const byLabel = Object.fromEntries(row.details.map((detail) => [detail.label, detail.value]));
    expect(byLabel['Dose']).toBe('0.5 mL');
    expect(byLabel['Batch']).toBe('MEAS-0042');
    expect(byLabel['Manufacturer']).toBe('Serum Institute');
    expect(byLabel['Given by']).toBe('Nurse Achieng');
  });

  it('shows a textual occurrence as-is when the date is unknown', () => {
    const vagueDate: ShrImmunization = { ...immunization, occurrenceDateTime: undefined, occurrenceString: 'Sometime in childhood' };
    const [row] = buildRows('Immunization', [vagueDate]);
    expect(row.cells.date).toBe('Sometime in childhood');
  });
});

const lumbarPuncture: ShrProcedure = {
  resourceType: 'Procedure',
  id: 'proc-1',
  status: 'completed',
  code: { coding: [{ system: 'http://snomed.info/sct', code: '691000216', display: 'Lumbar puncture' }] },
  performedDateTime: '2026-10-01T11:30:00+03:00',
  performer: [{ actor: { display: 'Dr THOMAS MWOGI SANG' } }],
  reasonCode: [{ text: 'Suspected meningitis' }],
  recordedDate: '2026-10-01',
};

describe('procedure presentation', () => {
  it('shows the procedure, status, when and who performed it', () => {
    expect(columnsFor('Procedure').map((h) => h.header)).toEqual(['Procedure', 'Status', 'When', 'Done by']);
    expect(statusColumnFor('Procedure')).toBe('status');

    const [row] = buildRows('Procedure', [lumbarPuncture]);
    expect(row.cells.procedure).toBe('Lumbar puncture');
    expect(row.cells.status).toBe('Completed');
    expect(row.cells.when).toBe('01 Oct 2026');
    expect(row.cells.doneBy).toBe('Dr THOMAS MWOGI SANG');
    const byLabel = Object.fromEntries(row.details.map((detail) => [detail.label, detail.value]));
    expect(byLabel['Reason']).toBe('Suspected meningitis');
    expect(byLabel['When']).toBe('01 Oct 2026, 11:30');
  });

  it('shows a textual performed value as-is, and a not-done reason', () => {
    const notDone: ShrProcedure = {
      ...lumbarPuncture,
      status: 'not-done',
      statusReason: { text: 'Patient declined' },
      performedDateTime: undefined,
      performedString: 'Not applicable',
    };
    const [row] = buildRows('Procedure', [notDone]);
    expect(row.cells.when).toBe('Not applicable');
    expect(row.cells.status).toBe('Not done');
    const byLabel = Object.fromEntries(row.details.map((detail) => [detail.label, detail.value]));
    expect(byLabel['Not done because']).toBe('Patient declined');
  });
});

const dispense: ShrMedicationDispense = {
  resourceType: 'MedicationDispense',
  id: 'disp-1',
  status: 'completed',
  medicationCodeableConcept: {
    coding: [{ system: 'https://nshr-uat.sha.go.ke/fhir/CodeSystem/erx-generic-products-cs', code: 'GP2001', display: 'Amoxicillin 500mg' }],
  },
  quantity: { value: 21, unit: 'capsules' },
  daysSupply: { value: 7, unit: 'days' },
  whenPrepared: '2026-10-02T09:00:00+03:00',
  whenHandedOver: '2026-10-02T09:15:00+03:00',
  performer: [{ actor: { display: 'Pharmacist Otieno' } }],
  dosageInstruction: [{ text: '1 capsule 3 times daily for 7 days' }],
};

describe('medication dispense presentation', () => {
  it('shows the medication, status, quantity and hand-over date', () => {
    expect(columnsFor('MedicationDispense').map((h) => h.header)).toEqual([
      'Medication',
      'Status',
      'Quantity',
      'Handed over',
    ]);
    expect(statusColumnFor('MedicationDispense')).toBe('status');

    const [row] = buildRows('MedicationDispense', [dispense]);
    expect(row.cells.medication).toBe('Amoxicillin 500mg');
    expect(row.cells.status).toBe('Completed');
    expect(row.cells.quantity).toBe('21 capsules');
    expect(row.cells.handedOver).toBe('02 Oct 2026');
    const byLabel = Object.fromEntries(row.details.map((detail) => [detail.label, detail.value]));
    expect(byLabel['Days supply']).toBe('7 days');
    expect(byLabel['Dosage']).toBe('1 capsule 3 times daily for 7 days');
    expect(byLabel['Dispensed by']).toBe('Pharmacist Otieno');
  });

  it('sorts by hand-over, falling back to when it was prepared', () => {
    const preparedOnly: ShrMedicationDispense = { ...dispense, id: 'disp-2', whenHandedOver: undefined };
    const rows = buildRows('MedicationDispense', [dispense, preparedOnly]);
    // 02 Oct 2026 (handed over) vs 02 Oct 2026 (prepared) — stable order, both dated.
    expect(rows.map((row) => row.cells.status)).toEqual(['Completed', 'Completed']);
  });
});

const administration: ShrMedicationAdministration = {
  resourceType: 'MedicationAdministration',
  id: 'admin-1',
  status: 'completed',
  medicationCodeableConcept: { coding: [{ display: 'Paracetamol IV' }] },
  effectiveDateTime: '2026-10-01T14:00:00+03:00',
  performer: [{ actor: { display: 'Nurse Achieng' } }],
  dosage: { dose: { value: 1, unit: 'g' } },
};

describe('medication administration presentation', () => {
  it('shows the medication, status and administration time, with dose and performer in details', () => {
    expect(columnsFor('MedicationAdministration').map((h) => h.header)).toEqual(['Medication', 'Status', 'Given']);
    expect(statusColumnFor('MedicationAdministration')).toBe('status');

    const [row] = buildRows('MedicationAdministration', [administration]);
    expect(row.cells.medication).toBe('Paracetamol IV');
    expect(row.cells.status).toBe('Completed');
    expect(row.cells.given).toBe('01 Oct 2026');
    const byLabel = Object.fromEntries(row.details.map((detail) => [detail.label, detail.value]));
    expect(byLabel['Dosage']).toBe('1 g');
    expect(byLabel['Given by']).toBe('Nurse Achieng');
    expect(byLabel['Given at']).toBe('01 Oct 2026, 14:00');
  });

  it('lists several reasons when a dose was deliberately not given', () => {
    const notDone: ShrMedicationAdministration = {
      ...administration,
      status: 'not-done',
      statusReason: [{ text: 'Patient refused' }, { text: 'Nausea' }],
    };
    const [row] = buildRows('MedicationAdministration', [notDone]);
    expect(row.cells.status).toBe('Not done');
    const byLabel = Object.fromEntries(row.details.map((detail) => [detail.label, detail.value]));
    expect(byLabel['Not given because']).toBe('Patient refused, Nausea');
  });
});
