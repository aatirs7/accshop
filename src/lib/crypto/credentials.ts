import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";
import { env } from "@/lib/env";

/**
 * AES-256-GCM encryption for delivered account credentials.
 *
 * - Plaintext exists only transiently in server memory (admin attach, customer
 *   reveal). Never stored, logged, or emailed.
 * - AAD binds each ciphertext to its deliverable row: copying ciphertext
 *   between rows fails authentication.
 * - keyVersion enables rotation: add CREDENTIAL_KEY_V2, re-encrypt, retire V1.
 */

const IV_LENGTH = 12;

function keyFor(version: number): Buffer {
  const raw = process.env[`CREDENTIAL_KEY_V${version}`];
  if (!raw) throw new Error(`Missing CREDENTIAL_KEY_V${version}`);
  const key = Buffer.from(raw, "base64");
  if (key.length !== 32) {
    throw new Error(`CREDENTIAL_KEY_V${version} must be 32 bytes (base64)`);
  }
  return key;
}

export interface CredentialPayload {
  /** Ordered label/value pairs: login, password, linked email, 2FA codes, ... */
  fields: { label: string; value: string }[];
  notes?: string;
}

export interface EncryptedCredential {
  ciphertext: Buffer;
  iv: Buffer;
  authTag: Buffer;
  keyVersion: number;
}

export function encryptCredential(
  payload: CredentialPayload,
  deliverableId: string,
): EncryptedCredential {
  const keyVersion = env.CREDENTIAL_KEY_VERSION;
  const key = keyFor(keyVersion);
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  cipher.setAAD(Buffer.from(deliverableId, "utf8"));
  const ciphertext = Buffer.concat([
    cipher.update(JSON.stringify(payload), "utf8"),
    cipher.final(),
  ]);
  return { ciphertext, iv, authTag: cipher.getAuthTag(), keyVersion };
}

export function decryptCredential(
  record: EncryptedCredential,
  deliverableId: string,
): CredentialPayload {
  const key = keyFor(record.keyVersion);
  const decipher = createDecipheriv("aes-256-gcm", key, record.iv);
  decipher.setAAD(Buffer.from(deliverableId, "utf8"));
  decipher.setAuthTag(record.authTag);
  const plaintext = Buffer.concat([
    decipher.update(record.ciphertext),
    decipher.final(),
  ]).toString("utf8");
  return JSON.parse(plaintext) as CredentialPayload;
}

/** Non-sensitive display hint for the admin UI (e.g. "…name"). */
export function credentialFingerprint(payload: CredentialPayload): string {
  const first = payload.fields[0]?.value ?? "";
  return first.length > 4 ? `…${first.slice(-4)}` : "•••";
}
