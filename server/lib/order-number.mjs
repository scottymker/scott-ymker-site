import crypto from 'node:crypto';

/**
 * Generate an order number in the format SYP-YYYYMMDD-XXXXXX
 * The random suffix is 6 uppercase hex chars derived from crypto.randomBytes.
 */
export function generateOrderNumber() {
  const now = new Date();
  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const dd = String(now.getDate()).padStart(2, '0');
  const rand = crypto.randomBytes(3).toString('hex').toUpperCase();
  return `SYP-${yyyy}${mm}${dd}-${rand}`;
}
