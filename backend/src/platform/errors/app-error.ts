import { ERROR_CODES, type ErrorCode } from './codes.js';

export class AppError extends Error {
  public readonly code: ErrorCode;
  public readonly statusCode: number;
  public readonly exposeMessage: boolean;

  constructor(code: ErrorCode, message: string, opts?: { statusCode?: number; cause?: unknown }) {
    super(message, opts?.cause ? { cause: opts.cause } : undefined);
    this.name = 'AppError';
    this.code = code;
    this.statusCode = opts?.statusCode ?? ERROR_CODES[code];
    this.exposeMessage = this.statusCode < 500;
  }
}
