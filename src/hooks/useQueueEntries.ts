import { openmrsFetch, restBaseUrl } from "@openmrs/esm-framework";
import useSWR from 'swr';
import { useSWRConfig } from 'swr/_internal';
import { type QueueEntryResponse } from "../types/types";
import { useMemo } from "react";

export function useMutateQueueEntries() {
    const { mutate } = useSWRConfig();

    return {
        mutateQueueEntries: () => {
            return mutate((key) => {
                return (
                    typeof key === 'string' &&
                    (key.includes(`${restBaseUrl}/queue-entry`) || key.includes(`${restBaseUrl}/visit-queue-entry`))
                );
            }).then(() => {
                window.dispatchEvent(new CustomEvent('queue-entry-updated'));
            });
        },
    };
}

export function useQueueEntries() {
    const queueEntryBaseUrl = `${restBaseUrl}/queue-entry?` +
    `isEnded=false&service=7f7ec7ad-cdd7-4ed9-bc2e-5c5bd9f065b2&location=18c343eb-b353-462a-9139-b16606e6b6c2`;
    const { data, isValidating, isLoading, error: pageError } = useSWR<QueueEntryResponse, Error>(queueEntryBaseUrl, openmrsFetch);

    const queueEntries = useMemo(() => data, [data]);

    return {
        queueEntries,
        isLoading
    }
}