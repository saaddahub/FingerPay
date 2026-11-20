// Structured JSON logs with redaction (SPEC §4.6). Security events go to their own stream.
const SENSITIVE = /authorization|cookie|cnic|phone|token|thumb|account|password|secret|key|signature|nonce|enc$/i;

export function redact(value: unknown, depth = 0): unknown {
  if (depth > 6) return "[depth]";
  if (Buffer.isBuffer(value) || value instanceof Uint8Array) return "[bytes]";
  if (Array.isArray(value)) return value.map((v) => redact(v, depth + 1));
  if (value instanceof Error) return { name: value.name, code: (value as { code?: string }).code };
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, SENSITIVE.test(k) ? "[redacted]" : redact(v, depth + 1)]));
  }
  return value;
}

type Fields = Record<string, unknown>;
const write = (stream: "app" | "security", level: string, event: string, fields: Fields) =>
  console.log(JSON.stringify({ ts: new Date().toISOString(), stream, level, event, ...(redact(fields) as Fields) }));

export const log = {
  info: (event: string, fields: Fields = {}) => write("app", "info", event, fields),
  error: (event: string, fields: Fields = {}) => write("app", "error", event, fields),
  security: (event: string, fields: Fields = {}) => write("security", "warn", event, fields),
};
