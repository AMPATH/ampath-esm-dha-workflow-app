import { createVisit } from '../../resources/visit.resource';
import { type CreateVisitDto, type VisitAttribute } from '../types';
import { VisitTypeUuids } from '../../shared/constants/visit-types';

type EmergencyClaim = {
  authorization_code: string;
  scheme_code: string;
  service_type: string;
};

export const createAmrsVisit = async (locationUuid: string, patientUuid: string, claim: EmergencyClaim) => {
  if (!locationUuid || !patientUuid) {
    throw new Error('Missing location or patient for AMRS visit');
  }

  const visitDto: CreateVisitDto = {
    visitType: VisitTypeUuids.EMERGENCY_VISIT_TYPE_UUID,
    location: locationUuid,
    startDatetime: null,
    stopDatetime: null,
    patient: patientUuid,
  };

  const attributes: VisitAttribute[] = [
    {
      attributeType: '4962a633-c4f8-474c-857c-5c68c72fbbe3',
      value: claim.authorization_code,
    },
    {
      attributeType: '79072572-80c0-4a38-9da0-afe207e3ef2d',
      value: claim.scheme_code,
    },
    {
      attributeType: '97d892fe-38a4-4cfb-bdf7-2a03dff6e7cf',
      value: claim.service_type,
    },
  ];

  visitDto.attributes = attributes;

  const visit = await createVisit(visitDto);
  if (!visit?.uuid) {
    throw new Error('Error creating AMRS visit');
  }

  return visit;
};
