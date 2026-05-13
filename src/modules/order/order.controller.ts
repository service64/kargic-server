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

const approveOrderByExporter = catchAsync(async (req: Request, res: Response) => {
  const orderId = String(req.params.id);
  const result = await OrderService.approveOrderByExporterInDB(
    orderId,
    req.user!.userId,
  );
  return sendResponse(res, httpStatus.OK, 'Order approved by exporter', result);
});

const rejectOrderByExporter = catchAsync(async (req: Request, res: Response) => {
  const orderId = String(req.params.id);
  const result = await OrderService.rejectOrderByExporterInDB(
    orderId,
    req.user!.userId,
  );
  return sendResponse(res, httpStatus.OK, 'Order rejected by exporter', result);
});

export const OrderController = {
  createOrder,
  approveOrderByExporter,
  rejectOrderByExporter,
};
