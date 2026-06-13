import { Request, Response } from 'express';
import httpStatus from 'http-status';
import catchAsync from '../../utils/catchAsync';
import sendResponse from '../../utils/sendResponse';
import { OrderService } from './order.service';

const createOrder = catchAsync(async (req: Request, res: Response) => {
  const result = await OrderService.createOrderIntoDB({
    userId: req.user!.userId,
    items: req.body.items,
    payment: req.body.payment,
    shippingAddressId: req.body.shippingAddressId,
    shippingAddress: req.body.shippingAddress,
  });
  return sendResponse(res, httpStatus.CREATED, 'Order created successfully', result);
});

/** Importer or exporter: body `{ status }` is the next workflow step (server validates role + order state). */
const updateOrderStatus = catchAsync(async (req: Request, res: Response) => {
  const result = await OrderService.updateOrderStatusInDB(
    String(req.params.id),
    req.user!.userId,
    req.user!.activeRole,
    req.body.status,
  );
  const message =
    result &&
    typeof result === 'object' &&
    'deleted' in result &&
    (result as { deleted?: boolean }).deleted
      ? 'Order closed and removed'
      : 'Order status updated';
  return sendResponse(res, httpStatus.OK, message, result);
});

const getMyOrders = catchAsync(async (req: Request, res: Response) => {
  const result = await OrderService.getOrdersForCurrentUserFromDB(
    req.user!.userId,
    req.user!.activeRole,
    req.query as Record<string, unknown>,
  );
  return sendResponse(res, httpStatus.OK, 'Orders fetched successfully', {
    data: result.data,
    meta: result.meta,
  });
});

/** Buyer or seller — `req.user.userId` must match order ownership (JWT). */
const getOrderById = catchAsync(async (req: Request, res: Response) => {
  const result = await OrderService.getOrderByIdForViewerFromDB(
    String(req.params.id),
    req.user!.userId,
    req.user!.activeRole,
  );
  return sendResponse(res, httpStatus.OK, 'Order retrieved successfully', result);
});

const getAllOrdersForAdmin = catchAsync(async (req: Request, res: Response) => {
  const result = await OrderService.getAllOrdersForAdminFromDB(
    req.query as Record<string, unknown>,
  );
  return sendResponse(res, httpStatus.OK, 'Orders fetched successfully', {
    data: result.data,
    meta: result.meta,
  });
});

const getOrderByIdForAdmin = catchAsync(async (req: Request, res: Response) => {
  const result = await OrderService.getOrderByIdForAdminFromDB(String(req.params.id));
  return sendResponse(res, httpStatus.OK, 'Order retrieved successfully', result);
});

export const OrderController = {
  createOrder,
  updateOrderStatus,
  getMyOrders,
  getOrderById,
  getAllOrdersForAdmin,
  getOrderByIdForAdmin,
};
