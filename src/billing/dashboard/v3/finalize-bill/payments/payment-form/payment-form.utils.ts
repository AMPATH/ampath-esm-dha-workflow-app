import { type LineItem, type Payment } from '../../types';
import { type BillableService } from '../../../../../../shared/types';

export interface GroupedLineItemPayment {
  key: string;
  paymentModeUuid: string;
  paymentModeName: string;
  itemCount: number;
  amount: number;
}

const toMinorUnits = (amount: number) => Math.round((Number.isFinite(amount) ? amount : 0) * 100);

const isGroupableLineItem = (item: LineItem) =>
  !item.voided && !['CANCELLED', 'REFUNDED'].includes((item.status ?? '').toUpperCase());

/** Resolve the line item's price UUID/name to the payment mode stored on its service price. */
export function resolveLineItemPaymentModes(
  lineItems: LineItem[] = [],
  billableServices: BillableService[] = [],
): LineItem[] {
  return lineItems.map((item) => {
    const service = billableServices.find(
      (candidate) =>
        candidate.uuid === item.billableService ||
        candidate.name?.trim().toLowerCase() === item.billableService?.trim().toLowerCase(),
    );
    const servicePrices = service?.servicePrices ?? [];
    const servicePrice = servicePrices.find(
      (price) =>
        price.uuid === item.priceUuid ||
        price.name?.trim().toLowerCase() === item.priceName?.trim().toLowerCase() ||
        price.paymentMode?.name?.trim().toLowerCase() === item.priceName?.trim().toLowerCase(),
    );
    const paymentModeUuid = item.paymentModeUuid || servicePrice?.paymentMode?.uuid || '';
    const paymentModeName = item.paymentModeName || servicePrice?.paymentMode?.name || item.priceName || '';

    return {
      ...item,
      paymentModeUuid,
      paymentModeName,
      ...(servicePrice?.price != null ? { price: servicePrice.price } : {}),
    };
  });
}

/** Group all active bill items by the payment mode captured in priceUuid. */
export function groupLineItemsByPaymentMode(
  lineItems: LineItem[] = [],
  payments: Payment[] = [],
): GroupedLineItemPayment[] {
  const groups = new Map<string, GroupedLineItemPayment>();

  for (const item of lineItems.filter(isGroupableLineItem)) {
    const paymentModeUuid = item.paymentModeUuid ?? item.priceUuid ?? '';
    const paymentModeName = item.paymentModeName?.trim() || item.priceName?.trim() || 'Unspecified payment mode';
    const key = paymentModeUuid || `unresolved:${paymentModeName.toLowerCase()}`;
    const current = groups.get(key) ?? {
      key,
      paymentModeUuid,
      paymentModeName,
      itemCount: 0,
      amount: 0,
    };

    current.itemCount += 1;
    current.amount += toMinorUnits((item.price ?? 0) * (item.quantity ?? 0));
    groups.set(key, current);
  }

  const paidByMode = new Map<string, number>();
  for (const payment of payments.filter((item) => !item.voided)) {
    const modeUuid = payment.instanceType?.uuid;
    if (!modeUuid) continue;
    paidByMode.set(
      modeUuid,
      (paidByMode.get(modeUuid) ?? 0) + toMinorUnits(payment.amountTendered ?? payment.amount ?? 0),
    );
  }

  return Array.from(groups.values())
    .map((group) => ({
      ...group,
      amount: Math.max(0, group.amount - (paidByMode.get(group.paymentModeUuid) ?? 0)) / 100,
    }))
    .sort((a, b) => a.paymentModeName.localeCompare(b.paymentModeName));
}
