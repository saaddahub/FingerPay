export * from './money.js';
export * from './outcomes.js';
export * from './signing.js';
export * from './schemas/system.js';
export * from './schemas/auth.js';
export * from './schemas/terminals.js';
export * from './schemas/pos.js';
export * from './schemas/merchant.js';
export * from './schemas/branch.js';
export * from './schemas/bank.js';
export * from './schemas/demo.js';

/** Required on every surface that shows the product (PRODUCT.md, SPEC 10.6). */
export const DISCLAIMER =
  'FingerPay is a student prototype. Allied Bank, NADRA and SBP Raast are proposed partners; all bank, identity and payment integrations shown are simulated. No real money or real biometric data is processed.';

export const API_PREFIX = '/api/v1';
