import useSWR from "swr";
import { useHie } from "../../claims/utils";
import { openmrsFetch } from "@openmrs/esm-framework";
import { type RegistrationBillableService, type RegistrationBillableServiceDto } from "../types";

export const useRegistrationBillableServices = (registrationBillableServiceDto: RegistrationBillableServiceDto) => {
  const { hieBaseUrl } = useHie();
  const url = `${hieBaseUrl}/registration-billable-service?locationUuid=${registrationBillableServiceDto.locationUuid}`;
  const { data, error, isLoading } = useSWR<{ data: Array<RegistrationBillableService> }>(url, openmrsFetch);

  const results = data?.data;

  return {
    registrationBillableServices: results,
    error,
    isLoading: isLoading,
  };
};