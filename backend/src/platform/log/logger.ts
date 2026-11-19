import pino, { type Logger, type LoggerOptions } from 'pino';
import type { Writable } from 'node:stream';
import { PINO_REDACT_PATHS, REDACT_CENSOR } from './redact.js';

export interface CreateLoggerOptions {
  level?: pino.LevelWithSilent;
  service?: string;
  destination?: Writable;
}

export function createLogger(opts: CreateLoggerOptions = {}): Logger {
  const pinoOpts: LoggerOptions = {
    level: opts.level ?? 'info',
    base: { service: opts.service ?? 'fingerpay-backend' },
    timestamp: pino.stdTimeFunctions.isoTime,
    formatters: {
      level: (label) => ({ level: label }),
    },
    redact: {
      paths: PINO_REDACT_PATHS,
      censor: REDACT_CENSOR,
    },
  };
  return opts.destination ? pino(pinoOpts, opts.destination) : pino(pinoOpts);
}
