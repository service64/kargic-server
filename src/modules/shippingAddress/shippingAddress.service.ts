import httpStatus from 'http-status';
import { Types } from 'mongoose';
import AppError from '../../errors/AppError';
import type { ShippingAddress } from './shippingAddress.interface';
import { ShippingAddressModel } from './shippingAddress.model';

type CreatePayload = {
  userId: string;
  fullName: string;
  phone: string;
  addressLine: string;
  city: string;
  country: string;
  state?: string;
  postalCode?: string;
  isDefault?: boolean;
};

const clearOtherDefaults = async (
  userId: Types.ObjectId,
  exceptId?: Types.ObjectId,
) => {
  const filter: Record<string, unknown> = {
    userId,
    isDefault: true,
  };
  if (exceptId) {
    filter._id = { $ne: exceptId };
  }
  await ShippingAddressModel.updateMany(filter, { $set: { isDefault: false } });
};

const createShippingAddressIntoDB = async (payload: CreatePayload) => {
  const userId = new Types.ObjectId(payload.userId);

  if (payload.isDefault) {
    await clearOtherDefaults(userId);
  }

  const doc: ShippingAddress = {
    userId,
    fullName: payload.fullName.trim(),
    phone: payload.phone.trim(),
    addressLine: payload.addressLine.trim(),
    city: payload.city.trim(),
    country: payload.country.trim(),
    isDefault: payload.isDefault ?? false,
  };
  if (payload.state !== undefined) {
    doc.state = payload.state.trim() || undefined;
  }
  if (payload.postalCode !== undefined) {
    doc.postalCode = payload.postalCode.trim() || undefined;
  }

  return ShippingAddressModel.create(doc);
};

const getShippingAddressesByUserFromDB = async (userId: string) => {
  return ShippingAddressModel.find({ userId: new Types.ObjectId(userId) }).sort({
    isDefault: -1,
    createdAt: -1,
  });
};

const getShippingAddressByIdFromDB = async (
  userId: string,
  id: string,
) => {
  const doc = await ShippingAddressModel.findOne({
    _id: id,
    userId: new Types.ObjectId(userId),
  });
  if (!doc) {
    throw new AppError('Shipping address not found', httpStatus.NOT_FOUND);
  }
  return doc;
};

const updateShippingAddressInDB = async (
  userId: string,
  id: string,
  body: Record<string, unknown>,
) => {
  const addr = await ShippingAddressModel.findOne({
    _id: id,
    userId: new Types.ObjectId(userId),
  });
  if (!addr) {
    throw new AppError('Shipping address not found', httpStatus.NOT_FOUND);
  }

  if (body.fullName !== undefined) {
    addr.fullName = String(body.fullName).trim();
  }
  if (body.phone !== undefined) {
    addr.phone = String(body.phone).trim();
  }
  if (body.addressLine !== undefined) {
    addr.addressLine = String(body.addressLine).trim();
  }
  if (body.city !== undefined) {
    addr.city = String(body.city).trim();
  }
  if (body.country !== undefined) {
    addr.country = String(body.country).trim();
  }

  if (body.state === null) {
    addr.state = undefined;
  } else if (body.state !== undefined) {
    addr.state = String(body.state).trim() || undefined;
  }
  if (body.postalCode === null) {
    addr.postalCode = undefined;
  } else if (body.postalCode !== undefined) {
    addr.postalCode = String(body.postalCode).trim() || undefined;
  }

  if (body.isDefault === true) {
    await clearOtherDefaults(addr.userId as Types.ObjectId, addr._id as Types.ObjectId);
    addr.isDefault = true;
  } else if (body.isDefault === false) {
    addr.isDefault = false;
  }

  await addr.save();
  return addr;
};

const deleteShippingAddressFromDB = async (userId: string, id: string) => {
  const deleted = await ShippingAddressModel.findOneAndDelete({
    _id: id,
    userId: new Types.ObjectId(userId),
  });
  if (!deleted) {
    throw new AppError('Shipping address not found', httpStatus.NOT_FOUND);
  }
  return deleted;
};

export const ShippingAddressService = {
  createShippingAddressIntoDB,
  getShippingAddressesByUserFromDB,
  getShippingAddressByIdFromDB,
  updateShippingAddressInDB,
  deleteShippingAddressFromDB,
};
