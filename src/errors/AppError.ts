export default class AppError extends Error {
  statusCode: number;
  isOperational: boolean;
  /** Machine-readable code for clients (e.g. MAX_SESSIONS_REACHED). */
  code?: string;

  constructor(message: string, statusCode = 500, code?: string) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = true;
    this.code = code;
    Error.captureStackTrace(this, this.constructor);
  }
}
