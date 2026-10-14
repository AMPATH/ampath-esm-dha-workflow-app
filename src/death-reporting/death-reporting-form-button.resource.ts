import { fhirBaseUrl, openmrsFetch, useConfig } from "@openmrs/esm-framework";
import { ConfigObject } from "src/config-schema";
import useSWR from "swr";

interface FHIREntry {
    entry: Array<{
        resource: {
            code: {
                coding: Array<{
                    code: string;
                    display: string;
                }>
            },
            resourceType: string;
            valueCodeableConcept: {
                coding: Array<{
                    code: string;
                    display: string;
                }>
            },
            type: Array<{
                coding: Array<{
                    code: string;
                    display: string;
                }>
            }>
        }
    }>
}

export const useFormEncounters = (patientUuid: string) => {
    const { formEncounterTypes, observationValueCodableConcepts } = useConfig<ConfigObject>();

    const params = {
        patient: patientUuid,
        type: `${formEncounterTypes.clinicalEncounterTypeUuid},${formEncounterTypes.inpatientDischargeEncounterTypeUuid},${formEncounterTypes.deathReportingEncounterTypeUuid}`,
        _count: '100',
        _getpagesoffset: '0',
        _revinclude: "Observation:encounter",
        _sort: "-date"
    };
    const queryString = new URLSearchParams(params).toString();
    const url = patientUuid ? `${fhirBaseUrl}/Encounter?${queryString}` : null;

    const { data, isLoading, error, isValidating } = useSWR<{
        data: FHIREntry
    }>(url, openmrsFetch, {
        keepPreviousData: true
    });

    const encounters = data?.data?.entry?.filter(entry => entry?.resource?.resourceType === "Encounter");
    const observations = data?.data?.entry?.filter(entry => entry?.resource?.resourceType === "Observation");

    const hasDeceasedObservation = observations?.some(obs => obs?.resource?.valueCodeableConcept?.coding?.some(code => code?.code === observationValueCodableConcepts.deceasedUuid));
    const hasDeathReportingFormEncounter = encounters?.some(encounter => encounter?.resource?.type?.some(resourceType => resourceType?.coding?.some(code => code?.code === formEncounterTypes?.deathReportingEncounterTypeUuid)));

    return {
        hasDeceasedObservation,
        hasDeathReportingFormEncounter,
        isLoading,
        error,
        isValidating
    }
}