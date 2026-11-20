export type EventAlertData = {
  title: string;
  message: string;
  kind: 'info' | 'warning' | 'error'
}

export type DetetectedIssesDto = {
    startDate: string;
    endDate: string;
}

export interface Coding {
  system: string;
  code: string;
  display: string;
}

export interface CodeableConcept {
  coding: Coding[];
  text: string;
}

export interface Period {
  start: string;
  end: string;
}

export interface EvidenceDetail {
  display: string;
}

export interface DetectedIssueEvidence {
  detail: EvidenceDetail[];
}

export interface ResourceMeta {
  profile: string[];
}

export interface DetectedIssueResource {
  resourceType: 'DetectedIssue';
  id: string;
  status: 'registered' | 'preliminary' | 'final' | 'amended' | 'corrected' | 'cancelled' | 'entered-in-error' | 'unknown';
  code: CodeableConcept;
  severity: 'high' | 'moderate' | 'low';
  identifiedPeriod: Period;
  detail: string;
  evidence: DetectedIssueEvidence[];
  meta: ResourceMeta;
}

export interface DetectedIssueBundleEntry {
  resource: DetectedIssueResource;
}

export interface DetectedIssueBundle {
  resourceType: 'Bundle';
  type: 'document' | 'message' | 'transaction' | 'transaction-response' | 'batch' | 'batch-response' | 'history' | 'searchset' | 'collection';
  total: number;
  entry: DetectedIssueBundleEntry[];
}