export interface OpenmrsRef {
  uuid: string;
  display: string;
}

export interface LabOrder {
  uuid: string;
  orderNumber: string;
  action: 'NEW' | 'REVISE' | 'DISCONTINUE' | 'RENEW';
  dateActivated: string;
  dateStopped: string | null;
  fulfillerStatus: 'RECEIVED' | 'IN_PROGRESS' | 'EXCEPTION' | 'ON_HOLD' | 'DECLINED' | 'COMPLETED' | null;
  fulfillerComment: string | null;
  concept: OpenmrsRef;
}

export type ObsValue = string | number | boolean | OpenmrsRef | null;

export interface LabResultMember {
  uuid: string;
  concept: OpenmrsRef;
  value: ObsValue;
  interpretation: string | null;
}

export interface LabResultObs {
  uuid: string;
  obsDatetime: string;
  value: ObsValue;
  interpretation: string | null;
  order: { uuid: string } | null;
  groupMembers: Array<LabResultMember> | null;
}

export interface LabOrderWithResult extends LabOrder {
  result: LabResultObs | null;
}

export interface ConsultationDiagnosis {
  uuid: string;
  display: string;
  rank: number;
  voided: boolean;
}

export interface ConsultationEncounter {
  uuid: string;
  encounterDatetime: string;
  form: OpenmrsRef | null;
  visit: { uuid: string } | null;
  diagnoses: Array<ConsultationDiagnosis>;
}
