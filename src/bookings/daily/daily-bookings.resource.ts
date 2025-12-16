import { getEtlBaseUrl } from '../../shared/utils/get-base-url';
import {
  type BookingFilter,
  type BookingDto,
  type DailyBookingsResult,
  type DailyBookingsReponse,
  type DailyBookingType,
} from '../types';

export async function getDailyBookings(
  bookingFilter: BookingFilter,
  bookingType: DailyBookingType,
): Promise<DailyBookingsResult[]> {
  const etlBaseUrl = await getEtlBaseUrl();
  const params: BookingDto = {
    department: bookingFilter.department,
    startDate: bookingFilter.startDate ?? new Date().toISOString().split('T')[0],
    locationUuids: bookingFilter.locationUuids,
    startIndex: '0',
    limit: '1000',
  };
  const queryString = new URLSearchParams(params).toString();
  const dailyAppUrl = `${etlBaseUrl}/${bookingType}/${bookingFilter.startDate}?&${queryString}`;
  const resp = await fetch(dailyAppUrl);
  const data: DailyBookingsReponse = await resp.json();
  return data.result ?? [];
}
