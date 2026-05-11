import { Types } from 'mongoose';

export interface ShippingAddress {
  userId: Types.ObjectId;
  fullName: string;
  phone: string;
  addressLine: string;
  city: string;
  state?: string;
  postalCode?: string;
  country: string;
  isDefault?: boolean;
}
