import httpStatus from "http-status";
import { Types } from "mongoose";
import QueryBuilder from "../../builders/QueryBuilder";
import AppError from "../../errors/AppError";
import type { ActiveRole } from "../auth/user/user.interface";
import { User } from "../auth/user/user.model";
import { Product } from "../product/product.model";
import { ShippingAddressModel } from "../shippingAddress/shippingAddress.model";
import type { Order, OrderStatus } from "./order.interface";
import { OrderModel } from "./order.model";

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
    method: Order["payment"]["method"];
    transactionId?: string;
  };
  shippingAddressId?: string;
  shippingAddress?: InlineShippingPayload;
};

const roundMoney = (n: number) => Math.round(n * 100) / 100;

const snapshotFromShippingAddressDoc = (doc: {
  fullName: string;
  phone: string;
  addressLine: string;
  city: string;
  country: string;
  state?: string;
  postalCode?: string;
}): Order["shippingAddress"] => ({
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
): Promise<{
  snapshot: Order["shippingAddress"];
  shippingAddressId?: Types.ObjectId;
}> => {
  if (shippingAddressId) {
    const doc = await ShippingAddressModel.findOne({
      _id: shippingAddressId,
      userId: new Types.ObjectId(userId),
    }).lean();

    if (!doc) {
      throw new AppError("Shipping address not found", httpStatus.NOT_FOUND);
    }

    return {
      shippingAddressId: new Types.ObjectId(shippingAddressId),
      snapshot: snapshotFromShippingAddressDoc(doc),
    };
  }

  if (!inline) {
    throw new AppError("Shipping address is required", httpStatus.BAD_REQUEST);
  }

  return {
    snapshot: snapshotFromShippingAddressDoc(inline),
  };
};

const createOrderIntoDB = async (payload: CreateOrderPayload) => {
  const userOid = new Types.ObjectId(payload.userId);
  const lines: Order["items"] = [];
  let totalAmount = 0;
  const sellerIds = new Set<string>();

  for (const line of payload.items) {
    const product = await Product.findById(line.productId).lean();
    if (!product) {
      throw new AppError(
        `Product not found: ${line.productId}`,
        httpStatus.NOT_FOUND,
      );
    }
    sellerIds.add(String(product.userId));
    if (String(product.userId) === String(payload.userId)) {
      throw new AppError(
        `You cannot order your own product: ${product.productName}`,
        httpStatus.FORBIDDEN,
      );
    }
    if (product.status !== "active") {
      throw new AppError(
        `Product is not available: ${product.productName}`,
        httpStatus.BAD_REQUEST,
      );
    }

    const qty = line.quantity;
    if (typeof product.stock === "number" && product.stock < qty) {
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
      "Order must contain products from a single exporter",
      httpStatus.BAD_REQUEST,
    );
  }

  totalAmount = roundMoney(totalAmount);

  const payment: Order["payment"] = {
    method: payload.payment.method,
    ...(payload.payment.transactionId?.trim()
      ? { transactionId: payload.payment.transactionId.trim() }
      : {}),
    isVerified: false,
  };

  const { snapshot, shippingAddressId: savedRef } =
    await resolveShippingSnapshot(
      payload.userId,
      payload.shippingAddressId,
      payload.shippingAddress,
    );

  return OrderModel.create({
    userId: userOid,
    ...(savedRef && { shippingAddressId: savedRef }),
    items: lines,
    totalAmount,
    status: "awaiting_exporter_approval" as const,
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
    if (!product || product.status !== "active") {
      throw new AppError(
        "Product on order no longer exists or is not active",
        httpStatus.NOT_FOUND,
      );
    }
    if (String(product.userId) !== String(exporterUserId)) {
      throw new AppError(
        "You are not the seller for this order",
        httpStatus.FORBIDDEN,
      );
    }
  }
};

const assertImporterOwnsOrder = (
  order: { userId: Types.ObjectId },
  importerUserId: string,
) => {
  if (String(order.userId) !== String(importerUserId)) {
    throw new AppError(
      "You are not the buyer for this order",
      httpStatus.FORBIDDEN,
    );
  }
};

const transitionOrderStatusInDB = async (
  orderId: string,
  from: OrderStatus,
  to: OrderStatus,
) => {
  const updated = await OrderModel.findOneAndUpdate(
    { _id: orderId, status: from },
    { $set: { status: to } },
    { returnDocument: "after", runValidators: true },
  ).lean();

  if (!updated) {
    throw new AppError(
      `Invalid order state: expected status "${from}" before "${to}"`,
      httpStatus.BAD_REQUEST,
    );
  }
  return updated;
};

type CancelActorRole = "IMPORTER" | "EXPORTER";

/** Only before confirmed (`awaiting_exporter_approval`); importer or exporter. */
const cancelAwaitingOrderInDB = async (
  orderId: string,
  actorUserId: string,
  activeRole: CancelActorRole,
) => {
  const order = await OrderModel.findById(orderId).lean();
  if (!order) {
    throw new AppError("Order not found", httpStatus.NOT_FOUND);
  }
  if (order.status !== "awaiting_exporter_approval") {
    throw new AppError(
      "Order can only be cancelled before it is confirmed",
      httpStatus.BAD_REQUEST,
    );
  }
  if (activeRole === "IMPORTER") {
    assertImporterOwnsOrder(order, actorUserId);
  } else {
    await assertExporterOwnsAllOrderProducts(order, actorUserId);
  }

  const updated = await OrderModel.findByIdAndUpdate(
    orderId,
    { $set: { status: "cancelled" as const } },
    { returnDocument: "after", runValidators: true },
  ).lean();

  if (!updated) {
    throw new AppError("Order not found", httpStatus.NOT_FOUND);
  }
  return updated;
};

/**
 * Single entrypoint: body `status` is the desired next value.
 * Enforces role, ownership, and one-step workflow (exporter / importer chains + cancel before confirmed).
 */
const updateOrderStatusInDB = async (
  orderId: string,
  actorUserId: string,
  activeRole: ActiveRole,
  nextStatus: OrderStatus,
) => {
  if (activeRole === "ADMIN") {
    throw new AppError("Forbidden", httpStatus.FORBIDDEN);
  }

  const order = await OrderModel.findById(orderId).lean();
  if (!order) {
    throw new AppError("Order not found", httpStatus.NOT_FOUND);
  }

  const current = order.status;
  if (current === nextStatus) {
    throw new AppError("Order already has this status", httpStatus.BAD_REQUEST);
  }

  if (
    current === "cancelled" ||
    current === "completed" ||
    current === "returned"
  ) {
    throw new AppError(
      "This order cannot be updated anymore",
      httpStatus.BAD_REQUEST,
    );
  }

  if (nextStatus === "cancelled") {
    return cancelAwaitingOrderInDB(
      orderId,
      actorUserId,
      activeRole === "IMPORTER" ? "IMPORTER" : "EXPORTER",
    );
  }

  if (activeRole === "EXPORTER") {
    await assertExporterOwnsAllOrderProducts(order, actorUserId);
    if (current === "awaiting_exporter_approval" && nextStatus === "confirmed") {
      return transitionOrderStatusInDB(
        orderId,
        "awaiting_exporter_approval",
        "confirmed",
      );
    }
    if (current === "confirmed" && nextStatus === "processing") {
      return transitionOrderStatusInDB(orderId, "confirmed", "processing");
    }
    if (current === "processing" && nextStatus === "shipped") {
      return transitionOrderStatusInDB(orderId, "processing", "shipped");
    }
    throw new AppError(
      "Exporter cannot set this status from the current order state",
      httpStatus.BAD_REQUEST,
    );
  }

  assertImporterOwnsOrder(order, actorUserId);
  if (current === "shipped" && nextStatus === "received") {
    return transitionOrderStatusInDB(orderId, "shipped", "received");
  }
  if (current === "received" && nextStatus === "cheking") {
    return transitionOrderStatusInDB(orderId, "received", "cheking");
  }
  if (current === "cheking" && nextStatus === "completed") {
    return transitionOrderStatusInDB(orderId, "cheking", "completed");
  }
  if (current === "cheking" && nextStatus === "returned") {
    return transitionOrderStatusInDB(orderId, "cheking", "returned");
  }
  throw new AppError(
    "Importer cannot set this status from the current order state",
    httpStatus.BAD_REQUEST,
  );
};

const escapeRegexChars = (s: string) =>
  s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const parseOptionalObjectId = (
  value: unknown,
): Types.ObjectId | undefined => {
  if (typeof value !== "string") return undefined;
  const t = value.trim();
  if (!Types.ObjectId.isValid(t)) return undefined;
  return new Types.ObjectId(t);
};

const parseOptionalTrimmedString = (value: unknown): string | undefined => {
  if (typeof value !== "string") return undefined;
  const t = value.trim();
  return t.length > 0 ? t : undefined;
};

/** Only pagination/sort/field projection — never pass raw `req.query` into QueryBuilder.filter (unsafe). */
const pickOrderListPaginationQuery = (
  query: Record<string, unknown>,
): Record<string, unknown> => ({
  ...(query.sort !== undefined && { sort: query.sort }),
  ...(query.page !== undefined && { page: query.page }),
  ...(query.limit !== undefined && { limit: query.limit }),
  ...(query.fields !== undefined && { fields: query.fields }),
});

const emptyOrdersPageMeta = async (query: Record<string, unknown>) => {
  const paginationQuery = pickOrderListPaginationQuery(query);
  const qb = new QueryBuilder(OrderModel.find({ _id: null }), paginationQuery)
    .sort()
    .paginate({ defaultLimit: 10, maxLimit: 100 });
  const meta = await qb.countTotal();
  return { data: [] as Record<string, unknown>[], meta };
};

export type OrderListMeta = Awaited<
  ReturnType<QueryBuilder<unknown>["countTotal"]>
>;

/** Importer: my purchases + optional seller/product filters. Exporter: my sales + optional buyer/product filters. */
const getOrdersForCurrentUserFromDB = async (
  viewerUserId: string,
  activeRole: ActiveRole,
  query: Record<string, unknown>,
): Promise<{ data: Record<string, unknown>[]; meta: OrderListMeta }> => {
  if (activeRole === "ADMIN") {
    throw new AppError("Forbidden", httpStatus.FORBIDDEN);
  }

  const userOid = new Types.ObjectId(viewerUserId);
  const paginationQuery = pickOrderListPaginationQuery(query);

  const productIdFilter = parseOptionalObjectId(query.productId);
  const productNameFilter = parseOptionalTrimmedString(query.productName);
  const userIdFilter = parseOptionalObjectId(query.userId);
  const userNameFilter = parseOptionalTrimmedString(query.userName);

  const andParts: Record<string, unknown>[] = [];

  if (activeRole === "IMPORTER") {
    andParts.push({ userId: userOid });
  } else {
    const exporterProductIds = await Product.find({ userId: userOid })
      .distinct("_id")
      .exec();
    if (exporterProductIds.length === 0) {
      return emptyOrdersPageMeta(query);
    }
    andParts.push({ "items.productId": { $in: exporterProductIds } });
  }

  if (productIdFilter) {
    andParts.push({ "items.productId": productIdFilter });
  }

  if (productNameFilter) {
    const nameRx = new RegExp(escapeRegexChars(productNameFilter), "i");
    const productScope =
      activeRole === "EXPORTER"
        ? { userId: userOid, productName: nameRx }
        : { productName: nameRx };
    const matchingIds = await Product.find(productScope).distinct("_id").exec();
    if (matchingIds.length === 0) {
      return emptyOrdersPageMeta(query);
    }
    andParts.push({ "items.productId": { $in: matchingIds } });
  }

  if (userIdFilter) {
    if (activeRole === "EXPORTER") {
      andParts.push({ userId: userIdFilter });
    } else {
      const sellerProducts = await Product.find({ userId: userIdFilter })
        .distinct("_id")
        .exec();
      if (sellerProducts.length === 0) {
        return emptyOrdersPageMeta(query);
      }
      andParts.push({ "items.productId": { $in: sellerProducts } });
    }
  }

  if (userNameFilter) {
    const nameRx = new RegExp(escapeRegexChars(userNameFilter), "i");
    const matchedUsers = await User.find({ name: nameRx }).select("_id").lean();
    const matchedUserIds = matchedUsers.map((u) => u._id);
    if (matchedUserIds.length === 0) {
      return emptyOrdersPageMeta(query);
    }
    if (activeRole === "EXPORTER") {
      andParts.push({ userId: { $in: matchedUserIds } });
    } else {
      const prods = await Product.find({
        userId: { $in: matchedUserIds },
      })
        .distinct("_id")
        .exec();
      if (prods.length === 0) {
        return emptyOrdersPageMeta(query);
      }
      andParts.push({ "items.productId": { $in: prods } });
    }
  }

  const matchFilter: Record<string, unknown> =
    andParts.length === 1 ? andParts[0]! : { $and: andParts };

  const orderQB = new QueryBuilder(OrderModel.find(matchFilter), paginationQuery)
    .sort()
    .paginate({ defaultLimit: 10, maxLimit: 100 })
    .fields("-__v");

  const meta = await orderQB.countTotal();
  const data = (await orderQB.modelQuery.lean()) as Record<string, unknown>[];

  return { data, meta };
};

export const OrderService = {
  createOrderIntoDB,
  updateOrderStatusInDB,
  getOrdersForCurrentUserFromDB,
};
