// Shared route plumbing (SPEC §4.6): no-store JSON, SQLSTATE → HTTP, rate limits, strict bodies.
import { NextResponse, type NextRequest } from "next/server";
import type { z } from "zod";
import { db } from "./db.ts";
import { HttpError, toHttp } from "./errors.ts";

export const NO_STORE = { "cache-control": "no-store" } as const;

export const ok = (body: unknown, status = 200) => NextResponse.json(body, { status, headers: NO_STORE });

export async function handle(context: string, fn: () => Promise<Response>): Promise<Response> {
  try {
    return await fn();
  } catch (err) {
    const { status, body } = toHttp(err, context);
    const headers: Record<string, string> = { ...NO_STORE };
    if (status === 429) headers["retry-after"] = "60";
    return NextResponse.json(body, { status, headers });
  }
}

/** fp.api_rate_limit; throws 429 when the bucket is full. Buckets never hold raw identifiers beyond UUIDs. */
export async function rateLimit(bucket: string, windowSeconds: number, max: number): Promise<void> {
  const [{ allowed }] = await db()`select fp.api_rate_limit(${bucket}, ${windowSeconds}, ${max}) as allowed`;
  if (!allowed) throw new HttpError(429, "RATE_LIMITED", "too many requests");
}

/** Parses a JSON body against a strict zod schema. Never echoes the input back. */
export function parseBody<T extends z.ZodType>(text: string, schema: T): z.infer<T> {
  let raw: unknown;
  try {
    raw = text ? JSON.parse(text) : {};
  } catch {
    throw new HttpError(400, "INVALID_JSON", "body must be JSON");
  }
  const parsed = schema.safeParse(raw);
  if (!parsed.success) throw new HttpError(400, "INVALID_BODY", "body does not match the expected shape");
  return parsed.data;
}

export const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function uuidParam(value: string): string {
  if (!UUID.test(value)) throw new HttpError(404, "FP404", "not found");
  return value.toLowerCase();
}

/** Amounts travel as exact decimal strings, never floats (CLAUDE.md). */
export const AMOUNT = /^(?:0|[1-9]\d{0,5})(?:\.\d{1,2})?$/;

/** `?day=YYYY-MM-DD` (Asia/Karachi day in the database), or null for today. */
export function dayParam(request: NextRequest): string | null {
  const day = request.nextUrl.searchParams.get("day");
  if (day === null) return null;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(day) || Number.isNaN(Date.parse(day))) throw new HttpError(400, "INVALID_DAY", "day must be YYYY-MM-DD");
  return day;
}
