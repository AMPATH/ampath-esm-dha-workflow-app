import { type Location } from "@openmrs/esm-framework";

export type AdmissionLocationData = {
    bedLayouts: any[];
    occupiedBeds: number;
    totalBeds: number;
    ward: Location;
};