import { User } from './user.model';
import { ConversationModel } from '../../chat/conversation.model';
import { OrderModel } from '../../order/order.model';

/** Same window as chat “live” peer signal — any authenticated request bumps `lastApiActivityAt`. */
export const SITE_STATS_ACTIVE_USER_MS = 5 * 60 * 1000;

export type SiteStatisticsDto = {
  totalPeers: number;
  activeUsers: number;
  totalUsers: number;
  totalImporters: number;
  totalExporters: number;
  totalOrders: number;
  /** Domain uses `completed`, not `delivered`. */
  deliveredOrders: number;
  cancelledOrders: number;
  returnedOrders: number;
};

/**
 * Parallel count queries for admin dashboard. Peers = distinct chat pairs (conversations).
 */
const getSiteStatistics = async (): Promise<SiteStatisticsDto> => {
  const since = new Date(Date.now() - SITE_STATS_ACTIVE_USER_MS);
  const activeAccount = { deletedAt: null };

  const [
    activeUsers,
    totalUsers,
    totalImporters,
    totalExporters,
    totalPeers,
    totalOrders,
    deliveredOrders,
    cancelledOrders,
    returnedOrders,
  ] = await Promise.all([
    User.countDocuments({
      ...activeAccount,
      status: 'ACTIVE',
      lastApiActivityAt: { $gte: since },
    }).exec(),
    User.countDocuments(activeAccount).exec(),
    User.countDocuments({
      ...activeAccount,
      roles: 'IMPORTER',
    }).exec(),
    User.countDocuments({
      ...activeAccount,
      roles: 'EXPORTER',
    }).exec(),
    ConversationModel.countDocuments().exec(),
    OrderModel.countDocuments().exec(),
    OrderModel.countDocuments({ status: 'completed' }).exec(),
    OrderModel.countDocuments({ status: 'cancelled' }).exec(),
    OrderModel.countDocuments({ status: 'returned' }).exec(),
  ]);

  return {
    totalPeers,
    activeUsers,
    totalUsers,
    totalImporters,
    totalExporters,
    totalOrders,
    deliveredOrders,
    cancelledOrders,
    returnedOrders,
  };
};

export const SiteStatisticsService = {
  getSiteStatistics,
};
