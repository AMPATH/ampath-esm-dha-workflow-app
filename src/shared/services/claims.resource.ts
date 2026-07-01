import { type Visit } from "@openmrs/esm-framework";
import { type Intervention, type ServiceType, type VisitType } from "../../claims";

export const getConsentToken = (activeVisit: Visit) => {
    const consentToken = activeVisit.attributes?.find(atr => atr?.attributeType?.uuid === "4962a633-c4f8-474c-857c-5c68c72fbbe3")?.value ?? "";
    return consentToken;
}

export const getServiceType = (selectedIntervention: Intervention, visitType?: VisitType): ServiceType => {
    const paymentMechanism = selectedIntervention.paymentMechanism;
    if (paymentMechanism.toUpperCase() === "CAPITATION") {
        return "CAPITATION";
    }
    if (visitType === "OUTPATIENT") {
        return "OUTPATIENT";
    }
    if (visitType === "INPATIENT") {
        return "INPATIENT";
    }
    return "EMERGENCY";
}