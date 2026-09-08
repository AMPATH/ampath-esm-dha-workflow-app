import { openmrsFetch, OpenmrsResource, restBaseUrl, useSession } from "@openmrs/esm-framework";
import { useState } from "react";
import useSWR from 'swr';
import {
    BILLABLE_SERVICE_PICKER_REPRESENTATION,
    buildBillableServiceUrl,
    useBillableServiceLocationUuid,
} from "../../../shared/services/billable-service.resource";
import { getHieBaseUrl } from "../../../shared/utils/get-base-url";
import { postJson } from "../../../registry/registry.resource";
import dayjs from "dayjs";

/**
 * Billable items for the session facility. Pass `locationUuid: null` in
 * `options` only when the server-wide catalog is genuinely wanted.
 */
export const useBillableItems = (
    serviceTypeUuid: string = "",
    options: { locationUuid?: string | null } = {},
) => {
    const sessionLocationUuid = useBillableServiceLocationUuid();
    const locationUuid = options.locationUuid === undefined ? sessionLocationUuid : options.locationUuid;
    const url = buildBillableServiceUrl({ v: BILLABLE_SERVICE_PICKER_REPRESENTATION, locationUuid });
    const { data, isLoading, error } = useSWR<{ data: { results: Array<OpenmrsResource> } }>(url, openmrsFetch);
    const [searchTerm, setSearchTerm] = useState('');
    let filteredItems =
        data?.data?.results?.filter((item) => item.name.toLowerCase().includes(searchTerm.toLowerCase())) ?? [];

    if (serviceTypeUuid) {
        filteredItems = filteredItems?.filter(item => item?.serviceType?.uuid === serviceTypeUuid);
    }

    return {
        lineItems: filteredItems,
        isLoading,
        error,
        searchTerm,
        setSearchTerm,
    };
};

export const usePatientBills = (patientUuid: string, billStatus: string = 'PENDING') => {
    const url = `${restBaseUrl}/billing/bill?patientUuid=${patientUuid}&status=${billStatus}&v=custom:(uuid,lineItems,cashPoint,dateCreated)`;

    const {
        data,
        error,
        isLoading,
        isValidating,
        mutate: mutated,
    } = useSWR<{ data: { results: Array<OpenmrsResource> } }>(url, openmrsFetch, {
        errorRetryCount: 2,
    });

    const results = data?.data?.results ?? [];

    const today = dayjs().startOf('day');

    const currentDayBills = results.filter((bill) => {
        const billDate = dayjs(bill?.dateCreated).startOf('day');
        return billDate.isSame(today);
    });

    return {
        currentDayBills,
        error,
        isLoading,
        isValidating,
        mutated,
    };
};

export const useActiveVisitBills = (visitUuid: string | null | undefined) => {
    const representation =
        'custom:(uuid,status,patient:(uuid),lineItems)';
    const url = visitUuid ? `${restBaseUrl}/billing/bill?visitUuid=${visitUuid}&v=${representation}` : null;

    const { data, error, isLoading, isValidating } = useSWR<{
        data: {
            results: Array<OpenmrsResource>;
        };
    }>(url, openmrsFetch, {
        keepPreviousData: true,
    });

    return {
        currentDayBills: data?.data?.results,
        error,
        isLoading,
        isValidating
    };
};

export const useCashPoint = () => {
    const sessionLocation = useSession();
    const customRepresentation = "custom:(uuid,name,description,location:(uuid,display))";
    const url = `/ws/rest/v1/billing/cashPoint?v=${customRepresentation}`;
    const { data, isLoading, error } = useSWR<{ data: { results: Array<OpenmrsResource> } }>(url, openmrsFetch);

    let cashPoints = data?.data?.results;

    if (cashPoints) {
        cashPoints = cashPoints?.filter(cp => cp?.location?.uuid === sessionLocation?.sessionLocation?.uuid);
    }

    return { isLoading, error, cashPoints: cashPoints ?? [] };
};

export const createPatientBill = (payload) => {
    const postUrl = `${restBaseUrl}/billing/bill`;
    return openmrsFetch<{ uuid: string, lineItems: Array<{ lineItemOrder: number; uuid: string }> }>(postUrl, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: payload });
};

export const createBillLineItem = (billUuid: string, payload: { quantity: Number, priceUuid: string }) => {
    const postUrl = `${restBaseUrl}/billing/bill/${billUuid}/lineItem`;
    return openmrsFetch<{ uuid: string, lineItems: Array<{ lineItemOrder: number; uuid: string }> }>(postUrl, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: payload });
};

export const updatePatientBill = (billUuid: string, payload) => {
    const postUrl = `${restBaseUrl}/billing/bill/${billUuid}`;
    return openmrsFetch<{ uuid: string, lineItems: Array<{ lineItemOrder: number; uuid: string }> }>(postUrl, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: payload });
};

export const removePatientBill = (uuid) => {
    const purgeUrl = `${restBaseUrl}/billing/bill/${uuid}?purge=true`;
    return openmrsFetch<{ uuid: string }>(purgeUrl, { method: 'DELETE' });
};

export const createOrderBillInHie = async (payload) => {
    const hieBaseUrl = await getHieBaseUrl();
    const url = `${hieBaseUrl}/bill-order`;
    return postJson<{ bill_uuid: string }>(url, payload);
}

export const usePatientIdentifiers = (patientUuid: string) => {
    const customRepresentation = `custom:(identifiers:(identifier,identifierType:(uuid,display)))`;
    const url = `/ws/rest/v1/patient/${patientUuid}?v=${customRepresentation}`;
    const { data, isLoading, error } = useSWR<{
        data: {
            identifiers: Array<{
                identifier: string,
                identifierType: {
                    uuid: string,
                    display: string
                }
            }>
        }
    }>(url, openmrsFetch);

    return { isLoading, error, identifiers: data?.data?.identifiers };
};

export const useLocationAttributes = () => {
    const { sessionLocation } = useSession();
    const locationUuid = sessionLocation?.uuid;
    const customRepresentation = `custom:(attributes)`;
    const url = `/ws/rest/v1/location/${locationUuid}?v=${customRepresentation}`;
    const { data, isLoading, error } = useSWR<{
        data: {
            attributes: Array<{
                attributeType: {
                    uuid: string
                },
                value: string
            }>
        }
    }>(url, openmrsFetch);

    return { isLoadingLocationAttributes: isLoading, error, locationAttributes: data?.data?.attributes };
};
