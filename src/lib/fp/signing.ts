// The exact string a terminal signs (SPEC §4.5). Pure, so the Android app's format can be unit-tested.
import { createHash } from "node:crypto";

export function signedString(method: string, pathWithQuery: string, terminalId: string, timestamp: string, nonce: string, body: string) {
  const bodyHash = createHash("sha256").update(body, "utf8").digest("base64url");
  return `FPv1\n${method.toUpperCase()}\n${pathWithQuery}\n${terminalId}\n${timestamp}\n${nonce}\n${bodyHash}`;
}
