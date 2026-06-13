import { Types } from 'mongoose';
import { OrderModel } from '../../order/order.model';
import type { OrderStatus } from '../../order/order.interface';
import { Product } from '../../product/product.model';

/** Non-terminal order statuses — account cannot be soft-deleted while any exist. */
export const RUNNING_ORDER_STATUSES: OrderStatus[] = [
  'awaiting_exporter_approval',
  'confirmed',
  'processing',
  'shipped',
  'received',
  'cheking',
];

export type RunningOrderBlocker = {
  orderId: string;
  status: OrderStatus;
  role: 'buyer' | 'seller';
};

export type AccountDeletionEligibility = {
  eligible: boolean;
  blockers: RunningOrderBlocker[];
};

const toBlocker = (
  row: { _id: Types.ObjectId | string; status: OrderStatus },
  role: 'buyer' | 'seller',
): RunningOrderBlocker => ({
  orderId: String(row._id),
  status: row.status,
  role,
});

/** Running orders as buyer (importer) or seller (exporter). */
export const getRunningOrderBlockersForUser = async (
  userId: string,
): Promise<RunningOrderBlocker[]> => {
  const userOid = new Types.ObjectId(userId);
  const statusFilter = { $in: RUNNING_ORDER_STATUSES };

  const [buyerOrders, exporterProductIds] = await Promise.all([
    OrderModel.find({ userId: userOid, status: statusFilter })
      .select('_id status')
      .lean(),
    Product.find({ userId: userOid }).distinct('_id'),
  ]);

  const blockers: RunningOrderBlocker[] = buyerOrders.map((o) =>
    toBlocker(o as { _id: Types.ObjectId; status: OrderStatus }, 'buyer'),
  );

  if (exporterProductIds.length > 0) {
    const sellerOrders = await OrderModel.find({
      'items.productId': { $in: exporterProductIds },
      status: statusFilter,
    })
      .select('_id status')
      .lean();

    for (const o of sellerOrders) {
      blockers.push(
        toBlocker(o as { _id: Types.ObjectId; status: OrderStatus }, 'seller'),
      );
    }
  }

  return blockers;
};

export const getAccountDeletionEligibilityFromDB = async (
  userId: string,
): Promise<AccountDeletionEligibility> => {
  const blockers = await getRunningOrderBlockersForUser(userId);
  return {
    eligible: blockers.length === 0,
    blockers,
  };
};
