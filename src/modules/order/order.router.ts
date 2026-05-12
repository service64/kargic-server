import express from 'express';
import { auth } from '../../middlewares/auth.middleware';
import validateRequest from '../../middlewares/validateRequest';
import { OrderController } from './order.controller';
import { createOrderZodSchema } from './order.validation';

const router = express.Router();

router.use(auth());

router.post(
  '/create',
  validateRequest(createOrderZodSchema),
  OrderController.createOrder,
);

export const OrderRoutes = router;
