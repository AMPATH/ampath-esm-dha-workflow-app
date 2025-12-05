import { type Patient } from '@openmrs/esm-framework';
import { type HieClient } from '../registry/types';
import { generateAmrsPersonPayload } from '../registry/utils/hie-client-adapter';
import { createPatient, generatePatientIdentifiers } from './patient-resource';

export async function registerHieClientInAmrs(client: HieClient, identifierLocation: string): Promise<Patient> {
  const createPersonPayload = generateAmrsPersonPayload(client);
  const identifiers = await generatePatientIdentifiers(identifierLocation, client);
  const resp = await createPatient({
    person: createPersonPayload,
    identifiers: identifiers,
  });

  const res = await resp.json();
  return res;
}
