import { Type, validator } from '@openmrs/esm-framework';

export const configSchema = {
    concepts: {
    defaultPriorityConceptUuid: {
      _type: Type.ConceptUuid,
      _default: false,
      _description: 'The UUID of the default priority for the queues eg Not urgent.',
    },
    defaultStatusConceptUuid: {
      _type: Type.ConceptUuid,
      _default: '51ae5e4d-b72b-4912-bf31-a17efb690aeb',
      _description: 'The UUID of the default status for the queues eg Waiting.',
    },
    defaultTransitionStatus: {
      _type: Type.ConceptUuid,
      _default: 'ca7494ae-437f-4fd0-8aae-b88b9a2ba47d',
      _description: 'The UUID of the default status for attending a service in the queues eg In Service.',
    },
    systolicBloodPressureUuid: {
      _type: Type.ConceptUuid,
      _default: '5085AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA',
    },
    diastolicBloodPressureUuid: {
      _type: Type.ConceptUuid,
      _default: '5086AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA',
    },
    emergencyPriorityConceptUuid: {
      _type: Type.ConceptUuid,
      _default: false,
      _description: 'The UUID of the priority with the highest sort weight for the queues eg Emergency.',
    },
    generalPatientNoteConceptUuid: {
      _type: Type.ConceptUuid,
      _default: '162169AAAAAAAAAAAAAAAAAAAAAAAAAAAAAA',
      _description:
        'The UUID of the free text note field intended to capture unstructured description of the patient encounter',
    },
    heightUuid: {
      _type: Type.ConceptUuid,
      _default: '5090AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA',
    },
    historicalObsConceptUuid: {
      _type: Type.Array,
      _default: ['161643AAAAAAAAAAAAAAAAAAAAAAAAAAAAAA'],
      _description: 'The Uuids of the obs that are displayed on the previous visit modal',
      _elements: {
        _type: Type.ConceptUuid,
      },
    },
    oxygenSaturationUuid: {
      _type: Type.ConceptUuid,
      _default: '5092AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA',
    },
    pulseUuid: {
      _type: Type.ConceptUuid,
      _default: '5087AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA',
    },
    problemListConceptUuid: {
      _type: Type.ConceptUuid,
      _default: '1284AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA',
    },
    respiratoryRateUuid: {
      _type: Type.ConceptUuid,
      _default: '5242AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA',
    },
    temperatureUuid: {
      _type: Type.ConceptUuid,
      _default: '5088AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA',
    },
    visitDiagnosesConceptUuid: {
      _type: Type.ConceptUuid,
      _default: '159947AAAAAAAAAAAAAAAAAAAAAAAAAAAAAA',
    },
    weightUuid: {
      _type: Type.ConceptUuid,
      _default: '5089AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA',
    },
  },
};

export type Config = {
  casualGreeting: boolean;
  whoToGreet: Array<string>;
};

export interface ConfigObject {
  // priorityConfigs: Array<PriorityConfig>;
  appointmentStatuses: Array<string>;
  // biometrics: BiometricsConfigObject;
  concepts: {
    defaultPriorityConceptUuid: string;
    defaultStatusConceptUuid: string;
    defaultTransitionStatus: string;
    diastolicBloodPressureUuid: string;
    emergencyPriorityConceptUuid: string;
    generalPatientNoteConceptUuid: string;
    heightUuid: string;
    historicalObsConceptUuid: Array<string>;
    oxygenSaturationUuid: string;
    pulseUuid: string;
    problemListConceptUuid: string;
    respiratoryRateUuid: string;
    systolicBloodPressureUuid: string;
    temperatureUuid: string;
    visitDiagnosesConceptUuid: string;
    weightUuid: string;
  };
  defaultInitialServiceQueue: string;
  contactAttributeType: string;
  customPatientChartUrl: string;
  defaultIdentifierTypes: Array<string>;
  dashboardTitle: {
    key: string;
    value: string;
  };
  // queueTables: TablesConfig;
  showRecommendedVisitTypeTab: boolean;
  visitQueueNumberAttributeUuid: string | null;
  visitTypeResourceUrl: string;
  // vitals: VitalsConfigObject;
}

const queueEntryActions = ['move', 'call', 'edit', 'transition', 'signOff', 'remove', 'delete', 'undo'] as const;
export type QueueEntryAction = (typeof queueEntryActions)[number];
