import express from 'express';
import { auth } from '../../middlewares/auth.middleware';
import validateRequest from '../../middlewares/validateRequest';
import { USER_ROLES } from '../../constants';
import { ChatController } from './chat.controller';
import {
  dailyPeerAnalyticsQueryZodSchema,
  myPeersQueryZodSchema,
  peerUserMessagesQueryZodSchema,
  peerUserReadParamsZodSchema,
} from './chat.validation';

const router = express.Router();

router.get(
  '/analytics/daily-peers',
  auth(USER_ROLES.ADMIN),
  validateRequest(dailyPeerAnalyticsQueryZodSchema),
  ChatController.getDailyPeerAnalytics,
);

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

router.post(
  '/with/:peerUserId/read',
  validateRequest(peerUserReadParamsZodSchema),
  ChatController.markThreadRead,
);

export const ChatRoutes = router;
