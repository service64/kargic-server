import type { ActiveRole } from '../modules/auth/user/user.interface';

declare global {
  namespace Express {
    interface Request {
      user?: {
        userId: string;
        email: string;
        activeRole: ActiveRole;
        /** Present when JWT was issued after password login (`lsid` claim). */
        loginSessionId?: string;
      };
      /** Set by `authSessionManagement` after session-management OTP verification. */
      sessionMgmt?: {
        userId: string;
        email: string;
      };
    }
  }
}

export {};
