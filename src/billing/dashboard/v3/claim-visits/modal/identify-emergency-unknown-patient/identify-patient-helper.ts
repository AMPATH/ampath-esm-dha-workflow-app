import { showSnackbar } from '@openmrs/esm-framework';
import dayjs from 'dayjs';

import { type ClientRegistrySearchRequest } from '../../../../../../registry/types';
import { type Intervention } from '../../../../../../claims';
import { type ClaimsVisit } from '../../../types';

export const showAlert = (alertType: 'error' | 'success' | 'info' | 'warning', title: string, subtitle: string) => {
  showSnackbar({
    kind: alertType,
    title: title,
    subtitle: subtitle,
  });
};

export const validateForm = (identifierValue: string, identifierType: string, locationUuid: string): string => {
  const value = identifierValue.trim();
  if (!value) {
    return `${identifierType} value is required`;
  }
  if (value.length < 4) {
    return `Enter a valid ${identifierType.toLowerCase()} (minimum 4 characters)`;
  }
  if (identifierType === 'National ID' && !/^\d+$/.test(value)) {
    return 'National ID must contain digits only';
  }
  if (!locationUuid) {
    return 'No default location selected. Please set your session location.';
  }
  return '';
};

export const isValidSeatchClientPayload = (payload: ClientRegistrySearchRequest): boolean => {
  if (!payload.identificationNumber) {
    showAlert('error', 'Please enter a valid identification number', '');
    return false;
  }
  if (!payload.identificationType) {
    showAlert('error', 'Please enter a valid identification type', '');
    return false;
  }
  if (!payload.locationUuid) {
    showAlert('error', 'No default location selected', '');
    return false;
  }
  return true;
};

export function isPatientMinor(patient: any): boolean {
  const age = patient?.person?.age;

  if (typeof age === 'number') {
    return age < 18;
  }

  const birthdate = patient?.person?.birthdate;

  if (!birthdate) {
    return false;
  }

  const computedAge = dayjs().diff(dayjs(birthdate), 'year');

  return Number.isFinite(computedAge) && computedAge < 18;
}

export const getIntervention = (claimsVisit: ClaimsVisit) => {
  const interventions = claimsVisit.interventions;
  if (interventions && interventions.length) {
    const intervention = interventions[interventions.length - 1];
    return {
      code: intervention.intervention_code,
      paymentMechanism: intervention.intervention_payment_mechanism,
    } as Intervention;
  }
};
