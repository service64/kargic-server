import express from 'express';
import { USER_ROLES } from '../../constants';
import { auth } from '../../middlewares/auth.middleware';
import validateRequest from '../../middlewares/validateRequest';
import { ContactController } from './contact.controller';
import {
  adminContactListQueryZodSchema,
  adminContactMessagesQueryZodSchema,
  contactIdParamZodSchema,
  markContactMessagesReadZodSchema,
  submitContactZodSchema,
} from './contact.validation';

const router = express.Router();

router.post(
  '/',
  validateRequest(submitContactZodSchema),
  ContactController.submitContactMessage,
);

router.get(
  '/admin',
  auth(USER_ROLES.ADMIN),
  validateRequest(adminContactListQueryZodSchema),
  ContactController.getAdminContactList,
);

router.get(
  '/admin/:id/messages',
  auth(USER_ROLES.ADMIN),
  validateRequest(adminContactMessagesQueryZodSchema),
  ContactController.getAdminContactMessages,
);

router.patch(
  '/admin/:id/messages/read',
  auth(USER_ROLES.ADMIN),
  validateRequest(markContactMessagesReadZodSchema),
  ContactController.markContactMessagesRead,
);

export const ContactRoutes = router;
