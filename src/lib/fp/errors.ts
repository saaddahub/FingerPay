// Database SQLSTATE → HTTP (SPEC §4.6). Clients see a code and a fixed message, never SQL text.
import { randomUUID } from "node:crypto";
import { log } from "./log.ts";

const FP: Record<string, { status: number; message: string; useDbMessage?: boolean }> = {
  FP400: { status: 400, message: "invalid request", useDbMessage: true },  // DB messages here are input guidance
  FP401: { status: 401, message: "unauthenticated" },
  FP402: { status: 402, message: "insufficient funds" },
  FP403: { status: 403, message: "forbidden" },
  FP404: { status: 404, message: "not found" },
  FP409: { status: 409, message: "conflict", useDbMessage: true },
  FP423: { status: 423, message: "account, store or terminal is not active" },
};

export type ErrorBody = { error: { code: string; message: string; correlationId?: string } };

export class HttpError extends Error {
  readonly status: number;
  readonly code: string;
  constructor(status: number, code: string, message: string) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

export function toHttp(err: unknown, context: string): { status: number; body: ErrorBody } {
  if (err instanceof HttpError) return { status: err.status, body: { error: { code: err.code, message: err.message } } };
  const code = (err as { code?: unknown })?.code;
  const known = typeof code === "string" ? FP[code] : undefined;
  if (known) {
    const message = known.useDbMessage && err instanceof Error ? err.message.slice(0, 200) : known.message;
    return { status: known.status, body: { error: { code: code as string, message } } };
  }
  const correlationId = randomUUID();
  log.error("unhandled_error", { context, correlationId, err });
  return { status: 500, body: { error: { code: "INTERNAL", message: "internal error", correlationId } } };
}
