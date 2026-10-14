interface Product {
    id: number;
    name: string;
    default_code: string;
}

interface Lot {
    id: number;
    name: string;
    quantity: number;
    expiration_date: string;
    product_id: number;
    product_name: string;
    default_code: string;
}

interface Warehouse {
    id: number;
    name: string;
}

interface Uom {
    id: number;
    name: string;
}

export interface DrugBatch {
    openmrs_drug_uuid: string;
    order_location_uuid: string;
    product_id: number;
    product_name: string;
    products: Product[];
    warehouse: Warehouse;
    uom: Uom;
    lots: Lot[];
}

export interface DrugFormulation {
    uuid: string;
    display: string;
    dosageForm: {
        uuid: string;
        display: string;
    },
    concept: {
        uuid: string;
        display: string;
    }
}