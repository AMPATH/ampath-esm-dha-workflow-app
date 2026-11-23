import { OpenmrsResource } from "@openmrs/esm-framework";

export const BillStatus = {
  PENDING: 'PENDING',
  POSTED: 'POSTED',
  PAID: 'PAID'
} as const;

export type BillStatus = (typeof BillStatus)[keyof typeof BillStatus];

export type PaymentRequestPayload = {
  instanceType: string;
  amountTendered: number;
  amount: number;
};

export interface MappedBill {
  uuid: string;
  id: number;
  patientUuid: string;
  patientName: string;
  cashPointUuid: string;
  cashPointName: string;
  cashPointLocation: string;
  cashier: Provider;
  receiptNumber: string;
  status: BillStatus;
  identifier: string;
  dateCreated: string;
  lineItems: Array<LineItem>;
  billingService: string;
  payments: Array<Payment>;
  discounts?: Array<BillDiscount>;
  refunds?: Array<BillRefund>;
  totalAmount?: number;
  netAmount: number;
  tenderedAmount?: number;
  display?: string;
  visitUuid?: string;
}

export interface PatientInvoice {
  uuid: string;
  display: string;
  voided: boolean;
  voidReason: string | null;
  adjustedBy: Array<OpenmrsResource>;
  billAdjusted: OpenmrsResource | null;
  cashPoint: CashPoint;
  cashier: Provider;
  dateCreated: string;
  lineItems: LineItem[];
  patient: Patient;
  payments: Payment[];
  receiptNumber: string;
  status: string;
  adjustmentReason: string | null;
  id: number;
  visit?: { uuid: string; display: string };
  resourceVersion: string;
  total: number;
  amountAfterDiscount: number;
  discounts: BillDiscount[];
  refunds: BillRefund[];
}

interface CashPoint {
  uuid: string;
  name: string;
  description: string;
  retired: boolean;
  location: Location;
}

interface Location {
  uuid: string;
  display: string;
  links: LocationLink[];
}

interface LocationLink {
  rel: string;
  uri: string;
  resourceAlias: string;
}

interface Provider {
  uuid: string;
  display: string;
  links: ProviderLink[];
}

interface ProviderLink {
  rel: string;
  uri: string;
  resourceAlias: string;
}

export interface LineItem {
  uuid?: string;
  item?: string;
  status: BillLineItemStatus;
  billableService?: string;
  billableDrug?: string;
  billableDrugObj?: {
    uuid: string;
    name?: string;
    display?: string;
    drugPrices?: Array<{
      uuid: string;
      name?: string;
      price?: number;
      paymentMode?: { uuid: string; name: string };
    }>;
  } | null;
  quantity: number;
  price: number;
  priceName?: string;
  priceUuid?: string;
  paymentModeUuid?: string;
  paymentModeName?: string;
  lineItemOrder?: number;
  resourceVersion?: string;
  display?: string;
  voided?: boolean;
  voidReason?: string | null;
}

export const BillLineItemStatus = {
  PENDING: 'PENDING',
  PAID: 'PAID',
  CANCELLED: 'CANCELLED',
  ADJUSTED: 'ADJUSTED',
  EXEMPTED: 'EXEMPTED',
  REFUND_REQUESTED: 'REFUND_REQUESTED',
  REFUNDED: 'REFUNDED',
  PARTIALLY_REFUNDED: 'PARTIALLY_REFUNDED',
} as const;

export type BillLineItemStatus = (typeof BillLineItemStatus)[keyof typeof BillLineItemStatus];

interface Patient {
  uuid: string;
  display: string;
  links: PatientLink[];
}

interface PatientLink {
  rel: string;
  uri: string;
  resourceAlias: string;
}

export interface Payment {
  uuid: string;
  instanceType: PaymentInstanceType;
  attributes: Attribute[];
  amount: number;
  amountTendered: number;
  dateCreated: number;
  voided: boolean;
  resourceVersion: string;
}

interface PaymentInstanceType {
  uuid: string;
  name: string;
  description: string;
  retired: boolean;
}

interface Attribute {
  uuid: string;
  display: string;
  voided: boolean;
  voidReason: string | null;
  value: string;
  attributeType: AttributeType;
  order: number;
  valueName: string;
  resourceVersion: string;
}

interface AttributeType {
  uuid: string;
  name: string;
  description: string;
  retired: boolean;
  attributeOrder: number;
  format: string;
  foreignKey: string | null;
  regExp: string | null;
  required: boolean;
}

export interface BillDiscount {
  uuid: string;
  billUuid: string;
  lineItemUuid: string | null;
  discountType: BillDiscountType;
  discountValue: number;
  discountAmount: number;
  justification: string;
  initiator: UserRef;
  approver: UserRef | null;
  dateCreated: string;
  status: BillDiscountStatus;
  voided: boolean;
}

export const BillDiscountStatus = {
  PENDING: 'PENDING',
  APPROVED: 'APPROVED',
  REJECTED: 'REJECTED',
} as const;

export type BillDiscountStatus = (typeof BillDiscountStatus)[keyof typeof BillDiscountStatus];

export const BillDiscountType = {
  PERCENTAGE: 'PERCENTAGE',
  FIXED_AMOUNT: 'FIXED_AMOUNT',
} as const;

export type BillDiscountType = (typeof BillDiscountType)[keyof typeof BillDiscountType];

export interface BillRefund {
  uuid: string;
  billUuid: string;
  lineItemUuid: string | null;
  refundAmount: number;
  reason: string;
  initiator: UserRef;
  approver: UserRef | null;
  completer: UserRef | null;
  dateApproved: string | null;
  dateCompleted: string | null;
  dateCreated: string;
  status: RefundStatus;
  voided: boolean;
}

export interface UserRef {
  uuid: string;
  display: string;
}

export const RefundStatus = {
  REQUESTED: 'REQUESTED',
  APPROVED: 'APPROVED',
  REJECTED: 'REJECTED',
  COMPLETED: 'COMPLETED',
} as const;
export type RefundStatus = (typeof RefundStatus)[keyof typeof RefundStatus];

export interface PatientDetails {
  name: string;
  birthDate: string;
  gender: string;
  address: string;
}