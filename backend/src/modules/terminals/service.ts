import { randomUUID } from 'node:crypto';
import type { Kysely } from 'kysely';
import { AppError } from '../../platform/errors/app-error.js';
import type { Database } from '../../platform/db/types.gen.js';
import {
  computeKeySha256,
  verifyTerminalRequestSignature,
  type VerifyTerminalSignatureParams,
} from './signature.js';

interface CachedKey {
  spki: string;
  merchantId: string;
  status: 'ACTIVE' | 'REVOKED';
  expiresAt: number;
}

export class TerminalService {
  private keyCache = new Map<string, CachedKey>();

  constructor(private readonly db: Kysely<Database>) {}

  async pairTerminal(params: {
    ownerId: string;
    merchantId: string;
    label: string;
    publicKeySpki: string;
  }) {
    const keySha256 = computeKeySha256(params.publicKeySpki);
    const terminalId = randomUUID();

    await this.db
      .insertInto('fp.terminals')
      .values({
        id: terminalId,
        merchant_id: params.merchantId,
        label: params.label,
        public_key_spki: params.publicKeySpki,
        key_sha256: keySha256,
        status: 'ACTIVE',
        paired_by: params.ownerId,
      })
      .execute();

    return {
      terminalId,
      merchantId: params.merchantId,
      label: params.label,
      keySha256,
    };
  }

  async revokeTerminal(terminalId: string, actorId: string) {
    const row = await this.db
      .updateTable('fp.terminals')
      .set({
        status: 'REVOKED',
        revoked_by: actorId,
        revoked_at: new Date(),
      })
      .where('id', '=', terminalId)
      .where('status', '=', 'ACTIVE')
      .returning('id')
      .executeTakeFirst();

    if (!row) {
      throw new AppError('NOT_FOUND', 'Active terminal not found');
    }

    this.keyCache.delete(terminalId);
  }

  async getTerminalKey(terminalId: string): Promise<CachedKey> {
    const cached = this.keyCache.get(terminalId);
    if (cached && cached.expiresAt > Date.now()) {
      return cached;
    }

    const row = await this.db
      .selectFrom('fp.terminals')
      .select(['public_key_spki', 'merchant_id', 'status'])
      .where('id', '=', terminalId)
      .executeTakeFirst();

    if (!row) {
      throw new AppError('UNAUTHORIZED', 'Terminal not registered');
    }

    const entry: CachedKey = {
      spki: row.public_key_spki,
      merchantId: row.merchant_id,
      status: row.status,
      expiresAt: Date.now() + 30_000, // 30s cache TTL (SPEC §4.5)
    };

    this.keyCache.set(terminalId, entry);
    return entry;
  }

  /**
   * Verifies signature and enforces nonce single-use uniqueness.
   */
  async authenticateTerminalRequest(params: Omit<VerifyTerminalSignatureParams, 'publicKeySpki'>) {
    const terminalId = params.headers['x-fp-terminal'] as string;
    if (!terminalId) {
      throw new AppError('UNAUTHORIZED', 'Missing X-FP-Terminal header');
    }

    const terminal = await this.getTerminalKey(terminalId);
    if (terminal.status !== 'ACTIVE') {
      throw new AppError('UNAUTHORIZED', 'Terminal is revoked');
    }

    const { nonce } = verifyTerminalRequestSignature({
      ...params,
      publicKeySpki: terminal.spki,
    });

    // Record nonce in fp.request_nonces (PK collision -> replay rejection)
    try {
      await this.db
        .insertInto('fp.request_nonces')
        .values({
          terminal_id: terminalId,
          nonce,
        })
        .execute();
    } catch {
      throw new AppError('CONFLICT', 'Terminal request replay detected (nonce already used)');
    }

    return {
      terminalId,
      merchantId: terminal.merchantId,
    };
  }
}
