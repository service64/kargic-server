import express from 'express';
import { auth } from '../../middlewares/auth.middleware';
import validateRequest from '../../middlewares/validateRequest';
import { USER_ROLES } from '../../constants';
import { OrderController } from './order.controller';
import {
  adminGetOrdersQueryZodSchema,
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
  '/admin',
  auth(USER_ROLES.ADMIN),
  validateRequest(adminGetOrdersQueryZodSchema),
  OrderController.getAllOrdersForAdmin,
);

router.get(
  '/admin/:id',
  auth(USER_ROLES.ADMIN),
  validateRequest(orderDetailsParamsZodSchema),
  OrderController.getOrderByIdForAdmin,
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

export const OrderRoutes = router;
