import httpStatus from "http-status";
import { Types } from "mongoose";
import QueryBuilder from "../../builders/QueryBuilder";
import AppError from "../../errors/AppError";
import type { ActiveRole } from "../auth/user/user.interface";
import { User } from "../auth/user/user.model";
import { Product } from "../product/product.model";
import { ShippingAddressModel } from "../shippingAddress/shippingAddress.model";
import type {
  AdminOrderListRowDto,
  Order,
  OrderCardDto,
  OrderStatus,
} from "./order.interface";
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

/** Read-only: seller may view past orders even if a line product is inactive. */
const assertExporterOwnsAllOrderProductsForView = async (
  order: { items: Array<{ productId: Types.ObjectId }> },
  exporterUserId: string,
) => {
  for (const item of order.items) {
    const product = await Product.findById(item.productId).lean();
    if (!product) {
      throw new AppError(
        "Product on order no longer exists",
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

/** UTC calendar day bounds for `YYYY-MM-DD` (used by admin order date filter). */
const parseOrderDateUtcRange = (
  value: unknown,
): { $gte: Date; $lt: Date } | undefined => {
  const raw = parseOptionalTrimmedString(value);
  if (!raw) return undefined;
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(raw);
  if (!m) return undefined;
  const y = Number(m[1]);
  const mo = Number(m[2]) - 1;
  const d = Number(m[3]);
  if (!Number.isFinite(y) || mo < 0 || mo > 11 || d < 1 || d > 31) {
    return undefined;
  }
  const start = new Date(Date.UTC(y, mo, d, 0, 0, 0, 0));
  const end = new Date(Date.UTC(y, mo, d + 1, 0, 0, 0, 0));
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
    return undefined;
  }
  return { $gte: start, $lt: end };
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

const extractFirstProductImageUrl = (
  prod: Record<string, unknown> | null,
): string | null => {
  if (!prod) return null;
  const imgs = prod.productImages;
  if (!Array.isArray(imgs) || imgs.length === 0) return null;
  const first = imgs[0];
  if (first && typeof first === "object" && first !== null && "url" in first) {
    const u = (first as { url: unknown }).url;
    return typeof u === "string" && u.length > 0 ? u : null;
  }
  return null;
};

const extractProductTitle = (
  prod: Record<string, unknown> | null,
): string => {
  if (!prod) return "";
  const n = prod.productName;
  return typeof n === "string" ? n.trim() : "";
};

const shapeOrdersToCardDto = async (
  orders: Record<string, unknown>[],
): Promise<OrderCardDto[]> => {
  const sellerIds = new Set<string>();

  type Normalized = {
    raw: Record<string, unknown>;
    prod: Record<string, unknown> | null;
    sellerId?: string;
  };

  const normalized: Normalized[] = [];

  for (const o of orders) {
    const items = (o.items as unknown[]) ?? [];
    const firstItem = items[0];
    let prod: Record<string, unknown> | null = null;
    if (
      firstItem &&
      typeof firstItem === "object" &&
      firstItem !== null &&
      "productId" in firstItem
    ) {
      const p = (firstItem as { productId: unknown }).productId;
      if (p && typeof p === "object" && p !== null) {
        prod = p as Record<string, unknown>;
      }
    }

    let sellerId: string | undefined;
    if (prod?.userId !== undefined && prod?.userId !== null) {
      const uid = prod.userId;
      sellerId =
        typeof uid === "object" && uid !== null && "_id" in (uid as object)
          ? String((uid as { _id: Types.ObjectId })._id)
          : String(uid);
      if (sellerId && Types.ObjectId.isValid(sellerId)) {
        sellerIds.add(sellerId);
      }
    }

    normalized.push({ raw: o, prod, sellerId });
  }

  const sellers =
    sellerIds.size > 0
      ? await User.find({
          _id: {
            $in: [...sellerIds].map((id) => new Types.ObjectId(id)),
          },
        })
          .select("name")
          .lean()
      : [];

  const sellerNameById = new Map<string, string>(
    sellers.map((s) => [String(s._id), String(s.name ?? "")]),
  );

  return normalized.map(({ raw, prod, sellerId }) => {
    const buyer = raw.userId as Record<string, unknown> | undefined;
    const buyerName =
      buyer && typeof buyer.name === "string" ? buyer.name : "";

    const created = raw.createdAt;
    let orderPlacedAt = "";
    if (created instanceof Date) {
      orderPlacedAt = created.toISOString();
    } else if (typeof created === "string") {
      orderPlacedAt = created;
    }

    const totalRaw = raw.totalAmount;
    const price =
      typeof totalRaw === "number"
        ? totalRaw
        : Number(totalRaw) || 0;

    const status = raw.status as OrderCardDto["status"];

    return {
      orderId: String(raw._id),
      status,
      productTitle: extractProductTitle(prod),
      productImageUrl: extractFirstProductImageUrl(prod),
      price,
      orderPlacedAt,
      fromName: sellerId ? sellerNameById.get(sellerId) ?? "" : "",
      toName: buyerName,
    };
  });
};

const emptyOrdersPageMeta = async <T>(query: Record<string, unknown>) => {
  const paginationQuery = pickOrderListPaginationQuery(query);
  const qb = new QueryBuilder(OrderModel.find({ _id: null }), paginationQuery)
    .sort()
    .paginate({ defaultLimit: 10, maxLimit: 100 });
  const meta = await qb.countTotal();
  return { data: [] as T[], meta };
};

export type OrderListMeta = Awaited<
  ReturnType<QueryBuilder<unknown>["countTotal"]>
>;

/** Importer: my purchases + optional seller/product filters. Exporter: my sales + optional buyer/product filters. */
const getOrdersForCurrentUserFromDB = async (
  viewerUserId: string,
  activeRole: ActiveRole,
  query: Record<string, unknown>,
): Promise<{ data: OrderCardDto[]; meta: OrderListMeta }> => {
  if (activeRole === "ADMIN") {
    throw new AppError("Forbidden", httpStatus.FORBIDDEN);
  }

  const userOid = new Types.ObjectId(viewerUserId);
  const paginationQuery = pickOrderListPaginationQuery(query);

  const productIdFilter = parseOptionalObjectId(query.productId);
  const productNameFilter = parseOptionalTrimmedString(query.productName);
  const userIdFilter = parseOptionalObjectId(query.userId);
  const userNameFilter = parseOptionalTrimmedString(query.userName);
  const orderIdFilter = parseOptionalObjectId(query.orderId);

  const andParts: Record<string, unknown>[] = [];

  if (activeRole === "IMPORTER") {
    andParts.push({ userId: userOid });
  } else {
    const exporterProductIds = await Product.find({ userId: userOid })
      .distinct("_id")
      .exec();
    if (exporterProductIds.length === 0) {
      return emptyOrdersPageMeta<OrderCardDto>(query);
    }
    andParts.push({ "items.productId": { $in: exporterProductIds } });
  }

  if (orderIdFilter) {
    andParts.push({ _id: orderIdFilter });
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
      return emptyOrdersPageMeta<OrderCardDto>(query);
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
        return emptyOrdersPageMeta<OrderCardDto>(query);
      }
      andParts.push({ "items.productId": { $in: sellerProducts } });
    }
  }

  if (userNameFilter) {
    const nameRx = new RegExp(escapeRegexChars(userNameFilter), "i");
    const matchedUsers = await User.find({ name: nameRx }).select("_id").lean();
    const matchedUserIds = matchedUsers.map((u) => u._id);
    if (matchedUserIds.length === 0) {
      return emptyOrdersPageMeta<OrderCardDto>(query);
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
        return emptyOrdersPageMeta<OrderCardDto>(query);
      }
      andParts.push({ "items.productId": { $in: prods } });
    }
  }

  const matchFilter: Record<string, unknown> =
    andParts.length === 1 ? andParts[0]! : { $and: andParts };

  const orderQB = new QueryBuilder(OrderModel.find(matchFilter), paginationQuery)
    .sort()
    .paginate({ defaultLimit: 10, maxLimit: 100 })
    .fields("_id status totalAmount createdAt userId items.productId");

  const meta = await orderQB.countTotal();
  const rawRows = (await orderQB.modelQuery
    .populate({ path: "userId", select: "name" })
    .populate({
      path: "items.productId",
      select: "productName userId productImages",
      populate: { path: "productImages", select: "url" },
    })
    .lean()) as Record<string, unknown>[];

  const data = await shapeOrdersToCardDto(rawRows);

  return { data, meta };
};

const populateOrderDetailQuery = (orderId: string) =>
  OrderModel.findById(orderId)
    .populate({
      path: "userId",
      select: "name email phone profileImage roles activeRole status",
      populate: { path: "profileImage", select: "url alt" },
    })
    .populate({
      path: "shippingAddressId",
      select:
        "fullName phone addressLine city state postalCode country isDefault createdAt updatedAt",
    })
    .populate({
      path: "items.productId",
      populate: [
        { path: "categoryId", select: "categoryName slug" },
        {
          path: "productImages",
          select: "url alt",
        },
        {
          path: "brand",
          select: "brandName slug image",
          populate: { path: "image", select: "url alt" },
        },
        { path: "tags", select: "name slug description" },
        {
          path: "userId",
          select: "name email phone profileImage",
          populate: { path: "profileImage", select: "url alt" },
        },
        { path: "seo.image", select: "url alt" },
      ],
    })
    .lean();

const toIsoOrNull = (value: unknown): string | null => {
  if (value instanceof Date) return value.toISOString();
  if (typeof value === "string" && value.length > 0) return value;
  return null;
};

const shapeAdminOrderListRows = (
  orders: Record<string, unknown>[],
): AdminOrderListRowDto[] =>
  orders.map((raw) => {
    const items = (raw.items as unknown[]) ?? [];
    const firstItem =
      items[0] && typeof items[0] === "object" && items[0] !== null
        ? (items[0] as Record<string, unknown>)
        : null;

    let prod: Record<string, unknown> | null = null;
    const productRef = firstItem?.productId;
    if (productRef && typeof productRef === "object" && productRef !== null) {
      prod = productRef as Record<string, unknown>;
    }

    const buyer =
      raw.userId && typeof raw.userId === "object" && raw.userId !== null
        ? (raw.userId as Record<string, unknown>)
        : null;

    let exporterName = "";
    const sellerRef = prod?.userId;
    if (sellerRef && typeof sellerRef === "object" && sellerRef !== null) {
      const seller = sellerRef as Record<string, unknown>;
      exporterName =
        typeof seller.name === "string" ? seller.name.trim() : "";
    }

    const unitRaw = firstItem?.unitPrice;
    const unitPrice =
      typeof unitRaw === "number" ? unitRaw : Number(unitRaw) || 0;

    const totalRaw = raw.totalAmount;
    const totalPrice =
      typeof totalRaw === "number" ? totalRaw : Number(totalRaw) || 0;

    const productId =
      prod?._id !== undefined
        ? String(prod._id)
        : firstItem?.productId !== undefined
          ? String(firstItem.productId)
          : "";

    return {
      orderId: String(raw._id),
      orderCreatedAt: toIsoOrNull(raw.createdAt) ?? "",
      productId,
      productName: extractProductTitle(prod),
      unitPrice,
      totalPrice,
      importerName:
        buyer && typeof buyer.name === "string" ? buyer.name.trim() : "",
      exporterName,
      deliveryMaxAt: toIsoOrNull(raw.deliveryMaxAt),
      status: raw.status as OrderStatus,
    };
  });

/** Admin: all orders with pagination (QueryBuilder) + optional filters. */
const getAllOrdersForAdminFromDB = async (
  query: Record<string, unknown>,
): Promise<{ data: AdminOrderListRowDto[]; meta: OrderListMeta }> => {
  const paginationQuery = pickOrderListPaginationQuery(query);
  const andParts: Record<string, unknown>[] = [];

  const statusFilter =
    typeof query.status === "string" ? query.status.trim() : undefined;
  if (statusFilter) {
    andParts.push({ status: statusFilter });
  }

  const orderDateRange = parseOrderDateUtcRange(query.orderDate);
  if (orderDateRange) {
    andParts.push({ createdAt: orderDateRange });
  }

  const orderIdFilter = parseOptionalObjectId(query.orderId);
  if (orderIdFilter) {
    andParts.push({ _id: orderIdFilter });
  }

  const productIdFilter = parseOptionalObjectId(query.productId);
  if (productIdFilter) {
    andParts.push({ "items.productId": productIdFilter });
  }

  const productNameFilter = parseOptionalTrimmedString(query.productName);
  if (productNameFilter) {
    const nameRx = new RegExp(escapeRegexChars(productNameFilter), "i");
    const matchingIds = await Product.find({ productName: nameRx })
      .distinct("_id")
      .exec();
    if (matchingIds.length === 0) {
      return emptyOrdersPageMeta<AdminOrderListRowDto>(query);
    }
    andParts.push({ "items.productId": { $in: matchingIds } });
  }

  const userIdFilter = parseOptionalObjectId(query.userId);
  if (userIdFilter) {
    andParts.push({ userId: userIdFilter });
  }

  const userNameFilter = parseOptionalTrimmedString(query.userName);
  if (userNameFilter) {
    const nameRx = new RegExp(escapeRegexChars(userNameFilter), "i");
    const matchedUsers = await User.find({ name: nameRx }).select("_id").lean();
    const matchedUserIds = matchedUsers.map((u) => u._id);
    if (matchedUserIds.length === 0) {
      return emptyOrdersPageMeta<AdminOrderListRowDto>(query);
    }
    const importerOrders = { userId: { $in: matchedUserIds } };
    const sellerProductIds = await Product.find({
      userId: { $in: matchedUserIds },
    })
      .distinct("_id")
      .exec();
    const bySeller =
      sellerProductIds.length > 0
        ? { "items.productId": { $in: sellerProductIds } }
        : null;
    if (bySeller) {
      andParts.push({ $or: [importerOrders, bySeller] });
    } else {
      andParts.push(importerOrders);
    }
  }

  const matchFilter: Record<string, unknown> =
    andParts.length === 0 ? {} : andParts.length === 1 ? andParts[0]! : { $and: andParts };

  // Admin list is always newest-first; ignore client `sort` (price sort is UI-only).
  const adminPaginationQuery = { ...paginationQuery };
  delete adminPaginationQuery.sort;

  const orderQB = new QueryBuilder(
    OrderModel.find(matchFilter),
    adminPaginationQuery,
  )
    .sort("-createdAt")
    .paginate({ defaultLimit: 10, maxLimit: 100 });

  const meta = await orderQB.countTotal();
  const rawRows = (await orderQB.modelQuery
    .populate({ path: "userId", select: "name" })
    .populate({
      path: "items.productId",
      select: "productName userId",
      populate: { path: "userId", select: "name" },
    })
    .lean()) as Record<string, unknown>[];

  const data = shapeAdminOrderListRows(rawRows);
  return { data, meta };
};

/** Admin: full order by id (populated). */
const getOrderByIdForAdminFromDB = async (orderId: string) => {
  const doc = await populateOrderDetailQuery(orderId);
  if (!doc) {
    throw new AppError("Order not found", httpStatus.NOT_FOUND);
  }
  return doc;
};

/**
 * Full order document for buyer or seller — `userId` from JWT must match buyer (importer)
 * or own all line products (exporter). Deep-populates buyer, saved shipping ref, and products.
 */
const getOrderByIdForViewerFromDB = async (
  orderId: string,
  viewerUserId: string,
  activeRole: ActiveRole,
) => {
  if (activeRole === "ADMIN") {
    throw new AppError("Forbidden", httpStatus.FORBIDDEN);
  }

  const orderLean = await OrderModel.findById(orderId).lean();
  if (!orderLean) {
    throw new AppError("Order not found", httpStatus.NOT_FOUND);
  }

  if (activeRole === "IMPORTER") {
    assertImporterOwnsOrder(orderLean, viewerUserId);
  } else {
    await assertExporterOwnsAllOrderProductsForView(orderLean, viewerUserId);
  }

  const doc = await populateOrderDetailQuery(orderId);
  if (!doc) {
    throw new AppError("Order not found", httpStatus.NOT_FOUND);
  }

  return doc;
};

export const OrderService = {
  createOrderIntoDB,
  updateOrderStatusInDB,
  getOrdersForCurrentUserFromDB,
  getOrderByIdForViewerFromDB,
  getAllOrdersForAdminFromDB,
  getOrderByIdForAdminFromDB,
};
