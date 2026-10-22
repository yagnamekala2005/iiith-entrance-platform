import { describe, expect, it } from "vitest";
import {
  createQuestionSchema,
  mockPaymentVerificationSchema,
  registrationSchema,
  validateInput,
} from "@/lib/security/validation";
import { hasValidOrigin } from "@/lib/security/origin";
import { safeInternalRedirect } from "@/lib/security/redirect";
import {
  createRecoveryAuthorization,
  verifyRecoveryAuthorization,
} from "@/lib/security/recovery-authorization";

describe("security validation", () => {
  it("rejects malformed registration values and unknown role fields", () => {
    expect(validateInput(registrationSchema, {
      email: "not-an-email",
      password: "12345678",
      role: "admin",
    }).error).toBeTruthy();
  });

  it("rejects client-supplied payment amounts and malformed provider identifiers", () => {
    const result = validateInput(mockPaymentVerificationSchema, {
      testId: "4a1c5e62-63dd-4c5a-98bc-6c60e66a87f0",
      razorpay_order_id: "order_valid",
      razorpay_payment_id: "pay_valid",
      razorpay_signature: "a".repeat(64),
      amount: 1,
    });
    expect(result.error).toBeTruthy();
  });

  it("rejects unknown admin question fields and invalid option mappings", () => {
    const result = validateInput(createQuestionSchema, {
      subject_id: "4a1c5e62-63dd-4c5a-98bc-6c60e66a87f0",
      question_text: "Question",
      difficulty: "easy",
      explanation: "",
      marks: 1,
      negative_marks: 0,
      options: [{ label: "A", text: "Option" }, { label: "A", text: "Duplicate label" }],
      correct_option_label: "A",
      status: "published",
    });
    expect(result.error).toBeTruthy();
  });
});

describe("request origin and redirects", () => {
  it("accepts same-origin requests and rejects cross-origin or missing Origin", () => {
    expect(hasValidOrigin(new Request("https://app.example/api", {
      headers: { Origin: "https://app.example" },
    }))).toBe(true);
    expect(hasValidOrigin(new Request("https://app.example/api", {
      headers: { Origin: "https://attacker.example" },
    }))).toBe(false);
    expect(hasValidOrigin(new Request("https://app.example/api"))).toBe(false);
  });

  it("constrains redirect targets to local absolute paths", () => {
    expect(safeInternalRedirect("/dashboard?tab=1", "/fallback", "https://app.example"))
      .toBe("/dashboard?tab=1");
    expect(safeInternalRedirect("//attacker.example", "/fallback", "https://app.example"))
      .toBe("/fallback");
    expect(safeInternalRedirect("/\\attacker.example", "/fallback", "https://app.example"))
      .toBe("/fallback");
  });
});

describe("recovery authorization", () => {
  it("binds the signed recovery proof to one user and expires it", () => {
    process.env.SUPABASE_SECRET_KEY = "test-only-signing-secret";
    const issuedAt = 1_800_000_000_000;
    const proof = createRecoveryAuthorization("user-123", issuedAt);
    expect(verifyRecoveryAuthorization(proof, "user-123", issuedAt + 1000)).toBe(true);
    expect(verifyRecoveryAuthorization(proof, "other-user", issuedAt + 1000)).toBe(false);
    expect(verifyRecoveryAuthorization(proof, "user-123", issuedAt + 600_001)).toBe(false);
    delete process.env.SUPABASE_SECRET_KEY;
  });
});
