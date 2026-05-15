import { Request, Response } from 'express';
import httpStatus from 'http-status';
import catchAsync from '../../utils/catchAsync';
import sendResponse from '../../utils/sendResponse';
import { ChatService } from './chat.service';

const listMessagesWithPeer = catchAsync(async (req: Request, res: Response) => {
  const peerUserId = String(req.params.peerUserId);
  const page = Math.max(1, Number(req.query.page) || 1);
  const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 30));
  const result = await ChatService.listMessagesForPair(
    req.user!.userId,
    peerUserId,
    page,
    limit,
  );
  return sendResponse(res, httpStatus.OK, 'Messages', result);
});

const listMyPeers = catchAsync(async (req: Request, res: Response) => {
  const result = await ChatService.listPeersForUser(
    req.user!.userId,
    req.query as Record<string, unknown>,
  );
  return sendResponse(res, httpStatus.OK, 'Peers', result);
});

const markThreadRead = catchAsync(async (req: Request, res: Response) => {
  const peerUserId = String(req.params.peerUserId);
  const result = await ChatService.markConversationRead(req.user!.userId, peerUserId);
  return sendResponse(res, httpStatus.OK, 'Read', result);
});

export const ChatController = {
  listMessagesWithPeer,
  listMyPeers,
  markThreadRead,
};
