'use client';

import { canonicalString, TERMINAL_HEADERS } from '@fingerpay/contracts';

export interface BrowserTerminalIdentity {
  terminalId: string;
  merchantId: string;
  label: string;
  keyPair: CryptoKeyPair;
  spkiBase64: string;
}

let activeTerminal: BrowserTerminalIdentity | null = null;

function bytesToBase64(bytes: Uint8Array): string {
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]!);
  }
  return btoa(binary);
}

function bytesToBase64Url(bytes: Uint8Array): string {
  return bytesToBase64(bytes).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

/**
 * SPEC §4.5: Generates a non-extractable ECDSA P-256 keypair in the browser using WebCrypto.
 */
export async function generateTerminalKeyPair(): Promise<{
  keyPair: CryptoKeyPair;
  spkiBase64: string;
}> {
  const keyPair = await crypto.subtle.generateKey(
    { name: 'ECDSA', namedCurve: 'P-256' },
    false,
    ['sign', 'verify'],
  );
  const spkiBuf = await crypto.subtle.exportKey('spki', keyPair.publicKey);
  return {
    keyPair,
    spkiBase64: bytesToBase64(new Uint8Array(spkiBuf)),
  };
}

export function getActiveTerminal(): BrowserTerminalIdentity | null {
  return activeTerminal;
}

export function setActiveTerminal(terminal: BrowserTerminalIdentity | null): void {
  activeTerminal = terminal;
}

/**
 * Signs a POS terminal HTTP request using WebCrypto ECDSA P-256 / SHA-256 (IEEE-P1363 r||s).
 */
export async function buildSignedTerminalHeaders(params: {
  terminal: BrowserTerminalIdentity;
  method: string;
  pathWithQuery: string;
  bodyText: string;
}): Promise<Record<string, string>> {
  const timestamp = new Date().toISOString();
  const nonceBytes = new Uint8Array(16);
  crypto.getRandomValues(nonceBytes);
  const nonce = bytesToBase64Url(nonceBytes);

  const bodyBytes = new TextEncoder().encode(params.bodyText);
  const bodyHashBuf = await crypto.subtle.digest('SHA-256', bodyBytes);
  const bodySha256 = bytesToBase64Url(new Uint8Array(bodyHashBuf));

  const canonical = canonicalString({
    method: params.method,
    pathWithQuery: params.pathWithQuery,
    terminalId: params.terminal.terminalId,
    timestamp,
    nonce,
    bodySha256,
  });

  const sigBuf = await crypto.subtle.sign(
    { name: 'ECDSA', hash: 'SHA-256' },
    params.terminal.keyPair.privateKey,
    new TextEncoder().encode(canonical),
  );

  return {
    [TERMINAL_HEADERS.terminal]: params.terminal.terminalId,
    [TERMINAL_HEADERS.timestamp]: timestamp,
    [TERMINAL_HEADERS.nonce]: nonce,
    [TERMINAL_HEADERS.signature]: bytesToBase64Url(new Uint8Array(sigBuf)),
  };
}
