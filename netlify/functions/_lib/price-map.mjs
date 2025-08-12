/**
 * Map your product SKUs to Stripe Price IDs.
 * Keep SKUs aligned with your existing order form: A..E, A1..E1, F..N, etc.
 *
 * Example:
 *  A  -> price_123
 *  F  -> price_abc
 */

export const PRICE_MAP = {
  // Packages (fill all)
  A: 'price_xxx', A1: 'price_xxx',
  B: 'price_xxx', B1: 'price_xxx',
  C: 'price_xxx', C1: 'price_xxx',
  D: 'price_xxx', D1: 'price_xxx',
  E: 'price_xxx', E1: 'price_xxx',
  // Add‑ons
  F: 'price_xxx', G: 'price_xxx', H: 'price_xxx', I: 'price_xxx', J: 'price_xxx', K: 'price_xxx', L: 'price_xxx', M: 'price_xxx', N: 'price_xxx',
  // Digitals (if you sell them post‑day)
  DIGI_FULL: 'price_xxx', // e.g., full‑res digital pack
};
