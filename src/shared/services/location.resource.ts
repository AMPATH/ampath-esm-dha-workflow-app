import { type Location, openmrsFetch, restBaseUrl } from '@openmrs/esm-framework';

export async function getLocationByUuid(locationUuid: string): Promise<Location> {
  const locationBaseUrl = `${restBaseUrl}/location`;
  const locationUrl = `${locationBaseUrl}/${locationUuid}`;
  const resp = await openmrsFetch(locationUrl);
  const data = await resp.json();
  return data ?? null;
}
