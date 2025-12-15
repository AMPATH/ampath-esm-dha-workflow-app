import useSWR from 'swr';
import { getEtlBaseUrl } from '../shared/utils/get-base-url';
import { openmrsFetch } from '@openmrs/esm-framework';

export async function useDailyAppontments(locationUuid: string, startDate: string) {
  const etlBaseUrl = await getEtlBaseUrl();
  const dailyAppUrl = `${etlBaseUrl}/daily-appointments/${startDate}?startIndex=0&startDate=${startDate}&locationUuids=${locationUuid}&limit=1000`;
  const { data, error, isLoading } = useSWR(
    dailyAppUrl,
    (url: string) =>
      openmrsFetch<{
        results: Array<any>;
      }>(url).then((res) => res.data.results),
    {
      shouldRetryOnError: false,
    },
  );

  return {
    data: data,
    isLoading,
    isError: error,
  };
}
