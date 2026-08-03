import { openmrsFetch } from '@openmrs/esm-framework';
import { AdmissionEncounterTypeUuids } from '../admissions/constants';
import { IdentifierTypesUuids } from '../resources/identifier-types';
import {
  assessValue,
  attachObsTreeResults,
  buildEncounterNotes,
  buildInpatientDetails,
  buildVitalsFromEncounters,
  DRUG_ORDER_TYPE_UUID,
  fetchDrugOrders,
  fetchFhirGroup,
  fetchObsTrees,
  fetchTestOrders,
  flattenObsTree,
  formatReferenceRange,
  getVisitCaseSummary,
  isDrugOrderActive,
  isTestOrderType,
  mapConditionEntry,
  mapDemographics,
  mapDrugOrder,
  mapTestOrders,
  mapVisitPayload,
  mergeVisitPayloads,
  normalizeObsTreeResponse,
  orderBelongsToVisit,
  INPATIENT_CARE_SETTING_UUID,
  OUTPATIENT_CARE_SETTING_UUID,
  readObsValue,
  resolveIcd11Codes,
  TEST_ORDER_TYPE_UUID,
  testOrderConceptUuids,
} from './case-summary.resource';

const mockOpenmrsFetch = jest.mocked(openmrsFetch);

beforeEach(() => {
  mockOpenmrsFetch.mockReset();
});

function mockResponse(data: unknown, ok = true) {
  return { ok, status: ok ? 200 : 500, json: async () => data, text: async () => 'error' } as any;
}

describe('mapDemographics', () => {
  it('maps the nested patient payload and picks identifiers by type uuid', () => {
    const demographics = mapDemographics({
      person: { display: 'JANE DOE', gender: 'F', birthdate: '1990-05-01', age: '35' },
      identifiers: [
        { identifier: 'OP-100', preferred: true, identifierType: { display: 'OpenMRS ID' } },
        { identifier: '12345678', identifierType: { uuid: IdentifierTypesUuids.NATIONAL_ID_UUID, display: 'National ID' } },
        { identifier: 'CR-999', identifierType: { uuid: IdentifierTypesUuids.CLIENT_REGISTRY_NO_UUID, display: 'Client Registry Number' } },
      ],
    });

    expect(demographics).toEqual({
      name: 'JANE DOE',
      birthDate: '1990-05-01',
      gender: 'F',
      age: '35',
      patientId: 'OP-100',
      nationalId: '12345678',
      crNumber: 'CR-999',
    });
  });

  it('falls back to matching by display name when the identifier type uuid is absent', () => {
    const demographics = mapDemographics({
      person: { display: 'JANE DOE' },
      identifiers: [{ identifier: 'CR-999', identifierType: { display: 'Client Registry Number' } }],
    });

    expect(demographics.crNumber).toBe('CR-999');
  });
});

describe('mapConditionEntry', () => {
  it('maps a coded FHIR Condition entry, using verificationStatus and the diagnosis-rank extension', () => {
    // Shaped after a real payload from this app's server: clinicalStatus is always
    // "unknown" for encounter-diagnosis Conditions, so it's deliberately not read.
    const entry = {
      resource: {
        resourceType: 'Condition',
        id: 'c1',
        extension: [{ url: 'http://fhir.openmrs.org/R4/StructureDefinition/diagnosis-rank', valueInteger: 1 }],
        clinicalStatus: { coding: [{ code: 'unknown', display: 'Unknown' }] },
        verificationStatus: { coding: [{ code: 'confirmed', display: 'Confirmed' }] },
        code: { coding: [{ code: 'concept-1', display: 'Secondary hypertension' }], text: 'Secondary hypertension' },
        recordedDate: '2026-07-21T11:10:48+03:00',
      },
    };

    // The system-less coding is the concept uuid, kept for ICD-11 resolution but NOT
    // surfaced as `code` — a uuid must never appear in the ICD-11 column.
    expect(mapConditionEntry(entry)).toEqual({
      code: undefined,
      conceptUuid: 'concept-1',
      description: 'Secondary hypertension',
      certainty: 'confirmed',
      primary: true,
      onsetDate: '2026-07-21T11:10:48+03:00',
    });
  });

  it('prefers a genuine ICD-11 coding when the server emits one', () => {
    const entry = {
      resource: {
        resourceType: 'Condition',
        id: 'c1b',
        code: {
          coding: [
            { code: 'concept-1', display: 'Secondary hypertension' },
            { system: 'http://id.who.int/icd/release/11/mms', code: 'BA04', display: 'Secondary hypertension' },
          ],
          text: 'Secondary hypertension',
        },
      },
    };

    expect(mapConditionEntry(entry)).toMatchObject({ code: 'BA04', conceptUuid: 'concept-1' });
  });

  it('falls back to code.text and treats a non-1 (or absent) rank as non-primary', () => {
    const entry = {
      resource: { resourceType: 'Condition', id: 'c2', code: { text: 'Suspected dengue' }, recordedDate: '2026-01-02' },
    };

    expect(mapConditionEntry(entry)).toEqual({
      code: undefined,
      conceptUuid: undefined,
      description: 'Suspected dengue',
      certainty: undefined,
      primary: false,
      onsetDate: '2026-01-02',
    });
  });

  it('returns undefined when there is no description', () => {
    expect(mapConditionEntry({ resource: { resourceType: 'Condition', id: 'c3' } })).toBeUndefined();
  });
});

describe('resolveIcd11Codes', () => {
  // `icd11CodeCache` is module-level and survives `mockReset`, so every test here uses
  // a distinct concept uuid to stay independent of the others and of test ordering.
  function conceptResponse(code: string, sourceName = 'ICD-11-WHO') {
    return mockResponse({
      uuid: 'concept',
      display: 'Secondary hypertension',
      conceptMappings: [
        { conceptReferenceTerm: { code: 'irrelevant', name: 'Hypertension', conceptSource: { name: 'CIEL' } } },
        { conceptReferenceTerm: { code, name: 'Secondary hypertension', conceptSource: { name: sourceName } } },
      ],
    });
  }

  const diagnosis = (conceptUuid: string, code?: string) => ({
    code,
    conceptUuid,
    description: 'Secondary hypertension',
    primary: true,
  });

  it('resolves the ICD-11 code from the concept mappings, ignoring other sources', async () => {
    mockOpenmrsFetch.mockResolvedValue(conceptResponse('BA04'));

    const resolved = await resolveIcd11Codes([diagnosis('cu-resolve')]);

    expect(mockOpenmrsFetch).toHaveBeenCalledWith(expect.stringContaining('/concept/cu-resolve?v=custom:'));
    // Must request `conceptMappings`, not `mappings` — custom reps resolve by bean reflection.
    expect(mockOpenmrsFetch).toHaveBeenCalledWith(expect.stringContaining('conceptMappings'));
    expect(resolved[0].code).toBe('BA04');
  });

  it('dedupes concepts within a call and caches across calls', async () => {
    mockOpenmrsFetch.mockResolvedValue(conceptResponse('BA05'));

    const resolved = await resolveIcd11Codes([diagnosis('cu-dedupe'), diagnosis('cu-dedupe')]);

    expect(resolved.map((d) => d.code)).toEqual(['BA05', 'BA05']);
    expect(mockOpenmrsFetch).toHaveBeenCalledTimes(1);

    mockOpenmrsFetch.mockClear();
    const again = await resolveIcd11Codes([diagnosis('cu-dedupe')]);

    expect(again[0].code).toBe('BA05');
    expect(mockOpenmrsFetch).not.toHaveBeenCalled();
  });

  it('leaves the code unset when the concept has no ICD-11 mapping', async () => {
    mockOpenmrsFetch.mockResolvedValue(conceptResponse('A00', 'SNOMED CT'));

    const resolved = await resolveIcd11Codes([diagnosis('cu-unmapped')]);

    expect(resolved[0].code).toBeUndefined();
  });

  it('leaves the code unset when the lookup fails, without throwing', async () => {
    mockOpenmrsFetch.mockRejectedValue(new Error('boom'));

    const resolved = await resolveIcd11Codes([diagnosis('cu-failed')]);

    expect(resolved[0].code).toBeUndefined();
  });

  it('does not look up a diagnosis that already carries an ICD-11 code', async () => {
    const resolved = await resolveIcd11Codes([diagnosis('cu-already', 'BA04')]);

    expect(resolved[0].code).toBe('BA04');
    expect(mockOpenmrsFetch).not.toHaveBeenCalled();
  });
});

describe('mapDrugOrder', () => {
  it('maps the dosing fields a top-level /order fetch exposes', () => {
    expect(
      mapDrugOrder({
        uuid: 'o1',
        dateActivated: '2026-01-01T08:00:00.000+0000',
        drug: { display: 'Amoxicillin 500mg', strength: '500mg', dosageForm: { display: 'Capsule' } },
        dose: 500,
        doseUnits: { display: 'mg' },
        route: { display: 'Oral' },
        frequency: { display: 'Twice daily' },
        duration: 5,
        durationUnits: { display: 'Days' },
        dosingInstructions: 'After food',
        encounter: { uuid: 'enc-1', visit: { uuid: 'visit-1' } },
      }),
    ).toEqual({
      date: '2026-01-01T08:00:00.000+0000',
      drug: 'Amoxicillin 500mg',
      dose: '500 mg',
      route: 'Oral',
      frequency: 'Twice daily',
      duration: '5 Days',
      instructions: 'After food',
      visitUuid: 'visit-1',
      active: true,
    });
  });

  it('appends the strength only when the drug name does not already include it', () => {
    expect(mapDrugOrder({ uuid: 'o2', drug: { display: 'Amoxicillin', strength: '500mg' } }).drug).toBe('Amoxicillin 500mg');
    expect(mapDrugOrder({ uuid: 'o3', drug: { display: 'Amoxicillin 500mg', strength: '500mg' } }).drug).toBe('Amoxicillin 500mg');
  });

  it('falls back to the concept display when the order has no drug', () => {
    expect(mapDrugOrder({ uuid: 'o4', concept: { display: 'Unspecified antibiotic' } }).drug).toBe('Unspecified antibiotic');
  });

  it('omits dose and duration when the value is absent, rather than printing a bare unit', () => {
    const medication = mapDrugOrder({ uuid: 'o5', drug: { display: 'Ibuprofen' }, doseUnits: { display: 'mg' }, durationUnits: { display: 'Days' } });

    expect(medication.dose).toBeUndefined();
    expect(medication.duration).toBeUndefined();
  });
});

describe('isDrugOrderActive', () => {
  const now = Date.parse('2026-02-01T00:00:00.000Z');

  it('treats an open-ended order as active', () => {
    expect(isDrugOrderActive({ uuid: 'o1' }, now)).toBe(true);
  });

  it('treats stopped and discontinued orders as inactive', () => {
    expect(isDrugOrderActive({ uuid: 'o2', dateStopped: '2026-01-15T00:00:00.000Z' }, now)).toBe(false);
    expect(isDrugOrderActive({ uuid: 'o3', action: 'DISCONTINUE' }, now)).toBe(false);
  });

  it('treats an order past its autoExpireDate as inactive, but not one still in window', () => {
    expect(isDrugOrderActive({ uuid: 'o4', autoExpireDate: '2026-01-20T00:00:00.000Z' }, now)).toBe(false);
    expect(isDrugOrderActive({ uuid: 'o5', autoExpireDate: '2026-03-20T00:00:00.000Z' }, now)).toBe(true);
  });
});

describe('fetchDrugOrders', () => {
  it('queries both care settings, filtered to drug orders, and maps the results', async () => {
    mockOpenmrsFetch.mockImplementation((url: string) =>
      Promise.resolve(
        mockResponse({
          results: url.includes(OUTPATIENT_CARE_SETTING_UUID)
            ? [
                { uuid: 'o1', drug: { display: 'Amoxicillin 500mg' }, dose: 500, doseUnits: { display: 'mg' }, route: { display: 'Oral' } },
                // No drug and no concept — nothing to show, so it's dropped.
                { uuid: 'o2' },
              ]
            : [{ uuid: 'o3', drug: { display: 'IV Ceftriaxone 1g' } }],
        }),
      ),
    );

    const medications = await fetchDrugOrders('patient-1');

    const urls = mockOpenmrsFetch.mock.calls.map(([url]) => url as string);
    expect(urls).toHaveLength(2);
    expect(urls.some((url) => url.includes(`careSetting=${OUTPATIENT_CARE_SETTING_UUID}`))).toBe(true);
    // An inpatient stay's medications used to be silently omitted.
    expect(urls.some((url) => url.includes(`careSetting=${INPATIENT_CARE_SETTING_UUID}`))).toBe(true);
    expect(urls.every((url) => url.includes('/order?') && url.includes(`orderTypes=${DRUG_ORDER_TYPE_UUID}`))).toBe(true);
    expect(urls.every((url) => url.includes('excludeDiscontinueOrders=true'))).toBe(true);
    // Must be a top-level /order rep so the DrugOrder dosing fields resolve.
    expect(urls.every((url) => url.includes('doseUnits'))).toBe(true);

    expect(medications.map((m) => m.drug)).toEqual(['Amoxicillin 500mg', 'IV Ceftriaxone 1g']);
  });

  it('keeps the care settings that succeed when one of them fails', async () => {
    // A partial list beats an empty section.
    mockOpenmrsFetch.mockImplementation((url: string) =>
      Promise.resolve(
        url.includes(OUTPATIENT_CARE_SETTING_UUID)
          ? mockResponse(null, false)
          : mockResponse({ results: [{ uuid: 'o3', drug: { display: 'IV Ceftriaxone 1g' } }] }),
      ),
    );

    expect((await fetchDrugOrders('patient-1')).map((m) => m.drug)).toEqual(['IV Ceftriaxone 1g']);
  });

  it('returns an empty array when every request fails', async () => {
    mockOpenmrsFetch.mockResolvedValue(mockResponse(null, false));

    expect(await fetchDrugOrders('patient-1')).toEqual([]);
  });
});

describe('mapVisitPayload', () => {
  it('maps visit, demographics, and encounters from one payload, skipping voided encounters', () => {
    const result = mapVisitPayload({
      uuid: 'visit-1',
      display: 'OPD Visit',
      startDatetime: '2026-01-01T08:00:00.000+0000',
      patient: { person: { display: 'JANE DOE' }, identifiers: [] },
      encounters: [
        {
          uuid: 'enc-1',
          display: 'OPD Triage',
          voided: false,
          encounterDatetime: '2026-01-01T08:10:00.000+0000',
          encounterType: { uuid: 'et-1' },
          obs: [{ uuid: 'o1', display: 'TEMPERATURE (C): 37.0' }],
        },
        { uuid: 'enc-2', voided: true, encounterType: { uuid: 'et-1' } },
      ],
    });

    expect(result.visit).toMatchObject({ uuid: 'visit-1', display: 'OPD Visit' });
    expect(result.demographics.name).toBe('JANE DOE');
    expect(result.encounterUuids).toEqual(['enc-1']);
    expect(result.encounters).toHaveLength(1);
    expect(result.encounters[0].obs).toEqual([{ label: 'TEMPERATURE (C)', value: '37.0' }]);
  });
});

describe('fetchFhirGroup', () => {
  it('requests the patient-level bundle and returns every entry unfiltered', async () => {
    // Entries are NOT encounter-scoped: Allergies and Condition are standing
    // patient records, and scoping them to the visit would hide what the patient
    // already had on arrival.
    mockOpenmrsFetch.mockResolvedValueOnce(
      mockResponse({
        entry: [
          { resource: { resourceType: 'Condition', id: 'c1', encounter: { reference: 'Encounter/enc-from-an-older-visit' } } },
          { resource: { resourceType: 'Condition', id: 'c2' } },
        ],
      }),
    );

    const entries = await fetchFhirGroup('Condition', 'patient-1');

    const [url] = mockOpenmrsFetch.mock.calls[0] as [string];
    expect(url).toContain('/Condition?');
    expect(url).toContain('patient=patient-1');
    expect(url).toContain('_summary=data');
    expect(entries.map((e) => e.resource.id)).toEqual(['c1', 'c2']);
  });

  it('returns an empty array for a bundle with no entries', async () => {
    mockOpenmrsFetch.mockResolvedValueOnce(mockResponse({ total: 0 }));

    expect(await fetchFhirGroup('AllergyIntolerance', 'patient-1')).toEqual([]);
  });

  it('returns an empty array when the request fails', async () => {
    mockOpenmrsFetch.mockResolvedValueOnce(mockResponse(null, false));

    expect(await fetchFhirGroup('AllergyIntolerance', 'patient-1')).toEqual([]);
  });
});

describe('buildInpatientDetails', () => {
  it('returns undefined when there is no ADT encounter', () => {
    expect(buildInpatientDetails([{ uuid: 'enc-1', encounterTypeUuid: 'some-other-type', obs: [] }])).toBeUndefined();
  });

  it('derives admission, ward, doctor, and discharge from ADT encounters', () => {
    const details = buildInpatientDetails([
      {
        uuid: 'enc-admit',
        encounterDatetime: '2026-01-01T08:00:00.000+0000',
        encounterTypeUuid: AdmissionEncounterTypeUuids.ADMIT_ENCOUNTER_TYPE_UUID,
        location: 'Male Ward',
        provider: 'Dr. Smith',
        obs: [],
      },
      {
        uuid: 'enc-discharge',
        encounterDatetime: '2026-01-03T08:00:00.000+0000',
        encounterTypeUuid: AdmissionEncounterTypeUuids.DISCHARGE_ENCOUNTER_TYPE_UUID,
        location: 'Male Ward',
        provider: 'Dr. Smith',
        obs: [],
      },
    ]);

    expect(details).toEqual({
      admissionDate: '2026-01-01T08:00:00.000+0000',
      ward: 'Male Ward',
      doctor: 'Dr. Smith',
      status: 'Discharged',
      dischargeDate: '2026-01-03T08:00:00.000+0000',
    });
  });
});

describe('buildVitalsFromEncounters', () => {
  it('picks the most recent value per vital and combines systolic/diastolic into blood pressure', () => {
    const rows = buildVitalsFromEncounters([
      {
        uuid: 'enc-1',
        encounterDatetime: '2026-01-01T08:00:00.000+0000',
        obs: [
          { label: 'TEMPERATURE (C)', value: '36.5' },
          { label: 'SYSTOLIC', value: '120' },
          { label: 'DIASTOLIC', value: '80' },
        ],
      },
      {
        uuid: 'enc-2',
        encounterDatetime: '2026-01-02T08:00:00.000+0000',
        obs: [
          { label: 'TEMPERATURE (C)', value: '37.2' },
          { label: 'TRIAGE EARLY WARNING SCORE', value: '1' },
        ],
      },
    ]);

    expect(rows).toContainEqual({ label: 'Temperature', value: '37.2' });
    expect(rows).toContainEqual({ label: 'Blood Pressure', value: '120/80 mmHg' });
    expect(rows).toContainEqual({ label: 'TEW Score', value: '1' });
  });

  it('leaves value undefined for vitals not recorded this visit', () => {
    const rows = buildVitalsFromEncounters([{ uuid: 'enc-1', obs: [] }]);

    expect(rows.every((row) => row.value === undefined)).toBe(true);
  });
});

describe('buildEncounterNotes', () => {
  it('groups non-vital obs per encounter and drops encounters with none', () => {
    const notes = buildEncounterNotes([
      {
        uuid: 'enc-1',
        display: 'OPD Triage 01/01/2026',
        // The type is carried through separately: `display` embeds the date, so using it
        // as the note heading would print the date twice next to the timestamp.
        encounterType: 'POC OPD Triage',
        encounterDatetime: '2026-01-01T08:00:00.000+0000',
        obs: [
          { label: 'TEMPERATURE (C)', value: '37.0' },
          { label: 'CHIEF COMPLAINT, DETAILED', value: 'headache' },
        ],
      },
      { uuid: 'enc-2', display: 'Vitals only', encounterDatetime: '2026-01-01T09:00:00.000+0000', obs: [{ label: 'PULSE', value: '80' }] },
    ]);

    expect(notes).toHaveLength(1);
    expect(notes[0]).toMatchObject({ encounterUuid: 'enc-1', display: 'OPD Triage 01/01/2026', encounterType: 'POC OPD Triage' });
    expect(notes[0].obs).toEqual([{ label: 'CHIEF COMPLAINT, DETAILED', value: 'headache' }]);
  });
});

describe('isTestOrderType', () => {
  // The real `/ordertype` list from this app's server, verbatim. Six of the eight are
  // modelled as a bare `org.openmrs.Order`, which is exactly why `javaClassName` is the
  // primary discriminator — display matching alone cannot separate them.
  const serverOrderTypes = [
    { uuid: '53eb466e-1359-11df-a1f1-0026b9348838', display: 'Drug', javaClassName: 'org.openmrs.DrugOrder', isTest: false },
    { uuid: '53eb4768-1359-11df-a1f1-0026b9348838', display: 'Test', javaClassName: 'org.openmrs.TestOrder', isTest: true },
    { uuid: 'ff4485a4-f071-4423-aeb2-db6efce52b83', display: 'Radiology Order', javaClassName: 'org.openmrs.Order', isTest: false },
    { uuid: '58ea528c-8f62-45f0-86a2-f7d1327b8c56', display: 'Medical Supplies Order', javaClassName: 'org.openmrs.Order', isTest: false },
    { uuid: '2315ab24-9a4e-4b36-b189-8e74d2c77394', display: 'Procedure Order', javaClassName: 'org.openmrs.Order', isTest: false },
    { uuid: '2da15461-81db-43bc-a2c0-853741bece90', display: 'Consultation Cash Order', javaClassName: 'org.openmrs.Order', isTest: false },
    { uuid: 'a6a1b98c-ceaf-4481-ae61-67251e43a128', display: 'Consultation SHA order', javaClassName: 'org.openmrs.Order', isTest: false },
    { uuid: '7d1442cc-4fa2-4407-9100-40f0c1c247c8', display: 'SHA Intervention Switch', javaClassName: 'org.openmrs.Order', isTest: false },
  ];

  it.each(serverOrderTypes)('classifies the real "$display" order type as isTest=$isTest', ({ isTest, ...orderType }) => {
    expect(isTestOrderType(orderType)).toBe(isTest);
  });

  it('exports the real Test Order uuid, not a guess', () => {
    expect(TEST_ORDER_TYPE_UUID).toBe('53eb4768-1359-11df-a1f1-0026b9348838');
  });

  it('accepts by javaClassName even when uuid and display are unfamiliar', () => {
    expect(isTestOrderType({ uuid: 'other', display: 'Investigation', javaClassName: 'org.openmrs.TestOrder' })).toBe(true);
  });

  it('falls back to uuid, then display, when javaClassName is absent', () => {
    expect(isTestOrderType({ uuid: TEST_ORDER_TYPE_UUID })).toBe(true);
    expect(isTestOrderType({ uuid: 'some-other-uuid', display: 'Lab Order' })).toBe(true);
    expect(isTestOrderType({ display: 'Laboratory Order' })).toBe(true);
  });

  it('does not let a known non-test java class fall through to display matching', () => {
    // "Latest tests" would otherwise sneak past on the substring check.
    expect(isTestOrderType({ display: 'Some test-like label', javaClassName: 'org.openmrs.Order' })).toBe(false);
  });

  it('never accepts a drug order, by java class, uuid, or display', () => {
    expect(isTestOrderType({ javaClassName: 'org.openmrs.DrugOrder' })).toBe(false);
    expect(isTestOrderType({ uuid: DRUG_ORDER_TYPE_UUID })).toBe(false);
    expect(isTestOrderType({ display: 'Medication Order' })).toBe(false);
  });

  it('rejects unrelated order types and missing input', () => {
    expect(isTestOrderType({ display: 'Referral Order' })).toBe(false);
    expect(isTestOrderType(undefined)).toBe(false);
  });
});

describe('orderBelongsToVisit', () => {
  const scope = { visitUuid: 'visit-1', encounterUuids: ['enc-1', 'enc-2'] };

  it('accepts on either signal independently', () => {
    // Encounter uuid in the visit's list, but no nested visit uuid resolved.
    expect(orderBelongsToVisit({ uuid: 'o1', encounter: { uuid: 'enc-2' } }, scope)).toBe(true);
    // Nested visit uuid matches, but the encounter isn't one we listed.
    expect(orderBelongsToVisit({ uuid: 'o2', encounter: { uuid: 'enc-other', visit: { uuid: 'visit-1' } } }, scope)).toBe(true);
  });

  it('rejects an order that locates itself elsewhere', () => {
    expect(orderBelongsToVisit({ uuid: 'o3', encounter: { uuid: 'enc-x', visit: { uuid: 'visit-other' } } }, scope)).toBe(false);
  });

  it('keeps an order carrying no locating information at all', () => {
    expect(orderBelongsToVisit({ uuid: 'o4' }, scope)).toBe(true);
  });

  it('accepts everything when no scope is given', () => {
    expect(orderBelongsToVisit({ uuid: 'o5', encounter: { uuid: 'enc-x', visit: { uuid: 'visit-other' } } })).toBe(true);
    expect(orderBelongsToVisit({ uuid: 'o6' }, {})).toBe(true);
  });
});

describe('mapTestOrders', () => {
  const testType = { uuid: TEST_ORDER_TYPE_UUID, display: 'Test Order' };

  it('maps test orders and de-dupes by order uuid', () => {
    const orders = mapTestOrders([
      { uuid: 'o1', orderNumber: 'ORD-1', dateActivated: '2026-01-01T08:00:00.000+0000', concept: { uuid: 'c1', display: 'RANDOM BLOOD SUGAR' }, orderType: testType },
      { uuid: 'o1', concept: { uuid: 'c1', display: 'RANDOM BLOOD SUGAR' }, orderType: testType },
    ]);

    expect(orders).toHaveLength(1);
    expect(orders[0]).toMatchObject({ uuid: 'o1', conceptUuid: 'c1', test: 'RANDOM BLOOD SUGAR', pending: true, results: [] });
  });

  it('skips voided, discontinued, non-test, and concept-less orders', () => {
    const orders = mapTestOrders([
      { uuid: 'o1', voided: true, concept: { uuid: 'c1' }, orderType: testType },
      { uuid: 'o2', action: 'DISCONTINUE', concept: { uuid: 'c2' }, orderType: testType },
      { uuid: 'o3', concept: { uuid: 'c3' }, orderType: { uuid: DRUG_ORDER_TYPE_UUID } },
      { uuid: 'o4', orderType: testType },
      { uuid: 'o5', concept: { uuid: 'c5', display: 'Kept' }, orderType: testType },
    ]);

    expect(orders.map((o) => o.uuid)).toEqual(['o5']);
  });

  it('filters to the given visit but keeps orders whose visit is unknown', () => {
    const orders = mapTestOrders(
      [
        { uuid: 'o1', concept: { uuid: 'c1' }, orderType: testType, encounter: { visit: { uuid: 'visit-1' } } },
        { uuid: 'o2', concept: { uuid: 'c2' }, orderType: testType, encounter: { visit: { uuid: 'visit-other' } } },
        { uuid: 'o3', concept: { uuid: 'c3' }, orderType: testType },
      ],
      { visitUuid: 'visit-1' },
    );

    expect(orders.map((o) => o.uuid)).toEqual(['o1', 'o3']);
  });
});

describe('testOrderConceptUuids', () => {
  it('de-duplicates concept uuids across orders', () => {
    expect(
      testOrderConceptUuids([
        { uuid: 'o1', conceptUuid: 'c1', test: 'A', results: [], pending: true },
        { uuid: 'o2', conceptUuid: 'c1', test: 'A again', results: [], pending: true },
        { uuid: 'o3', conceptUuid: 'c2', test: 'B', results: [], pending: true },
      ]),
    ).toEqual(['c1', 'c2']);
  });
});

describe('readObsValue', () => {
  it('coerces numbers, strings, and coded values', () => {
    expect(readObsValue(5.4)).toBe('5.4');
    expect(readObsValue(0)).toBe('0');
    expect(readObsValue('  Positive ')).toBe('Positive');
    expect(readObsValue({ display: 'Reactive' })).toBe('Reactive');
  });

  it('returns undefined for null and blank values so the node is skipped', () => {
    expect(readObsValue(null)).toBeUndefined();
    expect(readObsValue(undefined)).toBeUndefined();
    expect(readObsValue('   ')).toBeUndefined();
    expect(readObsValue({})).toBeUndefined();
  });
});

describe('assessValue', () => {
  const range = { lowNormal: 4, hiNormal: 7, lowAbsolute: 1, hiAbsolute: 20 };

  it('classifies within and outside the normal range', () => {
    expect(assessValue('5', range)).toBe('NORMAL');
    expect(assessValue('8', range)).toBe('HIGH');
    expect(assessValue('3', range)).toBe('LOW');
  });

  it('classifies breaches of the absolute bounds as off-scale', () => {
    expect(assessValue('25', range)).toBe('OFF_SCALE_HIGH');
    expect(assessValue('0.5', range)).toBe('OFF_SCALE_LOW');
  });

  it('uses critical bounds when the server populates them', () => {
    expect(assessValue('15', { lowNormal: 4, hiNormal: 7, hiCritical: 12 })).toBe('CRITICALLY_HIGH');
    expect(assessValue('2', { lowNormal: 4, hiNormal: 7, lowCritical: 3 })).toBe('CRITICALLY_LOW');
  });

  it('honours a zero bound instead of treating it as absent', () => {
    // `0` is falsy — presence must be tested with != null, not truthiness.
    expect(assessValue('-1', { lowNormal: 0, hiNormal: 7 })).toBe('LOW');
    expect(assessValue('3', { lowNormal: 0, hiNormal: 7 })).toBe('NORMAL');
  });

  it('returns "--" rather than NORMAL when nothing can be assessed', () => {
    // Claiming "normal" for an unbounded or non-numeric analyte would be unsafe.
    expect(assessValue('Positive', range)).toBe('--');
    expect(assessValue('5', {})).toBe('--');
  });

  it('treats an inverted range as normal so a mis-configured concept flags nothing', () => {
    expect(assessValue('5', { lowNormal: 10, hiNormal: 2 })).toBe('NORMAL');
  });
});

describe('formatReferenceRange', () => {
  it('formats both, one-sided, and absent ranges', () => {
    expect(formatReferenceRange({ lowNormal: 13, hiNormal: 17 })).toBe('13 – 17');
    expect(formatReferenceRange({ lowNormal: 13 })).toBe('≥ 13');
    expect(formatReferenceRange({ hiNormal: 17 })).toBe('≤ 17');
    expect(formatReferenceRange({})).toBeUndefined();
    expect(formatReferenceRange({ lowNormal: 0, hiNormal: 5 })).toBe('0 – 5');
  });
});

describe('flattenObsTree', () => {
  const visitWindow = { startDatetime: '2026-08-03T09:01:34.000+0300', stopDatetime: '2026-08-03T20:00:00.000+0300' };

  it('flattens a single test with one observation', () => {
    const rows = flattenObsTree({
      conceptUuid: 'c1',
      display: 'RANDOM BLOOD SUGAR',
      units: 'mmol/L',
      lowNormal: 4,
      hiNormal: 7,
      obs: [{ obsDatetime: '2026-01-02T09:00:00.000Z', value: 5.4 }],
    });

    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      test: 'RANDOM BLOOD SUGAR',
      value: '5.4',
      units: 'mmol/L',
      range: '4 – 7',
      interpretation: 'NORMAL',
      abnormal: false,
      panel: undefined,
    });
  });

  it('expands a panel into one row per member, carrying the panel name', () => {
    const rows = flattenObsTree({
      display: 'FULL HAEMOGRAM',
      subSets: [
        { conceptUuid: 'hb', display: 'Haemoglobin', obs: [{ obsDatetime: '2026-01-02T09:00:00.000Z', value: 9 }], lowNormal: 13, hiNormal: 17 },
        { conceptUuid: 'wbc', display: 'White cell count', obs: [{ obsDatetime: '2026-01-02T09:00:00.000Z', value: 6 }], lowNormal: 4, hiNormal: 11 },
      ],
    });

    expect(rows.map((r) => r.test)).toEqual(['Haemoglobin', 'White cell count']);
    // The panel here IS the root node, and the root's name is not used as a row label —
    // the ordered test's name is already the section heading above the table, so
    // repeating it on every row is pure noise. `panel` is reserved for a *nested*
    // sub-panel (e.g. SERUM ELECTROLYTES inside RENAL FUNCTION BLOOD TEST).
    expect(rows.every((r) => r.panel === undefined)).toBe(true);
    expect(rows[0]).toMatchObject({ interpretation: 'LOW', abnormal: true });
  });

  it('walks nesting deeper than one level', () => {
    const rows = flattenObsTree({
      display: 'Outer',
      subSets: [{ display: 'Inner', subSets: [{ conceptUuid: 'deep', display: 'Deep analyte', obs: [{ obsDatetime: '2026-01-02T09:00:00.000Z', value: 1 }] }] }],
    });

    expect(rows.map((r) => r.test)).toEqual(['Deep analyte']);
    expect(rows[0].panel).toBe('Inner');
  });

  it('emits nothing for a node whose obs array is empty (ordered, not yet resulted)', () => {
    expect(flattenObsTree({ conceptUuid: 'c1', display: 'Pending test', obs: [] })).toEqual([]);
  });

  it('picks the latest observation regardless of array order', () => {
    const rows = flattenObsTree({
      conceptUuid: 'c1',
      display: 'Glucose',
      obs: [
        { obsDatetime: '2026-01-02T09:00:00.000Z', value: 5 },
        { obsDatetime: '2026-01-05T09:00:00.000Z', value: 9 },
        { obsDatetime: '2026-01-03T09:00:00.000Z', value: 7 },
      ],
    });

    expect(rows[0].value).toBe('9');
    expect(rows[0].datetime).toBe('2026-01-05T09:00:00.000Z');
  });

  it('drops observations from a different day than the visit', () => {
    // The core guard: without it, a months-old value reads as this visit's result.
    const rows = flattenObsTree(
      {
        conceptUuid: 'c1',
        display: 'Glucose',
        obs: [{ obsDatetime: '2026-06-02T12:33:46.000+0300', value: 5 }],
      },
      { window: visitWindow },
    );

    expect(rows).toEqual([]);
  });

  it('drops an observation from AFTER the visit day too, not just before', () => {
    // Same-day means same day in both directions — an unbounded window would let a
    // later result be attributed to this visit.
    const rows = flattenObsTree(
      { conceptUuid: 'c1', display: 'Glucose', obs: [{ obsDatetime: '2026-08-04T09:00:00.000+0300', value: 5 }] },
      { window: visitWindow },
    );

    expect(rows).toEqual([]);
  });

  it('keeps the visit-day observation and ignores another day for the same concept', () => {
    const rows = flattenObsTree(
      {
        conceptUuid: 'c1',
        display: 'Glucose',
        obs: [
          { obsDatetime: '2026-06-02T12:33:46.000+0300', value: 5 },
          { obsDatetime: '2026-08-03T11:15:05.000+0300', value: 8 },
        ],
      },
      { window: visitWindow },
    );

    expect(rows).toHaveLength(1);
    expect(rows[0].value).toBe('8');
  });

  it('picks the latest of several observations on the visit day', () => {
    const rows = flattenObsTree(
      {
        conceptUuid: 'c1',
        display: 'Glucose',
        obs: [
          { obsDatetime: '2026-08-03T11:15:05.000+0300', value: 8 },
          { obsDatetime: '2026-08-03T15:12:33.000+0300', value: 12 },
        ],
      },
      { window: visitWindow },
    );

    expect(rows).toHaveLength(1);
    expect(rows[0].value).toBe('12');
  });

  it('compares calendar dates as written, not via the browser timezone', () => {
    // A late-evening +0300 result must stay on its own day even though the same
    // instant is the *next* day in UTC. Date-based comparison would drop it.
    const rows = flattenObsTree(
      { conceptUuid: 'c1', display: 'Glucose', obs: [{ obsDatetime: '2026-08-03T23:30:00.000+0300', value: 7 }] },
      { window: { startDatetime: '2026-08-03T09:01:34.000+0300', stopDatetime: '2026-08-03T20:00:00.000+0300' } },
    );

    expect(rows).toHaveLength(1);
  });

  it('keeps a result posted after the start day while the visit is still open', () => {
    // Regression: the visit opened 31/07 and has no stopDatetime, the lab posted on
    // 03/08. Filtering on the start day ALONE showed this order as "Pending" despite a
    // real value. An open visit must have no upper bound.
    const rows = flattenObsTree(
      {
        conceptUuid: 'a898418e',
        display: 'RANDOM BLOOD SUGAR',
        units: 'mmol/L',
        lowNormal: 2.0,
        hiNormal: 5.5,
        obs: [{ obsDatetime: '2026-08-03T15:12:33.000+0300', value: '5.0' }],
      },
      { window: { startDatetime: '2026-07-31T09:01:34.000+0300' } },
    );

    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ value: '5.0', interpretation: 'NORMAL', abnormal: false });
  });

  it('covers every day of a multi-day inpatient stay, and excludes days outside it', () => {
    const node = (day: string) => ({
      conceptUuid: 'c1',
      display: 'SERUM CREATININE',
      obs: [{ obsDatetime: `${day}T08:00:00.000+0300`, value: '90' }],
    });
    const admission = { startDatetime: '2026-08-01T09:00:00.000+0300', stopDatetime: '2026-08-05T17:00:00.000+0300' };

    // Day 1, a middle day, and the discharge day all belong to the stay.
    expect(flattenObsTree(node('2026-08-01'), { window: admission })).toHaveLength(1);
    expect(flattenObsTree(node('2026-08-03'), { window: admission })).toHaveLength(1);
    expect(flattenObsTree(node('2026-08-05'), { window: admission })).toHaveLength(1);
    // The day before admission and the day after discharge do not.
    expect(flattenObsTree(node('2026-07-31'), { window: admission })).toEqual([]);
    expect(flattenObsTree(node('2026-08-06'), { window: admission })).toEqual([]);
  });

  it('drops an undated observation when a day is given, but keeps it when there is none', () => {
    const node = { conceptUuid: 'c1', display: 'Glucose', obs: [{ value: 5 }] };

    expect(flattenObsTree(node, { window: visitWindow })).toEqual([]);
    expect(flattenObsTree(node)).toHaveLength(1);
  });

  it('prefers the bounds carried on the obs over the node-level ones', () => {
    // Each obs repeats the range in force when the result was taken.
    const rows = flattenObsTree({
      conceptUuid: 'c1',
      display: 'HEMATOCRIT',
      lowNormal: 1,
      hiNormal: 1000,
      obs: [{ obsDatetime: '2026-08-03T11:15:05.000+0300', value: '200.0', lowNormal: 36.1, hiNormal: 50.3 }],
    });

    expect(rows[0]).toMatchObject({ interpretation: 'HIGH', range: '36.1 – 50.3', abnormal: true });
  });

  it('does not use the root node display as a panel label', () => {
    // The root is the query container ("LABORATORY TESTS"), not a clinical panel.
    const rows = flattenObsTree({
      display: 'LABORATORY TESTS',
      subSets: [{ conceptUuid: 'c1', display: 'HEMOGLOBIN', obs: [{ obsDatetime: '2026-08-03T09:00:00.000+0300', value: 14 }] }],
    });

    expect(rows[0].panel).toBeUndefined();
  });

  it('reads a coded result and marks it unassessable', () => {
    const rows = flattenObsTree({
      conceptUuid: 'c1',
      display: 'HIV STATUS',
      obs: [{ obsDatetime: '2026-01-02T09:00:00.000Z', value: { display: 'Positive' } }],
    });

    expect(rows[0]).toMatchObject({ value: 'Positive', interpretation: '--', abnormal: false });
  });

  it('emits a node that carries both its own obs and subSets', () => {
    const rows = flattenObsTree({
      conceptUuid: 'parent',
      display: 'Parent',
      obs: [{ obsDatetime: '2026-01-02T09:00:00.000Z', value: 1 }],
      subSets: [{ conceptUuid: 'child', display: 'Child', obs: [{ obsDatetime: '2026-01-02T09:00:00.000Z', value: 2 }] }],
    });

    expect(rows.map((r) => r.test)).toEqual(['Parent', 'Child']);
  });

  it('de-duplicates a concept repeated across branches', () => {
    const obs = [{ obsDatetime: '2026-01-02T09:00:00.000Z', value: 1 }];
    const rows = flattenObsTree({
      display: 'Outer',
      subSets: [
        { conceptUuid: 'dup', display: 'Repeated', obs },
        { conceptUuid: 'dup', display: 'Repeated', obs },
      ],
    });

    expect(rows).toHaveLength(1);
  });

  it('stops descending past the depth cap without throwing', () => {
    // 8 levels deep, past the cap of 6.
    let node: any = { conceptUuid: 'deepest', display: 'Deepest', obs: [{ obsDatetime: '2026-01-02T09:00:00.000Z', value: 1 }] };
    for (let i = 0; i < 8; i++) {
      node = { display: `Level ${i}`, subSets: [node] };
    }

    expect(() => flattenObsTree(node)).not.toThrow();
    expect(flattenObsTree(node)).toEqual([]);
  });

  it('handles the real LABORATORY TESTS tree: same-day only, deduped, panels attributed', () => {
    // Trimmed from an actual server payload. It exercises every hazard at once:
    // a duplicated concept across three branches, four levels of nesting, obs on two
    // different days, empty-obs siblings, and a node with no bounds at all.
    const hb = (day: string) => [
      { obsDatetime: `${day}T12:33:46.000+0300`, value: '14.0', lowNormal: 11.0, hiNormal: 18.0, lowAbsolute: 0.0, hiAbsolute: 50.0 },
    ];
    const tree = {
      display: 'LABORATORY TESTS',
      subSets: [
        {
          display: 'COMPLETE BLOOD COUNT',
          subSets: [
            {
              conceptUuid: 'a898f052',
              display: 'HEMATOCRIT',
              units: '%',
              datatype: 'Numeric',
              obs: [{ obsDatetime: '2026-08-03T12:33:46.000+0300', value: '200.0', lowNormal: 36.1, hiNormal: 50.3, lowAbsolute: 0.0, hiAbsolute: 250.0 }],
            },
            // Same concept as the standalone and antenatal copies below — must appear once.
            { conceptUuid: 'a8908a16', display: 'HEMOGLOBIN', units: 'g/dL', datatype: 'Numeric', obs: hb('2026-08-03') },
            // Ordered but unresulted siblings must contribute nothing.
            { conceptUuid: 'a89c409a', display: 'PLATELETCRIT', units: '%', datatype: 'Numeric', obs: [] },
          ],
        },
        {
          display: 'RENAL FUNCTION BLOOD TEST',
          subSets: [
            // Four levels deep: root > RENAL > SERUM ELECTROLYTES > SERUM SODIUM.
            {
              display: 'SERUM ELECTROLYTES',
              subSets: [{ conceptUuid: 'a899f5ec', display: 'SERUM SODIUM', units: 'mmol/L', obs: [{ obsDatetime: '2026-08-03T11:15:05.000+0300', value: '150.0', lowNormal: 132.0, hiNormal: 145.0 }] }],
            },
            // No bounds anywhere — must be unassessable rather than claimed normal.
            { conceptUuid: '7ec09bdc', display: 'UREA MEASUREMENT (CALCULATED)', datatype: 'Numeric', obs: [{ obsDatetime: '2026-08-03T11:15:05.000+0300', value: '599' }] },
          ],
        },
        // A different day — the whole point of the same-day filter.
        { conceptUuid: 'a8908a16', display: 'HEMOGLOBIN', units: 'g/dL', obs: hb('2026-06-02') },
        { display: 'ANTENATAL CARE  PROFILE', subSets: [{ conceptUuid: 'a8908a16', display: 'HEMOGLOBIN', units: 'g/dL', obs: hb('2026-06-02') }] },
      ],
    };

    const rows = flattenObsTree(tree, { window: visitWindow });
    const byTest = new Map(rows.map((r) => [r.test, r]));

    // Only the four same-day resulted analytes; no duplicates, no empty-obs nodes.
    expect(rows.map((r) => r.test).sort()).toEqual([
      'HEMATOCRIT',
      'HEMOGLOBIN',
      'SERUM SODIUM',
      'UREA MEASUREMENT (CALCULATED)',
    ]);

    expect(byTest.get('HEMATOCRIT')).toMatchObject({ value: '200.0', units: '%', range: '36.1 – 50.3', interpretation: 'HIGH', abnormal: true, panel: 'COMPLETE BLOOD COUNT' });
    // Deduped to the COMPLETE BLOOD COUNT copy, and it is the same-day one.
    expect(byTest.get('HEMOGLOBIN')).toMatchObject({ value: '14.0', interpretation: 'NORMAL', abnormal: false, panel: 'COMPLETE BLOOD COUNT' });
    // Panel is the *immediate* parent, not the outer RENAL grouping.
    expect(byTest.get('SERUM SODIUM')).toMatchObject({ interpretation: 'HIGH', panel: 'SERUM ELECTROLYTES' });
    expect(byTest.get('UREA MEASUREMENT (CALCULATED)')).toMatchObject({ value: '599', interpretation: '--', abnormal: false, range: undefined, units: undefined });
  });

  it('stops at the node budget on a pathologically wide tree', () => {
    const subSets = Array.from({ length: 900 }, (_, i) => ({
      conceptUuid: `c${i}`,
      display: `Analyte ${i}`,
      obs: [{ obsDatetime: '2026-01-02T09:00:00.000Z', value: i }],
    }));

    const rows = flattenObsTree({ display: 'Huge panel', subSets });

    expect(rows.length).toBeLessThan(900);
    expect(rows.length).toBeGreaterThan(0);
  });
});

describe('normalizeObsTreeResponse', () => {
  it('absorbs each response envelope shape', () => {
    const node = { conceptUuid: 'c1', display: 'A test' };

    expect(normalizeObsTreeResponse(node)).toEqual([node]);
    expect(normalizeObsTreeResponse([node])).toEqual([node]);
    expect(normalizeObsTreeResponse({ results: [node] })).toEqual([node]);
  });

  it('returns an empty array for junk', () => {
    expect(normalizeObsTreeResponse(null)).toEqual([]);
    expect(normalizeObsTreeResponse(undefined)).toEqual([]);
    expect(normalizeObsTreeResponse('nope')).toEqual([]);
    expect(normalizeObsTreeResponse({ unrelated: true })).toEqual([]);
  });
});

describe('fetchObsTrees', () => {
  it('requests every concept in one call, comma-joined', async () => {
    mockOpenmrsFetch.mockResolvedValueOnce(mockResponse({ conceptUuid: 'c1', display: 'A test' }));

    const { trees, ok } = await fetchObsTrees('patient-1', ['c1', 'c2']);

    const [url] = mockOpenmrsFetch.mock.calls[0] as [string];
    expect(url).toContain('/obstree?');
    expect(url).toContain('concept=c1,c2');
    expect(mockOpenmrsFetch).toHaveBeenCalledTimes(1);
    expect(ok).toBe(true);
    expect(trees).toHaveLength(1);
  });

  it('retries one request per concept when the comma-joined request is rejected', async () => {
    // A server may refuse a multi-concept request — and merging a day's visits makes
    // multi-concept the normal case, so this path matters.
    mockOpenmrsFetch.mockImplementation((url: string) =>
      Promise.resolve(
        url.includes('c1,c2')
          ? mockResponse(null, false)
          : mockResponse({ conceptUuid: url.includes('concept=c1') ? 'c1' : 'c2', display: 'A test' }),
      ),
    );

    const { trees, ok } = await fetchObsTrees('patient-1', ['c1', 'c2']);

    expect(ok).toBe(true);
    expect(trees.map((tree) => tree.conceptUuid)).toEqual(['c1', 'c2']);
    // The joined attempt plus one per concept.
    expect(mockOpenmrsFetch).toHaveBeenCalledTimes(3);
  });

  it('sends the concept list with a literal comma, not a percent-encoded one', async () => {
    mockOpenmrsFetch.mockResolvedValue(mockResponse({ conceptUuid: 'c1', display: 'A test' }));

    await fetchObsTrees('patient-1', ['c1', 'c2']);

    const [url] = mockOpenmrsFetch.mock.calls[0] as [string];
    expect(url).toContain('concept=c1,c2');
    expect(url).not.toContain('%2C');
  });

  it('reports ok:false only when every per-concept retry also fails', async () => {
    mockOpenmrsFetch.mockResolvedValue(mockResponse(null, false));

    expect(await fetchObsTrees('patient-1', ['c1', 'c2'])).toEqual({ trees: [], ok: false });
  });

  it('does not retry per concept when only one was requested', async () => {
    mockOpenmrsFetch.mockResolvedValue(mockResponse(null, false));

    expect(await fetchObsTrees('patient-1', ['c1'])).toEqual({ trees: [], ok: false });
    expect(mockOpenmrsFetch).toHaveBeenCalledTimes(1);
  });

  it('makes no request at all when nothing was ordered', async () => {
    const { trees, ok } = await fetchObsTrees('patient-1', []);

    expect(mockOpenmrsFetch).not.toHaveBeenCalled();
    expect(trees).toEqual([]);
    // An empty concept list is a success that skips the network, not a failure.
    expect(ok).toBe(true);
  });

  it('reports ok:false when the request throws', async () => {
    mockOpenmrsFetch.mockRejectedValue(new Error('boom'));

    expect(await fetchObsTrees('patient-1', ['c1'])).toEqual({ trees: [], ok: false });
  });
});

describe('fetchTestOrders', () => {
  it('queries both care settings without an orderTypes filter and matches client-side', async () => {
    mockOpenmrsFetch.mockImplementation((url: string) =>
      Promise.resolve(
        mockResponse({
          results: url.includes(OUTPATIENT_CARE_SETTING_UUID)
            ? [
                { uuid: 'o1', concept: { uuid: 'c1', display: 'RANDOM BLOOD SUGAR' }, orderType: { uuid: TEST_ORDER_TYPE_UUID, display: 'Test' } },
                { uuid: 'o2', concept: { uuid: 'c2', display: 'Amoxicillin' }, orderType: { uuid: DRUG_ORDER_TYPE_UUID, display: 'Drug' } },
              ]
            : // An inpatient test order — previously invisible to this section.
              [{ uuid: 'o3', concept: { uuid: 'c3', display: 'SERUM CREATININE' }, orderType: { javaClassName: 'org.openmrs.TestOrder', display: 'Test' } }],
        }),
      ),
    );

    const orders = await fetchTestOrders('patient-1');

    const urls = mockOpenmrsFetch.mock.calls.map(([url]) => url as string);
    expect(urls).toHaveLength(2);
    expect(urls.some((url) => url.includes(`careSetting=${OUTPATIENT_CARE_SETTING_UUID}`))).toBe(true);
    expect(urls.some((url) => url.includes(`careSetting=${INPATIENT_CARE_SETTING_UUID}`))).toBe(true);
    // A wrong orderTypes uuid would return an empty set indistinguishable from
    // "no tests ordered", so the filter is deliberately client-side.
    expect(urls.every((url) => url.includes('/order?') && !url.includes('orderTypes'))).toBe(true);

    expect(orders.map((o) => o.conceptUuid)).toEqual(['c1', 'c3']);
  });

  it('de-duplicates an order returned by more than one care setting', async () => {
    const row = { uuid: 'o1', concept: { uuid: 'c1', display: 'RANDOM BLOOD SUGAR' }, orderType: { uuid: TEST_ORDER_TYPE_UUID, display: 'Test' } };
    mockOpenmrsFetch.mockResolvedValue(mockResponse({ results: [row] }));

    expect(await fetchTestOrders('patient-1')).toHaveLength(1);
  });

  it('returns an empty array when every request fails', async () => {
    mockOpenmrsFetch.mockResolvedValue(mockResponse(null, false));

    expect(await fetchTestOrders('patient-1')).toEqual([]);
  });
});

describe('attachObsTreeResults', () => {
  const order = (uuid: string, conceptUuid: string, test: string) => ({ uuid, conceptUuid, test, results: [], pending: true });
  const obs = [{ obsDatetime: '2026-01-02T09:00:00.000Z', value: 5 }];

  it('pairs a tree to its order by concept uuid', () => {
    const attached = attachObsTreeResults(
      [order('o1', 'c1', 'Glucose'), order('o2', 'c2', 'Haemogram')],
      [
        { conceptUuid: 'c2', display: 'Haemogram', obs },
        { conceptUuid: 'c1', display: 'Glucose', obs },
      ],
    );

    expect(attached[0]).toMatchObject({ uuid: 'o1', pending: false });
    expect(attached[0].results[0].test).toBe('Glucose');
    expect(attached[1].results[0].test).toBe('Haemogram');
  });

  it('falls back to a display-name match when the tree carries no concept uuid', () => {
    const attached = attachObsTreeResults([order('o1', 'c1', 'Glucose')], [{ display: 'glucose', obs }]);

    expect(attached[0].pending).toBe(false);
  });

  it('pairs positionally only when there is exactly one order and one tree', () => {
    const single = attachObsTreeResults([order('o1', 'c1', 'Glucose')], [{ display: 'Something else', obs }]);
    expect(single[0].pending).toBe(false);

    const ambiguous = attachObsTreeResults(
      [order('o1', 'c1', 'Glucose'), order('o2', 'c2', 'Haemogram')],
      [{ display: 'Unrelated', obs }],
    );
    expect(ambiguous.every((o) => o.pending)).toBe(true);
  });

  it('leaves an unmatched order pending rather than dropping it', () => {
    const attached = attachObsTreeResults([order('o1', 'c1', 'Glucose'), order('o2', 'c2', 'Haemogram')], []);

    expect(attached).toHaveLength(2);
    expect(attached.every((o) => o.pending && o.results.length === 0)).toBe(true);
  });

  it('applies the visit-day filter when flattening', () => {
    const attached = attachObsTreeResults(
      [order('o1', 'c1', 'Glucose')],
      [{ conceptUuid: 'c1', display: 'Glucose', obs: [{ obsDatetime: '2026-06-02T12:33:46.000+0300', value: 5 }] }],
      { window: { startDatetime: '2026-08-03T09:01:34.000+0300', stopDatetime: '2026-08-03T20:00:00.000+0300' } },
    );

    expect(attached[0].pending).toBe(true);
  });
});

describe('getVisitCaseSummary', () => {
  const visitPayload = {
    uuid: 'visit-1',
    display: 'OPD Visit',
    patient: { person: { display: 'JANE DOE' }, identifiers: [] },
    encounters: [
      {
        uuid: 'enc-1',
        voided: false,
        encounterType: { uuid: 'et-1' },
        obs: [{ uuid: 'o1', display: 'TEMPERATURE (C): 37.0' }],
      },
    ],
  };

  const testOrderRow = {
    uuid: 'test-ord-1',
    dateActivated: '2026-08-03T08:00:00.000+0300',
    concept: { uuid: 'rbs-concept', display: 'RANDOM BLOOD SUGAR' },
    orderType: { uuid: TEST_ORDER_TYPE_UUID, display: 'Test', javaClassName: 'org.openmrs.TestOrder' },
  };

  // The widened rep returns each encounter's orders inline; this is the primary path.
  const visitPayloadWithOrders = {
    ...{ uuid: 'visit-1', display: 'OPD Visit', startDatetime: '2026-08-03T07:00:00.000+0300' },
    patient: { person: { display: 'JANE DOE' }, identifiers: [] },
    encounters: [{ uuid: 'enc-1', voided: false, encounterType: { uuid: 'et-1' }, obs: [], orders: [testOrderRow] }],
  };

  const mockObsTreeResponse = mockResponse({
    conceptUuid: 'rbs-concept',
    display: 'RANDOM BLOOD SUGAR',
    units: 'mmol/L',
    lowNormal: 4,
    hiNormal: 7,
    obs: [{ obsDatetime: '2026-08-03T10:00:00.000+0300', value: '9.1' }],
  });

  const mockOrdersResponse = mockResponse({
    results: [{ uuid: 'ord-1', drug: { display: 'Amoxicillin 500mg' }, dose: 500, doseUnits: { display: 'mg' }, route: { display: 'Oral' } }],
  });

  const mockConditionsResponse = mockResponse({
    entry: [
      {
        resource: {
          resourceType: 'Condition',
          id: 'c1',
          extension: [{ url: 'http://fhir.openmrs.org/R4/StructureDefinition/diagnosis-rank', valueInteger: 1 }],
          verificationStatus: { coding: [{ code: 'confirmed' }] },
          code: { coding: [{ display: 'Malaria' }] },
          // Deliberately an encounter from an EARLIER visit, not one of this visit's
          // encounters — Conditions must not be encounter-scoped, or a patient's
          // standing diagnoses would all be filtered out. Regression guard.
          encounter: { reference: 'Encounter/enc-from-an-older-visit' },
        },
      },
    ],
  });

  // Both order fetches hit `/order?`; only the drug rep asks for `doseUnits`.
  const isDrugOrderRequest = (url: string) => url.includes('/order?') && url.includes('doseUnits');
  const isTestOrderRequest = (url: string) => url.includes('/order?') && !url.includes('doseUnits');

  it('fetches a specific visit in one call and the supplementary calls', async () => {
    mockOpenmrsFetch.mockImplementation((url: string) => {
      if (url.includes('/visit/visit-1')) return Promise.resolve(mockResponse(visitPayload));
      if (url.includes('/Condition?')) return Promise.resolve(mockConditionsResponse);
      if (isDrugOrderRequest(url)) return Promise.resolve(mockOrdersResponse);
      if (isTestOrderRequest(url)) return Promise.resolve(mockResponse({ results: [] }));
      return Promise.resolve(mockResponse({ entry: [] }));
    });

    const summary = await getVisitCaseSummary('patient-1', 'visit-1');

    expect(summary.patientUuid).toBe('patient-1');
    expect(summary.demographics.name).toBe('JANE DOE');
    expect(summary.encounterUuids).toEqual(['enc-1']);
    // Kept despite its encounter belonging to an older visit — see the fixture comment.
    expect(summary.conditions).toEqual([{ code: undefined, description: 'Malaria', certainty: 'confirmed', primary: true, onsetDate: undefined }]);
    expect(summary.medications).toHaveLength(1);
    expect(summary.medications[0]).toMatchObject({ drug: 'Amoxicillin 500mg', dose: '500 mg', route: 'Oral' });
    expect(summary.vitals).toContainEqual({ label: 'Temperature', value: '37.0' });
    expect(Object.keys(summary.groups)).toEqual(expect.arrayContaining(['allergies', 'encounters']));
    // DiagnosticReport is gone — lab results come from /order + obstree now.
    expect(summary.groups).not.toHaveProperty('results');
    expect(summary.inpatientDetails).toBeUndefined();
    // 5 calls: visit (widened rep, which also carried the orders) + allergies +
    // conditions + drug orders x2 care settings. No separate test-order fetch, and no
    // obstree request because this visit ordered no tests.
    expect(mockOpenmrsFetch).toHaveBeenCalledTimes(5);
    expect(mockOpenmrsFetch).not.toHaveBeenCalledWith(expect.stringContaining('/obstree'));
    expect(mockOpenmrsFetch).not.toHaveBeenCalledWith(expect.stringContaining('DiagnosticReport'));
    expect(summary.labOrders).toEqual([]);
    expect(summary.labResultsUnavailable).toBeUndefined();
  });

  it('resolves test orders to obstree results end to end, from the widened visit rep', async () => {
    mockOpenmrsFetch.mockImplementation((url: string) => {
      if (url.includes('/visit/visit-1')) return Promise.resolve(mockResponse(visitPayloadWithOrders));
      if (url.includes('/obstree')) return Promise.resolve(mockObsTreeResponse);
      if (url.includes('/order?')) return Promise.resolve(mockResponse({ results: [] }));
      return Promise.resolve(mockResponse({ entry: [] }));
    });

    const summary = await getVisitCaseSummary('patient-1', 'visit-1');

    expect(summary.labOrders).toHaveLength(1);
    expect(summary.labOrders[0]).toMatchObject({ test: 'RANDOM BLOOD SUGAR', pending: false });
    expect(summary.labOrders[0].results[0]).toMatchObject({
      test: 'RANDOM BLOOD SUGAR',
      value: '9.1',
      units: 'mmol/L',
      range: '4 – 7',
      interpretation: 'HIGH',
      abnormal: true,
    });
    expect(summary.labResultsUnavailable).toBeUndefined();
    expect(mockOpenmrsFetch).toHaveBeenCalledWith(expect.stringContaining('/obstree?'));
    // The orders came with the visit, so the separate test-order round-trips were skipped.
    const urls = mockOpenmrsFetch.mock.calls.map(([url]) => url as string);
    expect(urls.filter(isTestOrderRequest)).toEqual([]);
    // 6 calls: visit + allergies + conditions + drug orders x2 + obstree.
    expect(urls).toHaveLength(6);
  });

  it('falls back to the narrow rep and a separate /order fetch when the widened rep is rejected', async () => {
    let sawWideRep = false;
    mockOpenmrsFetch.mockImplementation((url: string) => {
      if (url.includes('/visit/visit-1')) {
        // The widened rep asks for orders; simulate a server that refuses it.
        if (decodeURIComponent(url).includes('orders:(')) {
          sawWideRep = true;
          return Promise.resolve(mockResponse(null, false));
        }
        return Promise.resolve(mockResponse(visitPayload));
      }
      if (url.includes('/obstree')) return Promise.resolve(mockObsTreeResponse);
      if (isDrugOrderRequest(url)) return Promise.resolve(mockResponse({ results: [] }));
      if (isTestOrderRequest(url)) return Promise.resolve(mockResponse({ results: [testOrderRow] }));
      return Promise.resolve(mockResponse({ entry: [] }));
    });

    const summary = await getVisitCaseSummary('patient-1', 'visit-1');

    expect(sawWideRep).toBe(true);
    // Recovered: the summary still renders, and the results still resolve.
    expect(summary.demographics.name).toBe('JANE DOE');
    expect(summary.labOrders).toHaveLength(1);
    expect(summary.labOrders[0].results[0]).toMatchObject({ value: '9.1', interpretation: 'HIGH' });
  });

  it('flags results as unavailable when obstree fails but orders exist', async () => {
    mockOpenmrsFetch.mockImplementation((url: string) => {
      if (url.includes('/visit/visit-1')) return Promise.resolve(mockResponse(visitPayloadWithOrders));
      if (url.includes('/order?')) return Promise.resolve(mockResponse({ results: [] }));
      if (url.includes('/obstree')) return Promise.resolve(mockResponse(null, false));
      return Promise.resolve(mockResponse({ entry: [] }));
    });

    const summary = await getVisitCaseSummary('patient-1', 'visit-1');

    // The order still shows, as pending, and the view can say "could not be retrieved"
    // rather than implying nothing was resulted.
    expect(summary.labOrders).toHaveLength(1);
    expect(summary.labOrders[0].pending).toBe(true);
    expect(summary.labResultsUnavailable).toBe(true);
  });

  it('resolves diagnoses to ICD-11 codes end to end', async () => {
    mockOpenmrsFetch.mockImplementation((url: string) => {
      if (url.includes('/visit/visit-1')) return Promise.resolve(mockResponse(visitPayload));
      if (url.includes('/Condition?')) {
        return Promise.resolve(
          mockResponse({
            entry: [
              {
                resource: {
                  resourceType: 'Condition',
                  id: 'c-e2e',
                  // As the real server sends it: one system-less coding holding the concept uuid.
                  code: { coding: [{ code: 'cu-e2e', display: 'Secondary hypertension' }], text: 'Secondary hypertension' },
                },
              },
            ],
          }),
        );
      }
      if (url.includes('/concept/cu-e2e')) {
        return Promise.resolve(
          mockResponse({
            conceptMappings: [{ conceptReferenceTerm: { code: 'BA04', conceptSource: { name: 'ICD-11-WHO' } } }],
          }),
        );
      }
      return Promise.resolve(mockResponse({ entry: [] }));
    });

    const summary = await getVisitCaseSummary('patient-1', 'visit-1');

    expect(summary.conditions).toHaveLength(1);
    expect(summary.conditions[0]).toMatchObject({ code: 'BA04', description: 'Secondary hypertension' });
  });

  it('does not encounter-scope the Condition request', async () => {
    mockOpenmrsFetch.mockImplementation((url: string) => {
      if (url.includes('/visit/visit-1')) return Promise.resolve(mockResponse(visitPayload));
      if (url.includes('/Condition?')) return Promise.resolve(mockConditionsResponse);
      return Promise.resolve(mockResponse({ entry: [] }));
    });

    const summary = await getVisitCaseSummary('patient-1', 'visit-1');

    // A Condition referencing an encounter outside this visit still shows up.
    expect(summary.conditions).toHaveLength(1);
    expect(summary.conditions[0].description).toBe('Malaria');
  });

  it('resolves the visit in one request, preferring the still-open one', async () => {
    const closedEarlier = { uuid: 'visit-closed', startDatetime: '2026-08-03T07:00:00.000+0300', stopDatetime: '2026-08-03T08:00:00.000+0300', patient: { person: { display: 'JANE DOE' } }, encounters: [] };
    const stillOpen = { uuid: 'visit-open', startDatetime: '2026-08-03T09:00:00.000+0300', patient: { person: { display: 'JANE DOE' } }, encounters: [] };

    mockOpenmrsFetch.mockImplementation((url: string) => {
      // Newest first, as `sort=desc` returns them.
      if (url.includes('/visit?')) return Promise.resolve(mockResponse({ results: [stillOpen, closedEarlier] }));
      return Promise.resolve(mockResponse({ entry: [] }));
    });

    const summary = await getVisitCaseSummary('patient-1');

    expect(summary.visit.uuid).toBe('visit-open');
    const visitUrls = mockOpenmrsFetch.mock.calls.map(([url]) => url as string).filter((url) => url.includes('/visit?'));
    // One request, not the old active-then-fallback pair.
    expect(visitUrls).toHaveLength(1);
    // `includeInactive=true` returns open AND closed visits, which is what makes both
    // the open-visit preference and the same-day merge possible in a single call.
    expect(visitUrls[0]).toContain('includeInactive=true');
  });

  it('merges visits started on the same day into one comprehensive summary', async () => {
    // Two outpatient check-ins on the same day: neither should be lost.
    const morning = {
      uuid: 'visit-morning',
      startDatetime: '2026-08-03T07:00:00.000+0300',
      stopDatetime: '2026-08-03T08:30:00.000+0300',
      patient: { person: { display: 'JANE DOE' }, identifiers: [] },
      encounters: [{ uuid: 'enc-morning', voided: false, encounterType: { uuid: 'et-1' }, obs: [{ uuid: 'o1', display: 'TEMPERATURE (C): 37.0' }] }],
    };
    const afternoon = {
      uuid: 'visit-afternoon',
      startDatetime: '2026-08-03T14:00:00.000+0300',
      patient: { person: { display: 'JANE DOE' }, identifiers: [] },
      encounters: [{ uuid: 'enc-afternoon', voided: false, encounterType: { uuid: 'et-1' }, obs: [{ uuid: 'o2', display: 'CHIEF COMPLAINT, DETAILED: headache' }] }],
    };
    // A different day — must stay out of the merge.
    const yesterday = { uuid: 'visit-yesterday', startDatetime: '2026-08-02T09:00:00.000+0300', stopDatetime: '2026-08-02T10:00:00.000+0300', patient: { person: { display: 'JANE DOE' } }, encounters: [{ uuid: 'enc-yesterday', voided: false, obs: [] }] };

    mockOpenmrsFetch.mockImplementation((url: string) => {
      if (url.includes('/visit?')) return Promise.resolve(mockResponse({ results: [afternoon, morning, yesterday] }));
      return Promise.resolve(mockResponse({ entry: [] }));
    });

    const summary = await getVisitCaseSummary('patient-1');

    expect(summary.visitUuids.sort()).toEqual(['visit-afternoon', 'visit-morning']);
    expect(summary.encounterUuids.sort()).toEqual(['enc-afternoon', 'enc-morning']);
    // Data from both visits is present.
    expect(summary.vitals).toContainEqual({ label: 'Temperature', value: '37.0' });
    expect(summary.clinicalNotes.map((note) => note.encounterUuid)).toContain('enc-afternoon');
    // The span opens at the earliest start and stays OPEN because one visit is unclosed,
    // so results still arriving today are not excluded.
    expect(summary.visit.startDatetime).toBe('2026-08-03T07:00:00.000+0300');
    expect(summary.visit.stopDatetime).toBeUndefined();
  });

  it('closes the merged span when every same-day visit has ended', () => {
    const merged = mergeVisitPayloads([
      { uuid: 'v2', startDatetime: '2026-08-03T14:00:00.000+0300', stopDatetime: '2026-08-03T15:00:00.000+0300' },
      { uuid: 'v1', startDatetime: '2026-08-03T07:00:00.000+0300', stopDatetime: '2026-08-03T08:30:00.000+0300' },
    ]);

    expect(merged.startDatetime).toBe('2026-08-03T07:00:00.000+0300');
    expect(merged.stopDatetime).toBe('2026-08-03T15:00:00.000+0300');
  });

  it('does not fold in neighbours when a specific visit is requested', async () => {
    mockOpenmrsFetch.mockImplementation((url: string) => {
      if (url.includes('/visit/visit-1')) return Promise.resolve(mockResponse(visitPayload));
      return Promise.resolve(mockResponse({ entry: [] }));
    });

    const summary = await getVisitCaseSummary('patient-1', 'visit-1');

    expect(summary.visitUuids).toEqual(['visit-1']);
    // Asking for one visit must not trigger the recent-visits lookup.
    expect(mockOpenmrsFetch).not.toHaveBeenCalledWith(expect.stringContaining('/visit?'));
  });

  it('throws when the patient has no visits at all', async () => {
    mockOpenmrsFetch.mockResolvedValue(mockResponse({ results: [] }));

    await expect(getVisitCaseSummary('patient-1')).rejects.toThrow('No visit found for this patient.');
  });
});
