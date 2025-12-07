import { useSession, type Visit, openmrsFetch, restBaseUrl } from '@openmrs/esm-framework';
import dayjs from 'dayjs';
import useSWR from 'swr';

// export function useActiveVisits() {
//   const currentUserSession = useSession();
//   const startDate = dayjs().format('YYYY-MM-DD');
//   const sessionLocation = currentUserSession?.sessionLocation?.uuid;

//   const customRepresentation =
//     'custom:(uuid,patient:(uuid,identifiers:(identifier,uuid),person:(age,display,gender,uuid)),' +
//     'visitType:(uuid,name,display),location:(uuid,name,display),startDatetime,' +
//     'stopDatetime)&fromStartDate=' +
//     startDate +
//     '&location=' +
//     sessionLocation;
//   const url = `${restBaseUrl}/visit?includeInactive=false&v=${customRepresentation}`;
//   const { data, error, isLoading, isValidating } = useSWR<{ data: { results: Array<Visit> } }, Error>(
//     sessionLocation ? url : null,
//     openmrsFetch,
//   );

//   // Create a Set to store unique patient UUIDs
//   const uniquePatientUUIDs = new Set();

//   data?.data?.results.forEach((visit) => {
//     const patientUUID = visit.patient?.uuid;
//     const isToday = dayjs(visit.startDatetime).isToday();
//     if (patientUUID && isToday) {
//       uniquePatientUUIDs.add(patientUUID);
//     }
//   });

//   return {
//     activeVisitsCount: uniquePatientUUIDs.size,
//     isLoading,
//     error,
//     isValidating,
//   };
// }

// Statuses: Waiting, Finished Service, In Service
export function useServiceMetricsCount(status: string = 'Waiting', service: string = "7f7ec7ad-cdd7-4ed9-bc2e-5c5bd9f065b2") {
  const currentUserSession = useSession();
  const location = currentUserSession?.sessionLocation?.uuid;

  const apiUrl =
    `${restBaseUrl}/queue-entry-metrics?status=${status}&isEnded=false` +
    (service ? `&service=${service}` : '') +
    (location ? `&location=${location}` : '');

  const { data, isLoading } = useSWR<
    {
      data: {
        count: number;
      };
    },
    Error
  >(service ? apiUrl : null, openmrsFetch);

  return {
    serviceCount: data ? data?.data?.count : 0,
    isLoading
  };
}
