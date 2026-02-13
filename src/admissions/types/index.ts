import { Concept, Encounter, Obs, Patient, Visit, type Location } from "@openmrs/esm-framework";

export type DispositionType = 'ADMIT' | 'TRANSFER';
export type DispositionResponse = {
  results: Disposition[];
};

export type Disposition = {
  dispositionLocation: Location;
  dispositionType: DispositionType;
  disposition: Concept;
  dispositionEncounter: Encounter;
  patient: Patient;
  dispositionObsGroup: Obs;
  visit: Visit;
}

export interface BedTag {
  id: number;
  name: string;
  uuid: string;
  resourceVersion: string;
}

export interface BedTagMap {
  uuid: string;
  bedTag: BedTag;
  resourceVersion: string;
}

export interface BedType {
  uuid: string;
  name: string;
  displayName: string;
  description: string;
  resourceVersion: string;
}

export type BedStatus = 'OCCUPIED' | 'AVAILABLE';

export interface BedLayout {
  rowNumber: number;
  columnNumber: number;
  bedNumber: string;
  bedId: number;
  bedUuid: string;
  status: BedStatus;
  location: string;
  bedType: BedType | null;
  patients: Patient[];
  bedTagMaps: BedTagMap[];
  resourceVersion: string;
}

export interface AdmissionLocationData {
  ward: Location;
  totalBeds: number;
  occupiedBeds: number;
  bedLayouts: BedLayout[];
  resourceVersion: string;
}

export interface EncounterDto {
  patient: string;
  encounterType: {
    uuid: string;
  },
  location: string;
  obs: any[];
  visit?: string;
}

export interface AdmitPatientDto extends EncounterDto{
}
export type AssignBedToPatientDto = {
 patientUuid:string;
 encounterUuid: string;
}

export interface CancelAdmissionDto extends EncounterDto{
}

export interface BedSwapDto extends EncounterDto {
}

export interface DischargePatientDto extends EncounterDto {
}
export type UnAssignBedDto = {
  patientUuid: string;
  bedId: number;
}