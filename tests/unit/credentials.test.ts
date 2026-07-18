import { describe, expect, it } from "vitest";
import {
  credentialFingerprint,
  decryptCredential,
  encryptCredential,
  type CredentialPayload,
} from "@/lib/crypto/credentials";

const payload: CredentialPayload = {
  fields: [
    { label: "TikTok username", value: "creator_account_99" },
    { label: "TikTok password", value: "S3cret!Pass" },
  ],
  notes: "handle with care",
};

describe("credential encryption", () => {
  it("round-trips a payload", () => {
    const enc = encryptCredential(payload, "deliverable-1");
    expect(enc.keyVersion).toBe(1);
    expect(enc.iv.length).toBe(12);
    const dec = decryptCredential(enc, "deliverable-1");
    expect(dec).toEqual(payload);
  });

  it("produces unique IVs and ciphertexts per call", () => {
    const a = encryptCredential(payload, "d1");
    const b = encryptCredential(payload, "d1");
    expect(a.iv.equals(b.iv)).toBe(false);
    expect(a.ciphertext.equals(b.ciphertext)).toBe(false);
  });

  it("rejects ciphertext moved to a different deliverable (AAD binding)", () => {
    const enc = encryptCredential(payload, "deliverable-1");
    expect(() => decryptCredential(enc, "deliverable-2")).toThrow();
  });

  it("rejects tampered ciphertext", () => {
    const enc = encryptCredential(payload, "d1");
    enc.ciphertext[0] ^= 0xff;
    expect(() => decryptCredential(enc, "d1")).toThrow();
  });

  it("rejects tampered auth tag", () => {
    const enc = encryptCredential(payload, "d1");
    enc.authTag[0] ^= 0xff;
    expect(() => decryptCredential(enc, "d1")).toThrow();
  });

  it("throws on a missing key version", () => {
    const enc = encryptCredential(payload, "d1");
    expect(() => decryptCredential({ ...enc, keyVersion: 9 }, "d1")).toThrow(
      /CREDENTIAL_KEY_V9/,
    );
  });

  it("fingerprints without exposing the value", () => {
    const fp = credentialFingerprint(payload);
    expect(fp).toBe("…t_99");
    expect(fp).not.toContain("creator_account");
  });
});
