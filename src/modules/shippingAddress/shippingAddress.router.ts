import express from 'express';
import { auth } from '../../middlewares/auth.middleware';
import validateRequest from '../../middlewares/validateRequest';
import { ShippingAddressController } from './shippingAddress.controller';
import {
  createShippingAddressZodSchema,
  shippingAddressIdParamZodSchema,
  updateShippingAddressZodSchema,
} from './shippingAddress.validation';

const router = express.Router();

router.use(auth());

router.post(
  '/create',
  validateRequest(createShippingAddressZodSchema),
  ShippingAddressController.createShippingAddress,
);

router.get('/', ShippingAddressController.getShippingAddresses);

router.get(
  '/:id',
  validateRequest(shippingAddressIdParamZodSchema),
  ShippingAddressController.getShippingAddressById,
);

router.patch(
  '/:id',
  validateRequest(updateShippingAddressZodSchema),
  ShippingAddressController.updateShippingAddress,
);

router.delete(
  '/:id',
  validateRequest(shippingAddressIdParamZodSchema),
  ShippingAddressController.deleteShippingAddress,
);

export const ShippingAddressRoutes = router;
