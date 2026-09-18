import type { Intervention } from '../../../claims';

export type Provider = {
  display: string;
  licensing_body: string;
  provider_national_id: string;
  uuid: string;
};

export interface EmergencyFormData {
  cashpointUuid?: string;
  servicePriceUuid?: string;
  modeOfArrival?: string;
  broughtBy?: string;
  interventionCode?: string;
  protocolCode?: string;
  providerNationalId?: string;
  identificationType?: string;
  licensingBody?: string;
  notes?: string;
  otp: string;
  intervention?: Intervention;
}

export function generateReferenceNumber(): string {
  const timestamp = Date.now().toString().slice(-4);
  const random = Math.floor(10 + Math.random() * 90);

  return `REF/${timestamp}/${random}`;
}

export function getAbbreviation(value?: string): string {
  if (!value) return '';

  const trimmedValue = value.trim();

  if (/^[A-Z0-9]+$/.test(trimmedValue)) {
    return trimmedValue;
  }

  const ignoredWords = new Set(['and', 'of', 'the', 'for']);

  return trimmedValue
    .split(/\s+/)
    .filter((word) => !ignoredWords.has(word.toLowerCase()))
    .map((word) => word.charAt(0))
    .join('')
    .toUpperCase();
}

export type EmergencyProtocol = {
  id: number;
  guid: string;
  name: string;
  protocolType: string;
  protocolCode: string;
  applicableTariff: string;
  protocolClassificationType: string;
  status: string;
  intervention: Intervention[];
};
