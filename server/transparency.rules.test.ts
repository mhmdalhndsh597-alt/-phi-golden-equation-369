import { describe, expect, it } from "vitest";
import { buildAgreementPdf, decryptVaultPayload, encryptVaultPayload, validateDeclarationInput } from "./transparency";

describe("transparency safeguards", () => {
  it("requires explicit declaration fields and consistent children data", () => {
    expect(() => validateDeclarationInput({ maritalStatusDetail: "", hasChildren: false, childrenCount: 0, essentialObligations: "" })).toThrow();
    expect(() => validateDeclarationInput({ maritalStatusDetail: "أعزب", hasChildren: false, childrenCount: 2, essentialObligations: "لا يوجد" })).toThrow();
    expect(validateDeclarationInput({ maritalStatusDetail: "أعزب", hasChildren: true, childrenCount: 1, essentialObligations: "التزام عائلي" })).toBe(true);
  });

  it("encrypts vault bytes and rejects tampering", () => {
    const secret = "test-only-vault-secret";
    const plaintext = Buffer.from("agreement data");
    const encrypted = encryptVaultPayload(plaintext, secret);
    expect(decryptVaultPayload(encrypted.encrypted, secret).toString()).toBe("agreement data");
    const tampered = Buffer.from(encrypted.encrypted);
    tampered[15] = tampered[15] ^ 1;
    expect(() => decryptVaultPayload(tampered, secret)).toThrow();
  });

  it("creates a standards-shaped PDF payload with the legal disclaimer", () => {
    const pdf = buildAgreementPdf(["PHI - THE GOLDEN EQUATION", "Content hash: abc123", "Legal disclaimer"]);
    expect(pdf.subarray(0, 8).toString()).toBe("%PDF-1.4");
    expect(pdf.toString("latin1")).toContain("Content hash: abc123");
  });
});
