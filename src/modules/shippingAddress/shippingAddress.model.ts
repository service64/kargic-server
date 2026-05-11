import { Schema, model } from 'mongoose';
import type { ShippingAddress } from './shippingAddress.interface';

const shippingAddressSchema = new Schema<ShippingAddress>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    fullName: { type: String, required: true, trim: true },
    phone: { type: String, required: true, trim: true },
    addressLine: { type: String, required: true, trim: true },
    city: { type: String, required: true, trim: true },
    state: { type: String, trim: true },
    postalCode: { type: String, trim: true },
    country: { type: String, required: true, trim: true },
    isDefault: { type: Boolean, default: false },
  },
  { timestamps: true },
);

shippingAddressSchema.index({ userId: 1, isDefault: 1 });

export const ShippingAddressModel = model<ShippingAddress>(
  'ShippingAddress',
  shippingAddressSchema,
);
