import httpStatus from 'http-status';
import { Types } from 'mongoose';
import AppError from '../../errors/AppError';
import { Product } from '../product/product.model';
import { ShippingAddressModel } from '../shippingAddress/shippingAddress.model';
import type { Order } from './order.interface';
import { OrderModel } from './order.model';

type CreateOrderBodyItem = {
  productId: string;
  quantity: number;
  unitPrice: number;
};

type InlineShippingPayload = {
  fullName: string;
  phone: string;
  addressLine: string;
  city: string;
  country: string;
  state?: string;
  postalCode?: string;
};

type CreateOrderPayload = {
  userId: string;
  items: CreateOrderBodyItem[];
  payment: {
    method: Order['payment']['method'];
    transactionId?: string;
  };
  shippingAddressId?: string;
  shippingAddress?: InlineShippingPayload;
};

const roundMoney = (n: number) => Math.round(n * 100) / 100;

const snapshotFromShippingAddressDoc = (
  doc: {
    fullName: string;
    phone: string;
    addressLine: string;
    city: string;
    country: string;
    state?: string;
    postalCode?: string;
  },
): Order['shippingAddress'] => ({
  fullName: doc.fullName.trim(),
  phone: doc.phone.trim(),
  addressLine: doc.addressLine.trim(),
  city: doc.city.trim(),
  country: doc.country.trim(),
  ...(doc.state?.trim() ? { state: doc.state.trim() } : {}),
  ...(doc.postalCode?.trim() ? { postalCode: doc.postalCode.trim() } : {}),
});

const resolveShippingSnapshot = async (
  userId: string,
  shippingAddressId: string | undefined,
  inline: InlineShippingPayload | undefined,
): Promise<{ snapshot: Order['shippingAddress']; shippingAddressId?: Types.ObjectId }> => {
  if (shippingAddressId) {
    const doc = await ShippingAddressModel.findOne({
      _id: shippingAddressId,
      userId: new Types.ObjectId(userId),
    }).lean();

    if (!doc) {
      throw new AppError('Shipping address not found', httpStatus.NOT_FOUND);
    }

    return {
      shippingAddressId: new Types.ObjectId(shippingAddressId),
      snapshot: snapshotFromShippingAddressDoc(doc),
    };
  }

  if (!inline) {
    throw new AppError('Shipping address is required', httpStatus.BAD_REQUEST);
  }

  return {
    snapshot: snapshotFromShippingAddressDoc(inline),
  };
};

const createOrderIntoDB = async (payload: CreateOrderPayload) => {
  const userOid = new Types.ObjectId(payload.userId);
  const lines: Order['items'] = [];
  let totalAmount = 0;
  const sellerIds = new Set<string>();

  for (const line of payload.items) {
    const product = await Product.findById(line.productId).lean();
    if (!product) {
      throw new AppError(`Product not found: ${line.productId}`, httpStatus.NOT_FOUND);
    }
    sellerIds.add(String(product.userId));
    if (String(product.userId) === String(payload.userId)) {
      throw new AppError(
        `You cannot order your own product: ${product.productName}`,
        httpStatus.FORBIDDEN,
      );
    }
    if (product.status !== 'active') {
      throw new AppError(
        `Product is not available: ${product.productName}`,
        httpStatus.BAD_REQUEST,
      );
    }

    const qty = line.quantity;
    if (typeof product.stock === 'number' && product.stock < qty) {
      throw new AppError(
        `Insufficient stock for "${product.productName}"`,
        httpStatus.CONFLICT,
      );
    }

    const unit = roundMoney(line.unitPrice);
    totalAmount += unit * qty;

    lines.push({
      productId: new Types.ObjectId(line.productId),
      quantity: qty,
      unitPrice: unit,
    });
  }

  if (sellerIds.size > 1) {
    throw new AppError(
      'Order must contain products from a single exporter',
      httpStatus.BAD_REQUEST,
    );
  }

  totalAmount = roundMoney(totalAmount);

  const payment: Order['payment'] = {
    method: payload.payment.method,
    ...(payload.payment.transactionId?.trim()
      ? { transactionId: payload.payment.transactionId.trim() }
      : {}),
    isVerified: false,
  };

  const { snapshot, shippingAddressId: savedRef } = await resolveShippingSnapshot(
    payload.userId,
    payload.shippingAddressId,
    payload.shippingAddress,
  );

  return OrderModel.create({
    userId: userOid,
    ...(savedRef && { shippingAddressId: savedRef }),
    items: lines,
    totalAmount,
    status: 'awaiting_exporter_approval' as const,
    payment,
    shippingAddress: snapshot,
  });
};

const assertExporterOwnsAllOrderProducts = async (
  order: { items: Array<{ productId: Types.ObjectId }> },
  exporterUserId: string,
) => {
  for (const item of order.items) {
    const product = await Product.findById(item.productId).lean();
    if (!product) {
      throw new AppError('Product on order no longer exists', httpStatus.NOT_FOUND);
    }
    if (String(product.userId) !== String(exporterUserId)) {
      throw new AppError('You are not the seller for this order', httpStatus.FORBIDDEN);
    }
  }
};

const approveOrderByExporterInDB = async (orderId: string, exporterUserId: string) => {
  const order = await OrderModel.findById(orderId).lean();
  if (!order) {
    throw new AppError('Order not found', httpStatus.NOT_FOUND);
  }
  if (order.status !== 'awaiting_exporter_approval') {
    throw new AppError('Order is not awaiting exporter approval', httpStatus.BAD_REQUEST);
  }
  await assertExporterOwnsAllOrderProducts(order, exporterUserId);

  const updated = await OrderModel.findByIdAndUpdate(
    orderId,
    { $set: { status: 'processing' as const } },
    { returnDocument: 'after', runValidators: true },
  ).lean();

  if (!updated) {
    throw new AppError('Order not found', httpStatus.NOT_FOUND);
  }
  return updated;
};

const rejectOrderByExporterInDB = async (orderId: string, exporterUserId: string) => {
  const order = await OrderModel.findById(orderId).lean();
  if (!order) {
    throw new AppError('Order not found', httpStatus.NOT_FOUND);
  }
  if (order.status !== 'awaiting_exporter_approval') {
    throw new AppError('Order is not awaiting exporter approval', httpStatus.BAD_REQUEST);
  }
  await assertExporterOwnsAllOrderProducts(order, exporterUserId);

  const updated = await OrderModel.findByIdAndUpdate(
    orderId,
    { $set: { status: 'cancelled' as const } },
    { returnDocument: 'after', runValidators: true },
  ).lean();

  if (!updated) {
    throw new AppError('Order not found', httpStatus.NOT_FOUND);
  }
  return updated;
};

export const OrderService = {
  createOrderIntoDB,
  approveOrderByExporterInDB,
  rejectOrderByExporterInDB,
};
