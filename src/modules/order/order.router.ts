import express from 'express';
import { auth } from '../../middlewares/auth.middleware';
import validateRequest from '../../middlewares/validateRequest';
import { OrderController } from './order.controller';
import {
  createOrderZodSchema,
  orderIdParamsZodSchema,
} from './order.validation';

const router = express.Router();

router.post(
  '/create',
  auth('IMPORTER'),
  validateRequest(createOrderZodSchema),
  OrderController.createOrder,
);

router.patch(
  '/:id/exporter-approve',
  auth('EXPORTER'),
  validateRequest(orderIdParamsZodSchema),
  OrderController.approveOrderByExporter,
);

router.patch(
  '/:id/exporter-reject',
  auth('EXPORTER'),
  validateRequest(orderIdParamsZodSchema),
  OrderController.rejectOrderByExporter,
);

export const OrderRoutes = router;
