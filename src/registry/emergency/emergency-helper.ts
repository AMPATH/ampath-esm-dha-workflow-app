import { createVisit } from '../../resources/visit.resource';
import { type CreateVisitDto } from '../types';
import { VisitTypeUuids } from '../../shared/constants/visit-types';

export const createAmrsVisit = async (locationUuid: string, patientUuid: string) => {
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

  const visit = await createVisit(visitDto);
  if (!visit?.uuid) {
    throw new Error('Error creating AMRS visit');
  }

  return visit;
};
