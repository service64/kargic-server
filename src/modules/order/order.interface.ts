import { Types } from 'mongoose';

export type OrderStatus =
  | 'awaiting_exporter_approval'
  | 'confirmed' 
  | 'processing'
  | 'shipped'
  | 'received'
  | 'cheking'
  | 'completed'
  | 'cancelled'
  | 'returned';

/** Admin paginated list row (`GET /order/admin`). */
export type AdminOrderListRowDto = {
  orderId: string;
  orderCreatedAt: string;
  productId: string;
  productName: string;
  /** First line item unit price. */
  unitPrice: number;
  totalPrice: number;
  importerName: string;
  exporterName: string;
  deliveryMaxAt: string | null;
  status: OrderStatus;
};

/** Minimal row for `GET /order` — no extra fields are returned. */
export type OrderCardDto = {
  orderId: string;
  status: OrderStatus;
  /** First line item product display name. */
  productTitle: string;
  productImageUrl: string | null;
  /** Order total at checkout. */
  price: number;
  orderPlacedAt: string;
  /** Exporter / seller display name. */
  fromName: string;
  /** Importer / buyer display name. */
  toName: string;
};

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
  /** Optional delivery window (e.g. set when exporter confirms / ships). */
  deliveryMinAt?: Date;
  deliveryMaxAt?: Date;
}
