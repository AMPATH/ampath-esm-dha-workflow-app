import { Button, InlineLoading } from "@carbon/react";
import React from "react";
import { useTranslation } from "react-i18next";
import { useFormEncounters } from "./death-reporting-form-button.resource";
import { launchWorkspace2, useConfig, usePatient } from "@openmrs/esm-framework";
import { ConfigObject } from "src/config-schema";

interface DeathReportingFormButtonProps {
    patientUuid?: string
}

const DeathReportingFormButton: React.FC<DeathReportingFormButtonProps> = ({ patientUuid: propPatientUuid }) => {
    const { patientUuid, patient } = usePatient(propPatientUuid);
    const { t } = useTranslation();
    const { hasDeceasedObservation, hasDeathReportingFormEncounter, isLoading, isValidating } = useFormEncounters(patientUuid);
    const { formUuids } = useConfig<ConfigObject>();

    const openDeathReportingForm = async () => {
        await launchWorkspace2(
            'admissions-form-entry',
            {
                workspaceTitle: 'Death Reporting Form',
                formUuid: `${formUuids.deathReportingFormUuid}`,
                patientUuid,
            },
            {
                patient,
                patientUuid,
            },
        );
    }

    if (isValidating) {
        return <InlineLoading description="Reloading observations ..." />
    }

    if (isLoading) {
        return <InlineLoading description="Loading observations ..." />
    }

    if (hasDeceasedObservation && !hasDeathReportingFormEncounter) {
        return <Button kind="danger" size="xs" onClick={openDeathReportingForm}>
            {t("fillDeathReportingForm", "Fill death reporting form")}
        </Button>
    } else {
        return null;
    }
}

export default DeathReportingFormButton;