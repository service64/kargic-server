import express from 'express';
import { USER_ROLES } from '../../constants';
import { auth } from '../../middlewares/auth.middleware';
import validateRequest from '../../middlewares/validateRequest';
import { PredefinedMessageController } from './predefinedMessage.controller';
import {
  createPredefinedMessageZodSchema,
  predefinedMessageIdParamZodSchema,
  updatePredefinedMessageZodSchema,
} from './predefinedMessage.validation';

const router = express.Router();

router.use(auth(USER_ROLES.EXPORTER));

router.post(
  '/create',
  validateRequest(createPredefinedMessageZodSchema),
  PredefinedMessageController.createPredefinedMessage,
);

router.get('/all', PredefinedMessageController.getAllPredefinedMessages);

router.patch(
  '/update/:id',
  validateRequest(updatePredefinedMessageZodSchema),
  PredefinedMessageController.updatePredefinedMessage,
);

router.delete(
  '/delete/:id',
  validateRequest(predefinedMessageIdParamZodSchema),
  PredefinedMessageController.deletePredefinedMessage,
);

export const PredefinedMessageRoutes = router;
