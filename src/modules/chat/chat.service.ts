import httpStatus from 'http-status';
import { Types } from 'mongoose';
import QueryBuilder from '../../builders/QueryBuilder';
import AppError from '../../errors/AppError';
import { Image } from '../media/image.model';
import { OrderModel } from '../order/order.model';
import { Product } from '../product/product.model';
import type { ActiveRole } from '../auth/user/user.interface';
import { User } from '../auth/user/user.model';
import { UserBlockService } from '../userBlock/userBlock.service';
import { ConversationModel } from './conversation.model';
import type { IConversationDoc } from './conversation.interface';
import { ChatMessageModel } from './message.model';
import type { ChatMessageType, IChatMessageDoc } from './message.interface';
import { DailyPeerStatsService } from './dailyPeerStats/dailyPeerStats.service';

const toOid = (id: string) => new Types.ObjectId(id);

/** Peer shown as “live” if their last authenticated API hit was within this window. */
export const PEER_LIVE_ACTIVITY_MS = 5 * 60 * 1000;

const sortedPeerKey = (a: string, b: string): [string, string] => (a < b ? [a, b] : [b, a]);

const findConversationLean = async (
  userIdA: string,
  userIdB: string,
): Promise<(IConversationDoc & { _id: Types.ObjectId }) | null> => {
  const [lowStr, highStr] = sortedPeerKey(userIdA, userIdB);
  const doc = await ConversationModel.findOne({
    participantLow: toOid(lowStr),
    participantHigh: toOid(highStr),
  })
    .lean()
    .exec();
  return doc as (IConversationDoc & { _id: Types.ObjectId }) | null;
};

const readWatermarkFieldForUser = (
  conv: Pick<IConversationDoc, 'participantLow' | 'participantHigh'>,
  userId: string,
): 'lastReadAtForLow' | 'lastReadAtForHigh' => {
  const lowStr = String(conv.participantLow);
  return lowStr === userId ? 'lastReadAtForLow' : 'lastReadAtForHigh';
};

export type ChatReadState = {
  myLastReadAt: string | null;
  peerLastReadAt: string | null;
};

const getReadStateForPair = async (
  userId: string,
  peerUserId: string,
): Promise<ChatReadState> => {
  const conv = await findConversationLean(userId, peerUserId);
  if (!conv?._id) {
    return { myLastReadAt: null, peerLastReadAt: null };
  }
  const lowStr = String(conv.participantLow);
  const myField: 'lastReadAtForLow' | 'lastReadAtForHigh' =
    lowStr === userId ? 'lastReadAtForLow' : 'lastReadAtForHigh';
  const peerField: 'lastReadAtForLow' | 'lastReadAtForHigh' =
    lowStr === userId ? 'lastReadAtForHigh' : 'lastReadAtForLow';
  const myVal = conv[myField];
  const peerVal = conv[peerField];
  return {
    myLastReadAt: myVal instanceof Date ? myVal.toISOString() : null,
    peerLastReadAt: peerVal instanceof Date ? peerVal.toISOString() : null,
  };
};

const countUnreadIncomingForUser = async (
  meUserId: string,
  conv: IConversationDoc & { _id: Types.ObjectId },
): Promise<number> => {
  const lowStr = String(conv.participantLow);
  const peerOid = lowStr === meUserId ? conv.participantHigh : conv.participantLow;
  const field = readWatermarkFieldForUser(conv, meUserId);
  const myWatermark = conv[field];

  const filter: Record<string, unknown> = {
    conversationId: conv._id,
    senderId: peerOid,
  };
  if (myWatermark instanceof Date) {
    filter.createdAt = { $gt: myWatermark };
  }

  return ChatMessageModel.countDocuments(filter).exec();
};

const markConversationRead = async (
  userId: string,
  peerUserId: string,
): Promise<{ readAt: string }> => {
  if (userId === peerUserId) {
    throw new AppError('Invalid peer', httpStatus.BAD_REQUEST);
  }
  const allowed = await UserBlockService.canExchangeMessages(userId, peerUserId);
  if (!allowed) {
    throw new AppError('Messaging is not allowed', httpStatus.FORBIDDEN);
  }

  const conv = await findConversationLean(userId, peerUserId);
  if (!conv?._id) {
    return { readAt: new Date().toISOString() };
  }

  const field = readWatermarkFieldForUser(conv, userId);
  const existing = conv[field];
  const now = new Date();
  const next =
    existing instanceof Date && existing.getTime() > now.getTime() ? existing : now;

  await ConversationModel.updateOne({ _id: conv._id }, { $set: { [field]: next } }).exec();
  return { readAt: next.toISOString() };
};

const getOrCreateConversation = async (userIdA: string, userIdB: string) => {
  const [lowStr, highStr] = sortedPeerKey(userIdA, userIdB);
  const participantLow = toOid(lowStr);
  const participantHigh = toOid(highStr);
  const conv = await ConversationModel.findOneAndUpdate(
    { participantLow, participantHigh },
    {
      $setOnInsert: {
        participantLow,
        participantHigh,
      },
    },
    { upsert: true, returnDocument: 'after', runValidators: true },
  ).lean();
  if (!conv || !conv._id) {
    throw new AppError('Could not open conversation', httpStatus.INTERNAL_SERVER_ERROR);
  }
  return conv;
};

export type SendChatMessageInput = {
  senderId: string;
  peerUserId: string;
  type: ChatMessageType;
  text?: string;
  imageId?: string;
  orderId?: string;
  productId?: string;
};

const attachImageUrlForClients = async (
  msg: Record<string, unknown>,
): Promise<Record<string, unknown>> => {
  if (msg.type !== 'image' || msg.imageId == null) {
    return msg;
  }
  const img = await Image.findById(msg.imageId).select('url').lean();
  return { ...msg, imageUrl: img?.url };
};

const enrichMessageListWithImageUrls = async (
  rows: Record<string, unknown>[],
): Promise<Record<string, unknown>[]> => {
  const imageIds = rows
    .filter((m) => m.type === 'image' && m.imageId)
    .map((m) => String(m.imageId));
  if (imageIds.length === 0) {
    return rows;
  }
  const imgs = await Image.find({ _id: { $in: imageIds } })
    .select('url')
    .lean()
    .exec();
  const urlById = new Map(imgs.map((i) => [String(i._id), i.url as string]));
  return rows.map((m) => {
    if (m.type !== 'image' || m.imageId == null) {
      return m;
    }
    const u = urlById.get(String(m.imageId));
    return u ? { ...m, imageUrl: u } : m;
  });
};

type LeanOrderForPreview = {
  _id: unknown;
  status?: string;
  totalAmount?: number;
  deliveryMinAt?: Date;
  deliveryMaxAt?: Date;
  items?: Array<{
    quantity?: number;
    unitPrice?: number;
    productId?:
      | Types.ObjectId
      | {
          productName?: string;
          productImages?: Array<{ url?: string } | null> | null;
        };
  }>;
};

function buildOrderPreviewPayload(order: LeanOrderForPreview): Record<string, unknown> {
  const item = order.items?.[0];
  const rawProduct = item?.productId;
  let productName = '';
  let productImageUrl: string | null = null;
  if (
    rawProduct &&
    typeof rawProduct === 'object' &&
    !(rawProduct instanceof Types.ObjectId) &&
    'productName' in rawProduct
  ) {
    productName = String((rawProduct as { productName?: string }).productName ?? '');
    const imgs = (rawProduct as { productImages?: unknown }).productImages;
    if (Array.isArray(imgs) && imgs.length > 0) {
      const first = imgs[0];
      if (first && typeof first === 'object' && first !== null && 'url' in first) {
        const u = (first as { url?: string }).url;
        if (typeof u === 'string' && u.length > 0) productImageUrl = u;
      }
    }
  }
  const min = order.deliveryMinAt
    ? new Date(order.deliveryMinAt).toISOString()
    : null;
  const max = order.deliveryMaxAt
    ? new Date(order.deliveryMaxAt).toISOString()
    : null;
  return {
    orderId: String(order._id),
    status: order.status ?? 'awaiting_exporter_approval',
    productName,
    productImageUrl,
    quantity: typeof item?.quantity === 'number' ? item.quantity : 0,
    unitPrice: typeof item?.unitPrice === 'number' ? item.unitPrice : 0,
    totalAmount: typeof order.totalAmount === 'number' ? order.totalAmount : 0,
    deliveryMinAt: min,
    deliveryMaxAt: max,
  };
}

const attachOrderPreviewToMessage = async (
  msg: Record<string, unknown>,
): Promise<Record<string, unknown>> => {
  if (msg.type !== 'order' || msg.orderId == null) {
    return msg;
  }
  const order = await OrderModel.findById(msg.orderId)
    .populate({
      path: 'items.productId',
      select: 'productName productImages',
      populate: { path: 'productImages', select: 'url' },
    })
    .lean();
  if (!order) {
    return { ...msg, orderPreview: null };
  }
  return {
    ...msg,
    orderPreview: buildOrderPreviewPayload(order as LeanOrderForPreview),
  };
};

type LeanProductForPreview = {
  _id: unknown;
  productName?: string;
  slug?: string;
  productImages?: Array<{ url?: string } | null> | null;
};

function buildProductPreviewPayload(
  product: LeanProductForPreview,
): Record<string, unknown> {
  let productImageUrl: string | null = null;
  const imgs = product.productImages;
  if (Array.isArray(imgs) && imgs.length > 0) {
    const first = imgs[0];
    if (first && typeof first === 'object' && 'url' in first) {
      const u = (first as { url?: string }).url;
      if (typeof u === 'string' && u.length > 0) productImageUrl = u;
    }
  }
  return {
    productId: String(product._id),
    productName: product.productName ?? '',
    slug: product.slug ?? '',
    productImageUrl,
  };
}

const attachProductPreviewToMessage = async (
  msg: Record<string, unknown>,
): Promise<Record<string, unknown>> => {
  if (msg.type !== 'product' || msg.productId == null) {
    return msg;
  }
  const product = await Product.findById(msg.productId)
    .select('productName slug productImages')
    .populate({ path: 'productImages', select: 'url' })
    .lean();
  if (!product) {
    return { ...msg, productPreview: null };
  }
  return {
    ...msg,
    productPreview: buildProductPreviewPayload(product as LeanProductForPreview),
  };
};

const enrichMessageListWithProductPreviews = async (
  rows: Record<string, unknown>[],
): Promise<Record<string, unknown>[]> => {
  const productIds = [
    ...new Set(
      rows
        .filter((m) => m.type === 'product' && m.productId)
        .map((m) => String(m.productId)),
    ),
  ];
  if (productIds.length === 0) {
    return rows;
  }
  const pids = productIds.map((id) => toOid(id));
  const products = await Product.find({ _id: { $in: pids } })
    .select('productName slug productImages')
    .populate({ path: 'productImages', select: 'url' })
    .lean()
    .exec();
  const map = new Map(
    products.map((p) => [
      String(p._id),
      buildProductPreviewPayload(p as LeanProductForPreview),
    ]),
  );
  return rows.map((m) => {
    if (m.type !== 'product' || m.productId == null) {
      return m;
    }
    const preview = map.get(String(m.productId));
    return preview
      ? { ...m, productPreview: preview }
      : { ...m, productPreview: null };
  });
};

const enrichMessageListWithOrderPreviews = async (
  rows: Record<string, unknown>[],
): Promise<Record<string, unknown>[]> => {
  const orderIds = [
    ...new Set(
      rows
        .filter((m) => m.type === 'order' && m.orderId)
        .map((m) => String(m.orderId)),
    ),
  ];
  if (orderIds.length === 0) {
    return rows;
  }
  const oids = orderIds.map((id) => toOid(id));
  const orders = await OrderModel.find({ _id: { $in: oids } })
    .populate({
      path: 'items.productId',
      select: 'productName productImages',
      populate: { path: 'productImages', select: 'url' },
    })
    .lean()
    .exec();
  const map = new Map(
    orders.map((o) => [String(o._id), buildOrderPreviewPayload(o as LeanOrderForPreview)]),
  );
  return rows.map((m) => {
    if (m.type !== 'order' || m.orderId == null) {
      return m;
    }
    const preview = map.get(String(m.orderId));
    return preview ? { ...m, orderPreview: preview } : { ...m, orderPreview: null };
  });
};

const sendChatMessage = async (input: SendChatMessageInput) => {
  const { senderId, peerUserId, type } = input;
  if (senderId === peerUserId) {
    throw new AppError('Cannot message yourself', httpStatus.BAD_REQUEST);
  }
  const allowed = await UserBlockService.canExchangeMessages(senderId, peerUserId);
  if (!allowed) {
    throw new AppError('Messaging is not allowed', httpStatus.FORBIDDEN);
  }

  if (type === 'text') {
    const t = input.text?.trim();
    if (!t) {
      throw new AppError('text is required', httpStatus.BAD_REQUEST);
    }
  } else if (type === 'image') {
    if (!input.imageId) {
      throw new AppError('imageId is required', httpStatus.BAD_REQUEST);
    }
    const img = await Image.findOne({
      _id: input.imageId,
      userId: toOid(senderId),
    }).lean();
    if (!img) {
      throw new AppError('Image not found', httpStatus.NOT_FOUND);
    }
  } else if (type === 'order') {
    if (!input.orderId) {
      throw new AppError('orderId is required', httpStatus.BAD_REQUEST);
    }
    const order = await OrderModel.findById(input.orderId).lean();
    if (!order) {
      throw new AppError('Order not found', httpStatus.NOT_FOUND);
    }
  } else if (type === 'product') {
    if (!input.productId) {
      throw new AppError('productId is required', httpStatus.BAD_REQUEST);
    }
    const product = await Product.findById(input.productId).lean();
    if (!product) {
      throw new AppError('Product not found', httpStatus.NOT_FOUND);
    }
  }

  const conv = await getOrCreateConversation(senderId, peerUserId);
  const conversationId = conv._id as Types.ObjectId;

  const doc: Partial<IChatMessageDoc> = {
    conversationId,
    senderId: toOid(senderId),
    type,
  };
  if (type === 'text') {
    doc.text = input.text!.trim();
  } else if (type === 'image') {
    doc.imageId = toOid(input.imageId!);
  } else if (type === 'order') {
    doc.orderId = toOid(input.orderId!);
  } else {
    doc.productId = toOid(input.productId!);
  }

  const [saved] = await Promise.all([
    ChatMessageModel.create(doc),
    ConversationModel.updateOne(
      { _id: conversationId },
      { $set: { lastMessageAt: new Date() } },
    ).exec(),
  ]);

  void DailyPeerStatsService.recordSenderPeerActivity(senderId, peerUserId).catch(
    () => {},
  );

  let plain = saved.toObject() as unknown as Record<string, unknown>;
  plain = await attachImageUrlForClients(plain);
  plain = await attachOrderPreviewToMessage(plain);
  plain = await attachProductPreviewToMessage(plain);
  return plain;
};

const listMessagesForPair = async (
  userId: string,
  peerUserId: string,
  page: number,
  limit: number,
) => {
  const conv = await findConversationLean(userId, peerUserId);
  const readState = await getReadStateForPair(userId, peerUserId);
  if (!conv) {
    return {
      data: [],
      meta: { page, limit, total: 0, totalPages: 0 },
      readState,
    };
  }
  const skip = (page - 1) * limit;
  const filter = { conversationId: conv._id };
  const [raw, total] = await Promise.all([
    ChatMessageModel.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean()
      .exec(),
    ChatMessageModel.countDocuments(filter).exec(),
  ]);
  let data = await enrichMessageListWithImageUrls(
    raw as unknown as Record<string, unknown>[],
  );
  data = await enrichMessageListWithOrderPreviews(data);
  data = await enrichMessageListWithProductPreviews(data);
  return {
    data,
    meta: {
      page,
      limit,
      total,
      totalPages: Math.max(1, Math.ceil(total / limit)),
    },
    readState,
  };
};

export type ChatPeerUser = {
  id: string;
  name: string;
  email: string;
  phone: string;
  activeRole: ActiveRole;
  profileImage: { url?: string; name?: string; alt?: string } | null;
  lastApiActivityAt: string | null;
  /** True when `lastApiActivityAt` is within {@link PEER_LIVE_ACTIVITY_MS}. */
  liveActive: boolean;
};

export type ChatPeerListItem = {
  peerUserId: string;
  peer: ChatPeerUser | null;
  conversationId: string;
  lastMessageAt: string | null;
  unreadCount: number;
};

const shapeLeanPeerUser = (u: {
  _id: unknown;
  name?: string;
  email?: string;
  phone?: string;
  activeRole?: ActiveRole;
  profileImage?: unknown;
  lastApiActivityAt?: Date | string | null;
}): ChatPeerUser => {
  const rawImg = u.profileImage;
  let profileImage: ChatPeerUser['profileImage'] = null;
  if (
    rawImg &&
    typeof rawImg === 'object' &&
    !(rawImg instanceof Types.ObjectId) &&
    '_id' in rawImg
  ) {
    const img = rawImg as { url?: string; name?: string; alt?: string };
    profileImage = {
      ...(typeof img.url === 'string' ? { url: img.url } : {}),
      ...(typeof img.name === 'string' ? { name: img.name } : {}),
      ...(typeof img.alt === 'string' ? { alt: img.alt } : {}),
    };
    if (Object.keys(profileImage).length === 0) {
      profileImage = null;
    }
  }

  let lastAtMs = 0;
  const rawLast = u.lastApiActivityAt;
  if (rawLast instanceof Date) {
    lastAtMs = rawLast.getTime();
  } else if (typeof rawLast === 'string' && rawLast.length > 0) {
    const parsed = new Date(rawLast).getTime();
    lastAtMs = Number.isNaN(parsed) ? 0 : parsed;
  }

  const lastApiActivityAt =
    lastAtMs > 0 ? new Date(lastAtMs).toISOString() : null;
  const liveActive =
    lastAtMs > 0 && Date.now() - lastAtMs < PEER_LIVE_ACTIVITY_MS;

  return {
    id: String(u._id),
    name: String(u.name ?? ''),
    email: String(u.email ?? ''),
    phone: String(u.phone ?? ''),
    activeRole: u.activeRole as ActiveRole,
    profileImage,
    lastApiActivityAt,
    liveActive,
  };
};

const buildPeerConversationListQuery = (
  baseQuery: ReturnType<typeof ConversationModel.find>,
  query: Record<string, unknown>,
) =>
  new QueryBuilder(baseQuery, query)
    .sort('-lastMessageAt -createdAt')
    .paginate({ defaultPage: 1, defaultLimit: 50, maxLimit: 100 });

const listPeersForUser = async (userId: string, query: Record<string, unknown>) => {
  const oid = toOid(userId);
  const baseFilter = { $or: [{ participantLow: oid }, { participantHigh: oid }] };
  const safeListQuery = {
    page: query.page,
    limit: query.limit,
  };

  const listQuery = buildPeerConversationListQuery(
    ConversationModel.find(baseFilter),
    safeListQuery,
  );

  const metaResult = await listQuery.countTotal();
  const rows = (await listQuery.modelQuery.lean().exec()) as unknown as IConversationDoc[];

  const me = userId;
  const baseRows = rows.map((c) => {
    const lowStr = String(c.participantLow);
    const highStr = String(c.participantHigh);
    const peerUserId = lowStr === me ? highStr : lowStr;
    return {
      peerUserId,
      conversationId: String(c._id),
      lastMessageAt: c.lastMessageAt
        ? new Date(c.lastMessageAt).toISOString()
        : null,
    };
  });

  const uniquePeerIds = [...new Set(baseRows.map((r) => r.peerUserId))];
  const peerOids = uniquePeerIds.filter((id) => Types.ObjectId.isValid(id)).map(toOid);
  const peerDocs =
    peerOids.length > 0
      ? await User.find({ _id: { $in: peerOids } })
          .select('name email phone activeRole profileImage lastApiActivityAt')
          .populate('profileImage', 'url name alt')
          .lean()
          .exec()
      : [];
  const peerById = new Map<string, ChatPeerUser>(
    peerDocs.map((doc) => [
      String(doc._id),
      shapeLeanPeerUser(doc),
    ]),
  );

  const unreadCounts = await Promise.all(
    rows.map(async (c) =>
      countUnreadIncomingForUser(me, c as IConversationDoc & { _id: Types.ObjectId }),
    ),
  );

  const data: ChatPeerListItem[] = baseRows.map((row, i) => ({
    ...row,
    peer: peerById.get(row.peerUserId) ?? null,
    unreadCount: unreadCounts[i] ?? 0,
  }));

  return {
    data,
    meta: {
      page: metaResult.page,
      limit: metaResult.limit,
      total: metaResult.total,
      totalPages: metaResult.totalPage,
      hasNextPage: metaResult.hasNextPage,
      hasPrevPage: metaResult.hasPrevPage,
    },
  };
};

export const ChatService = {
  getOrCreateConversation,
  sendChatMessage,
  listMessagesForPair,
  listPeersForUser,
  markConversationRead,
};
