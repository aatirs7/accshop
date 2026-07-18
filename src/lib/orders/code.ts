import { randomBytes } from "node:crypto";

// Crockford base32: no I/L/O/U — unambiguous when typed into a Zelle memo
// or read out loud. 6 chars = 32^6 ≈ 1B combinations.
const ALPHABET = "0123456789ABCDEFGHJKMNPQRSTVWXYZ";
export const ORDER_CODE_PATTERN = /^ACC-[0-9A-HJKMNP-TV-Z]{6}$/;

export function generateOrderCode(): string {
  const bytes = randomBytes(6);
  let code = "";
  for (let i = 0; i < 6; i++) code += ALPHABET[bytes[i] % 32];
  return `ACC-${code}`;
}
