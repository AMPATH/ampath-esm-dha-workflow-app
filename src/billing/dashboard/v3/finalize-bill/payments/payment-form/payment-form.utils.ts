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

const normalize = (value?: string) => value?.trim().toLowerCase();

/** Resolve the line item's price UUID/name to the payment mode stored on its service or drug price. */
export function resolveLineItemPaymentModes(
  lineItems: LineItem[] = [],
  billableServices: BillableService[] = [],
): LineItem[] {
  return lineItems.map((item) => {
    const isDrug = Boolean(item.billableDrugObj || item.billableDrug?.trim());
    const service = isDrug
      ? undefined
      : billableServices.find(
          (service) =>
            service.uuid === item.billableService ||
            normalize(service.name) === normalize(item.billableService) ||
            normalize(service.display) === normalize(item.billableService) ||
            normalize(service.shortName) === normalize(item.billableService),
        );
    const prices = isDrug ? item.billableDrugObj?.drugPrices ?? [] : service?.servicePrices ?? [];
    const price = prices.find(
      (price) =>
        price.uuid === item.priceUuid ||
        price.paymentMode?.uuid === item.priceUuid ||
        normalize(price.name) === normalize(item.priceName) ||
        normalize(price.paymentMode?.name) === normalize(item.priceName),
    );
    const fallbackServicePrice =
      !isDrug && !price && item.priceName
        ? billableServices
        .flatMap((service) => service.servicePrices ?? [])
        .find((servicePrice) => normalize(servicePrice.paymentMode?.name) === normalize(item.priceName))
        : undefined;
    const resolvedPaymentMode = price?.paymentMode ?? fallbackServicePrice?.paymentMode;
    const paymentModeUuid = item.paymentModeUuid || resolvedPaymentMode?.uuid || '';
    const paymentModeName = item.paymentModeName || resolvedPaymentMode?.name || item.priceName || '';

    return {
      ...item,
      paymentModeUuid,
      paymentModeName,
      ...(price?.price != null ? { price: price.price } : {}),
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
