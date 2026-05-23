import express from 'express';
import { auth } from '../../middlewares/auth.middleware';
import validateRequest from '../../middlewares/validateRequest';
import { OrderController } from './order.controller';
import {
  createOrderZodSchema,
  getOrdersQueryZodSchema,
  orderDetailsParamsZodSchema,
  orderStatusTransitionZodSchema,
} from './order.validation';

const router = express.Router();

router.get(
  '/',
  auth('IMPORTER', 'EXPORTER'),
  validateRequest(getOrdersQueryZodSchema),
  OrderController.getMyOrders,
);

router.post(
  '/create',
  auth('IMPORTER'),
  validateRequest(createOrderZodSchema),
  OrderController.createOrder,
);

router.get(
  '/:id',
  auth('IMPORTER', 'EXPORTER'),
  validateRequest(orderDetailsParamsZodSchema),
  OrderController.getOrderById,
);

router.patch(
  '/:id/status',
  auth('IMPORTER', 'EXPORTER'),
  validateRequest(orderStatusTransitionZodSchema),
  OrderController.updateOrderStatus,
);
//  get all orders for admin

export const OrderRoutes = router;
