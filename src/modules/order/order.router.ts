import express from 'express';
import { auth } from '../../middlewares/auth.middleware';
import validateRequest from '../../middlewares/validateRequest';
import { OrderController } from './order.controller';
import {
  createOrderZodSchema,
  getOrdersQueryZodSchema,
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

router.patch(
  '/:id/status',
  auth('IMPORTER', 'EXPORTER'),
  validateRequest(orderStatusTransitionZodSchema),
  OrderController.updateOrderStatus,
);

export const OrderRoutes = router;
