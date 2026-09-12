import { describe, expect, it } from "vitest";
import { toClaimAuditRequest, validateAuditForm } from "./validation";

const validHash = `0x${"a".repeat(64)}`;
const validAddress = `0x${"b".repeat(40)}`;

describe("audit form validation", () => {
  it("rejects malformed forensic inputs", () => {
    const errors = validateAuditForm({
      transactionHash: "0x123",
      claim: "vague",
      subject: "0xsubject",
      useAi: false
    });

    expect(errors.transactionHash).toBeDefined();
    expect(errors.claim).toBeDefined();
    expect(errors.subject).toBeDefined();
  });

  it("builds the frozen API request", () => {
    const values = {
      transactionHash: ` ${validHash} `,
      claim: " The subject contributed the full protocol volume. ",
      subject: ` ${validAddress} `,
      useAi: false
    };

    expect(validateAuditForm(values)).toEqual({});
    expect(toClaimAuditRequest(values)).toEqual({
      chain_id: 1,
      transaction_hash: validHash,
      claim: "The subject contributed the full protocol volume.",
      subject: validAddress,
      use_ai: false
    });
  });
});
