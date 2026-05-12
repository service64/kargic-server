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

export const OrderController = {
  createOrder,
};
