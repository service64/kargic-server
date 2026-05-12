import { Types } from 'mongoose';

export type OrderStatus =
  | 'pending'
  | 'paid'
  | 'processing'
  | 'shipped'
  | 'completed'
  | 'cancelled';

export type PaymentMethod = 'bkash' | 'nagad' | 'card' | 'cod';

export interface OrderPayment {
  method: PaymentMethod;
  transactionId?: string;
  isVerified: boolean;
}

/**
 * Snapshot at checkout — same shape as `ShippingAddress` (without `userId` / `isDefault`).
 * Kept even when `shippingAddressId` is set, so the order shows the address as it was at purchase
 * if the saved profile address is edited later.
 */
export interface OrderShippingAddressSnapshot {
  fullName: string;
  phone: string;
  addressLine: string;
  city: string;
  state?: string;
  postalCode?: string;
  country: string;
}

/** Line item: `productId`, `quantity`, and `unitPrice` are supplied by the client. */
export interface OrderLineItem {
  productId: Types.ObjectId;
  quantity: number;
  unitPrice: number;
}

export interface Order {
  userId: Types.ObjectId;
  /** Optional ref to `ShippingAddress` row used at checkout (audit / “which saved card”). */
  shippingAddressId?: Types.ObjectId;
  items: OrderLineItem[];
  totalAmount: number;
  status: OrderStatus;
  payment: OrderPayment;
  shippingAddress: OrderShippingAddressSnapshot;
}
