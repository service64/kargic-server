import express from 'express';
import { auth } from '../../middlewares/auth.middleware';
import validateRequest from '../../middlewares/validateRequest';
import { ChatController } from './chat.controller';
import {
  myPeersQueryZodSchema,
  peerUserMessagesQueryZodSchema,
} from './chat.validation';

const router = express.Router();

router.use(auth());

router.get(
  '/peers',
  validateRequest(myPeersQueryZodSchema),
  ChatController.listMyPeers,
);

router.get(
  '/with/:peerUserId/messages',
  validateRequest(peerUserMessagesQueryZodSchema),
  ChatController.listMessagesWithPeer,
);

export const ChatRoutes = router;
