import { Encounter, openmrsFetch, restBaseUrl } from '@openmrs/esm-framework';
import { AdmitPatientDto, AssignBedToPatientDto, BedLayout, CancelAdmissionDto, Disposition, DispositionResponse, type AdmissionLocationData } from './types';

const customRep =
  'custom:(ward,totalBeds,occupiedBeds,bedLayouts:(rowNumber,columnNumber,bedNumber,bedId,bedUuid,status,location,patients:(person:full,identifiers,uuid)))';

export async function getAdmissionLoactionData(locationUuid: string): Promise<AdmissionLocationData> {
  const admissionLocationUrl = `${restBaseUrl}/admissionLocation/${locationUuid}?v=${customRep}`;
  const response = await openmrsFetch(admissionLocationUrl);
  const result = await response.json();
  return result ?? null;
}

export async function getAdmissionRequests(locationUuid: string): Promise<Disposition[]> {
  const admissionRep = 'custom:(dispositionLocation,dispositionType,disposition,dispositionEncounter:full,patient:(uuid,identifiers,voided,person:(uuid,display,gender,age,birthdate,birthtime,preferredName,preferredAddress,dead,deathDate)),dispositionObsGroup,visit)';
  const params = {
    v: admissionRep,
    dispositionLocation: locationUuid,
    dispositionType: 'ADMIT,TRANSFER'
  };
  const queryString = new URLSearchParams(params).toString();
  const admissionRequestUrl = `${restBaseUrl}/emrapi/inpatient/request?${queryString}`;
  const response = await openmrsFetch(admissionRequestUrl);
  const result = await response.json();
  return result.results ?? null;
}

export async function getAdmittedPatientsData(locationUuid: string): Promise<BedLayout[]> {
   const admissionLocationData = await getAdmissionLoactionData(locationUuid);
   if(admissionLocationData.bedLayouts && admissionLocationData.bedLayouts.length > 0){
    const bedLayouts = admissionLocationData.bedLayouts;
    return bedLayouts;
  } else {
    return [];
  }
}

export async function admitPatientToWard(admitPatientDto:AdmitPatientDto): Promise<Encounter>{
  const admitPatientUrl = `${restBaseUrl}/encounter`;
  const resp = await openmrsFetch(admitPatientUrl,{
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(admitPatientDto),
  });
  const result = await resp.json();
  return result;
}

export async function assignBedToPatient(bedId: number,assignBedToPatientDto:AssignBedToPatientDto){
   const assignBedUrl = `${restBaseUrl}/beds/${bedId}`;
   const resp = await openmrsFetch(assignBedUrl,{
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(assignBedToPatientDto),
  });
  const result = await resp.json();
  return result;
}

export async function cancelAdmissionRequest(cancelAdmissionDto: CancelAdmissionDto){
  const cancelAdmissionUrl = `${restBaseUrl}/encounter`;
  const resp = await openmrsFetch(cancelAdmissionUrl,{
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(cancelAdmissionDto)
  });
  const result = await resp.json();
  return result;
}
