import { openmrsFetch } from '@openmrs/esm-framework';
import { getEtlBaseUrl, getHieBaseUrl } from '../../shared/utils/get-base-url';

export const fetchEmergencyInterventions = async () => {
  const hieBaseUrl = await getHieBaseUrl();

  const url = `${hieBaseUrl}/emergency/claim/interventions`;
  const response = await openmrsFetch(url);

  const data = await response.json();

  if (!response.ok) {
    const errorText = data.message || 'Failed to fetch Emergency Interventions';
    throw new Error(`Request failed with ${response.status}: ${errorText}`);
  }

  return data;
};

export async function sendEmergencyClaimIdentified(
  modeOfArrival: string,
  broughtBy: string,
  locationUuid: string,
  interventionCode: string,
  referenceNumber: string,
  beneficiaryCrId: string,
  identificationNumber: string,
  identificationType: string,
  regulationBody: string,
  notes: string,
  otp: string,
): Promise<any> {
  const hieBaseUrl = await getHieBaseUrl();

  const payload = {
    interventionCodes: [interventionCode],
    modeOfArrival: modeOfArrival,
    broughtBy: broughtBy,
    referenceNumber: referenceNumber,
    beneficiaryCrId: beneficiaryCrId,
    identificationNumber: identificationNumber,
    identificationType: identificationType,
    regulationBody: regulationBody,
    notes: notes,
    locationUuid: locationUuid,
    otp: otp,
  };
  const url = `${hieBaseUrl}/emergency/claim/identified`;
  const response = await openmrsFetch(url, {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  const data = await response.json();

  if (!response.ok) {
    const errorText = data.message || 'Failed to created claim';
    throw new Error(`Request failed with ${response.status}: ${errorText}`);
  }

  return data;
}

export async function sendEmergencyClaimUnIdentified(
  modeOfArrival: string,
  broughtBy: string,
  locationUuid: string,
  interventionCode: string,
  referenceNumber: string,
  beneficiaryCrId: string,
  identificationNumber: string,
  identificationType: string,
  regulationBody: string,
  notes: string,
): Promise<any> {
  const hieBaseUrl = await getHieBaseUrl();

  const payload = {
    interventionCodes: [interventionCode],
    modeOfArrival: modeOfArrival,
    broughtBy: broughtBy,
    referenceNumber: referenceNumber,
    beneficiaryCrId: beneficiaryCrId,
    identificationNumber: identificationNumber,
    identificationType: identificationType,
    regulationBody: regulationBody,
    notes: notes,
    locationUuid: locationUuid,
  };
  const url = `${hieBaseUrl}/emergency/claim/unidentified`;
  const response = await openmrsFetch(url, {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  const data = await response.json();

  if (!response.ok) {
    const errorText = data.message || 'Failed to created claim';
    throw new Error(`Request failed with ${response.status}: ${errorText}`);
  }

  return data;
}

export async function fetchProviders() {
  const etlBaseUrl = await getEtlBaseUrl();
  const url = `${etlBaseUrl}/providers/licensed`;
  const response = await openmrsFetch(url);

  const data = await response.json();

  if (!response.ok) {
    const errorText = data.message || 'Failed to fetch providers';
    throw new Error(`Request failed with ${response.status}: ${errorText}`);
  }

  return data;
}

export async function fetchEmergencyProtocals(interventionCode: string, locationUuid: string) {
  const hieBaseUrl = await getHieBaseUrl();
  const params = new URLSearchParams();
  params.append('active', 'true');
  params.append('interventionCode', interventionCode);
  params.append('locationUuid', locationUuid);
  const url = `${hieBaseUrl}/emergency/claim/protocols?${params.toString()}`;
  const response = await openmrsFetch(url);

  const data = await response.json();

  if (!response.ok) {
    const errorText = data.message || 'Failed to fetch emergency protocals';
    return new Error(`Request failed with ${response.status}: ${errorText}`);
  }

  return data;
}

export async function addEmergencyProtocal(
  consentToken: string,
  protocalCode: string,
  interventionCode: string,
  unitPrice: number,
  quantity: number,
  locationUuid: string,
): Promise<any> {
  const hieBaseUrl = await getHieBaseUrl();

  const payload = {
    consentToken: [consentToken],
    protocalCode: protocalCode,
    interventionCode: interventionCode,
    unitPrice: unitPrice,
    quantity: quantity,
    locationUuid: locationUuid,
  };
  const url = `${hieBaseUrl}/emergency/claim/protocals`;
  const response = await openmrsFetch(url, {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  const data = await response.json();

  if (!response.ok) {
    const errorText = data.message || 'Failed to created claim protocal';
    throw new Error(`Request failed with ${response.status}: ${errorText}`);
  }

  return data;
}

export async function addEmergencyClaimDoctor(
  consentToken: string,
  idnetificationNumber: string,
  identificationType: string,
  regulationBody: number,
  locationUuid: string,
): Promise<any> {
  const hieBaseUrl = await getHieBaseUrl();

  const payload = {
    consentToken: [consentToken],
    idnetificationNumber: idnetificationNumber,
    identificationType: identificationType,
    regulationBody: regulationBody,
    locationUuid: locationUuid,
  };
  const url = `${hieBaseUrl}/emergency/claim/doctors`;
  const response = await openmrsFetch(url, {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  const data = await response.json();

  if (!response.ok) {
    const errorText = data.message || 'Failed to add claim doctor';
    throw new Error(`Request failed with ${response.status}: ${errorText}`);
  }

  return data;
}

export async function deleteEmergencyClaimDoctor(consentToken: string, locationUuid: string): Promise<any> {
  const hieBaseUrl = await getHieBaseUrl();

  const payload = {
    consentToken: [consentToken],
    locationUuid: locationUuid,
  };
  const url = `${hieBaseUrl}/emergency/claim/doctors`;
  const response = await openmrsFetch(url, {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  const data = await response.json();

  if (!response.ok) {
    const errorText = data.message || 'Failed to add claim doctor';
    throw new Error(`Request failed with ${response.status}: ${errorText}`);
  }

  return data;
}

export async function submitEmergencyClaim(
  consentToken: string,
  invoiceNumber: string,
  reasonForUnknown: string,
  locationUuid: string,
): Promise<any> {
  const hieBaseUrl = await getHieBaseUrl();

  const payload = {
    consentToken: [consentToken],
    invoiceNumber: invoiceNumber,
    reasonForUnknown: reasonForUnknown,
    locationUuid: locationUuid,
  };
  const url = `${hieBaseUrl}/emergency/claim/unidentified/submit`;
  const response = await openmrsFetch(url, {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  const data = await response.json();

  if (!response.ok) {
    const errorText = data.message || 'Failed to submit emergency claim';
    throw new Error(`Request failed with ${response.status}: ${errorText}`);
  }

  return data;
}
