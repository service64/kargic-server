import { Schema, model } from 'mongoose';
import type { Order } from './order.interface';

const ORDER_STATUSES: Order['status'][] = [
  'awaiting_exporter_approval',
  'confirmed',
  'processing',
  'shipped',
  'received',
  'cheking',
  'completed',
  'cancelled',
  'returned',
];

const PAYMENT_METHODS: Order['payment']['method'][] = [
  'bkash',
  'nagad',
  'card',
  'cod',
];

const paymentSchema = new Schema<Order['payment']>(
  {
    method: {
      type: String,
      enum: PAYMENT_METHODS,
      required: true,
    },
    transactionId: { type: String, trim: true },
    isVerified: { type: Boolean, required: true, default: false },
  },
  { _id: false },
);

const shippingAddressSchema = new Schema<Order['shippingAddress']>(
  {
    fullName: { type: String, required: true, trim: true },
    phone: { type: String, required: true, trim: true },
    addressLine: { type: String, required: true, trim: true },
    city: { type: String, required: true, trim: true },
    state: { type: String, trim: true },
    postalCode: { type: String, trim: true },
    country: { type: String, required: true, trim: true },
  },
  { _id: false },
);

const orderSchema = new Schema<Order>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    shippingAddressId: {
      type: Schema.Types.ObjectId,
      ref: 'ShippingAddress',
      required: false,
      index: true,
    },
    items: [
      new Schema(
        {
          productId: {
            type: Schema.Types.ObjectId,
            ref: 'Product',
            required: true,
          },
          quantity: { type: Number, required: true, min: 1 },
          unitPrice: { type: Number, required: true, min: 0 },
        },
        { _id: false },
      ),
    ],
    totalAmount: { type: Number, required: true, min: 0 },
    status: {
      type: String,
      enum: ORDER_STATUSES,
      default: 'awaiting_exporter_approval',
    },
    payment: { type: paymentSchema, required: true },
    shippingAddress: { type: shippingAddressSchema, required: true },
    deliveryMinAt: { type: Date },
    deliveryMaxAt: { type: Date },
  },
  { timestamps: true },
);

orderSchema.index({ userId: 1, createdAt: -1 });
orderSchema.index({ status: 1 });

export const OrderModel = model<Order>('Order', orderSchema);
