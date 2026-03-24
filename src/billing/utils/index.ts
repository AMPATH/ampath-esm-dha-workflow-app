import { OpenmrsResource } from "@openmrs/esm-framework";

export function generateUpdateBillLineItems(pendingBill, billableItems: Array<OpenmrsResource>) {
    const lineItems = pendingBill.lineItems;
    const updateLineItems = lineItems.map((l) => {
        const billableService = billableItems.find(b => b?.name?.toUpperCase() === l?.billableService?.toUpperCase());
        const servicePrice = billableService?.servicePrices?.find(s => s?.name?.toUpperCase() === l.priceName.toUpperCase())
        return {
            ...l,
            billableService: billableService ? billableService.uuid : l.billableService,
            price: billableService ? servicePrice?.price : l.price,
            priceName: billableService ? servicePrice?.paymentMode?.name : l.priceName,
            priceUuid: billableService ? servicePrice?.paymentMode?.uuid : l.priceUuid,
        };
    });
    return updateLineItems;
}