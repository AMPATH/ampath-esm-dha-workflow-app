import { openmrsFetch, restBaseUrl } from '@openmrs/esm-framework';
import { type AdmissionLocationData } from './types';

const customRep =
  'custom:(ward,totalBeds,occupiedBeds,bedLayouts:(rowNumber,columnNumber,bedNumber,bedId,bedUuid,status,location,patients:(person:full,identifiers,uuid)))';

export async function getAdmissionLoactionData(locationUuid: string): Promise<AdmissionLocationData> {
  const admissionLocationUrl = `${restBaseUrl}/admissionLocation/${locationUuid}?v=${customRep}`;
  const response = await openmrsFetch(admissionLocationUrl);
  const result = await response.json();
  return result ?? null;
}
