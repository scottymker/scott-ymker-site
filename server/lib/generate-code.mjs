import crypto from 'node:crypto';
import { query } from '../db.mjs';

// Safe chars: uppercase alpha + digits, no O, I, 0, 1 (avoid visual ambiguity)
const CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

function randomCode(length = 6) {
  const bytes = crypto.randomBytes(length * 2);
  let result = '';
  for (let i = 0; i < bytes.length && result.length < length; i++) {
    const idx = bytes[i] % CHARS.length;
    result += CHARS[idx];
  }
  return result;
}

/**
 * Generate a unique 6-char code not already in the students table.
 * Tries up to 20 times before throwing.
 */
export async function generateUniqueCode() {
  for (let attempt = 0; attempt < 20; attempt++) {
    const code = randomCode(6);
    const { rows } = await query('SELECT id FROM students WHERE code = $1', [code]);
    if (rows.length === 0) return code;
  }
  throw new Error('Could not generate a unique student code after 20 attempts');
}

export { randomCode };
