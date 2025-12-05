import { openmrsFetch, restBaseUrl } from '@openmrs/esm-framework';
import { type HieClient, type CreatePatientDto, HieIdentificationType } from '../registry/types';
import { IdentifierTypesUuids } from './identifier-types';
import { getAmrsIdentifierTypeUuid } from '../registry/utils/hie-client-adapter';

export async function createPatient(payload: CreatePatientDto) {
  return await openmrsFetch(`${restBaseUrl}/patient`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: payload,
  });
}

export const generatePatientIdentifiers = async (identifierLocation: string, client: HieClient) => {
  const amrsUniverSalId = await generateAmrsUniversalIdentifier();
  const identifiers = generateAmrsCreatePatientIdentifiersPayload(client, identifierLocation);
  identifiers.push({
    identifierType: IdentifierTypesUuids.AMRS_UNIVERSAL_ID_UUID,
    identifier: amrsUniverSalId,
    location: identifierLocation,
    preferred: true,
  });
  return identifiers;
};

export function generateAmrsCreatePatientIdentifiersPayload(hieClient: HieClient, identifierLocation: string) {
  const identifiers = [];
  // add CR number
  identifiers.push({
    identifierType: getAmrsIdentifierTypeUuid(HieIdentificationType.Cr),
    identifier: hieClient.id,
    location: identifierLocation,
  });

  // add main identifier
  identifiers.push({
    identifierType: getAmrsIdentifierTypeUuid(hieClient.identification_type),
    identifier: hieClient.identification_number,
    location: identifierLocation,
  });
  return identifiers;
}

export async function generateAmrsUniversalIdentifier() {
  const abortController = new AbortController();
  const resp = await openmrsFetch(`https://staging.ampath.or.ke/amrs-id-generator/generateidentifier`, {
    headers: {
      'Content-Type': 'application/json',
    },
    method: 'POST',
    body: {
      user: 1,
    },
    signal: abortController.signal,
  });
  const data = await resp.json();
  return data['identifier'] ?? '';
}
