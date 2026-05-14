import type { Server as HttpServer } from 'http';
import jwt from 'jsonwebtoken';
import { Types } from 'mongoose';
import { Server, type Socket } from 'socket.io';
import { z } from 'zod';
import config from '../config';
import { LoginSession } from '../modules/auth/loginSession/loginSession.model';
import type { JwtPayload } from '../middlewares/auth.middleware';
import type { ActiveRole } from '../modules/auth/user/user.interface';
import { USER_ACTIVE_ROLES } from '../modules/auth/user/user.interface';
import { ChatService } from '../modules/chat/chat.service';

const objectIdString = z.string().regex(/^[a-fA-F0-9]{24}$/, 'Invalid id');

const socketChatSendSchema = z.discriminatedUnion('type', [
  z.object({
    peerUserId: objectIdString,
    type: z.literal('text'),
    text: z.string().min(1),
  }),
  z.object({
    peerUserId: objectIdString,
    type: z.literal('image'),
    imageId: objectIdString,
  }),
  z.object({
    peerUserId: objectIdString,
    type: z.literal('order'),
    orderId: objectIdString,
  }),
  z.object({
    peerUserId: objectIdString,
    type: z.literal('product'),
    productId: objectIdString,
  }),
]);

const isActiveRole = (value: unknown): value is ActiveRole =>
  typeof value === 'string' && USER_ACTIVE_ROLES.some((r) => r === value);

const extractSocketToken = (socket: Socket): string | null => {
  const raw = socket.handshake.auth;
  if (raw && typeof raw === 'object' && typeof raw.token === 'string') {
    const t = raw.token.trim();
    if (t.startsWith('Bearer ')) {
      return t.slice(7).trim() || null;
    }
    return t || null;
  }
  const authHeader = socket.handshake.headers.authorization;
  if (typeof authHeader === 'string' && authHeader.startsWith('Bearer ')) {
    return authHeader.slice(7).trim() || null;
  }
  return null;
};

const verifySocketUserId = async (token: string): Promise<string | null> => {
  if (!config.jwt_secret) {
    return null;
  }
  try {
    const decoded = jwt.verify(token, config.jwt_secret) as JwtPayload;
    if (!isActiveRole(decoded.activeRole)) {
      return null;
    }
    if (decoded.lsid) {
      if (!Types.ObjectId.isValid(decoded.lsid)) {
        return null;
      }
      const sessionOk = await LoginSession.exists({
        _id: new Types.ObjectId(decoded.lsid),
        userId: new Types.ObjectId(decoded.userId),
      });
      if (!sessionOk) {
        return null;
      }
    }
    return decoded.userId;
  } catch {
    return null;
  }
};

export const registerChatSocket = (httpServer: HttpServer): Server => {
  const io = new Server(httpServer, {
    cors: {
      origin: config.cors_origins,
      methods: ['GET', 'POST'],
      credentials: true,
    },
  });

  io.use(async (socket, next) => {
    const token = extractSocketToken(socket);
    if (!token) {
      next(new Error('Unauthorized'));
      return;
    }
    const userId = await verifySocketUserId(token);
    if (!userId) {
      next(new Error('Unauthorized'));
      return;
    }
    socket.data.userId = userId;
    next();
  });

  io.on('connection', (socket) => {
    const userId = socket.data.userId as string;
    socket.join(`user:${userId}`);

    socket.on('chat:send', async (raw: unknown, ack?: (r: unknown) => void) => {
      try {
        const payload = socketChatSendSchema.parse(raw);
        const message = await ChatService.sendChatMessage({
          senderId: userId,
          peerUserId: payload.peerUserId,
          type: payload.type,
          ...(payload.type === 'text' ? { text: payload.text } : {}),
          ...(payload.type === 'image' ? { imageId: payload.imageId } : {}),
          ...(payload.type === 'order' ? { orderId: payload.orderId } : {}),
          ...(payload.type === 'product'
            ? { productId: payload.productId }
            : {}),
        });

        io.to(`user:${payload.peerUserId}`).emit('chat:message', { message });
        ack?.({ ok: true, message });
      } catch (err: unknown) {
        const msg =
          err instanceof z.ZodError
            ? err.issues.map((i) => i.message).join(', ')
            : err instanceof Error
              ? err.message
              : 'Failed to send';
        ack?.({ ok: false, error: msg });
      }
    });
  });

  return io;
};
