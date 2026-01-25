import { describe, expect, it } from "vitest";

import {
  classifyGuestMergeError,
  decideGuestMergeStrategy,
  formatGuestMergeExecuteErrorMessage,
  isBackendGuestMergeEnabled,
  normalizePrepareGuestMergeResult,
  normalizePreviewGuestMergeCounts,
} from "./guestMergeLogic";

describe("guestMergeLogic", () => {
  it("detects backend merge enable flag", () => {
    expect(isBackendGuestMergeEnabled("true")).toBe(true);
    expect(isBackendGuestMergeEnabled(true)).toBe(true);
    expect(isBackendGuestMergeEnabled("false")).toBe(false);
    expect(isBackendGuestMergeEnabled(undefined)).toBe(false);
  });

  it("decides strategy based on flag and backend status", () => {
    expect(
      decideGuestMergeStrategy({
        flagEnabled: true,
        backendStatus: "available",
      }),
    ).toBe("backend");
    expect(
      decideGuestMergeStrategy({
        flagEnabled: true,
        backendStatus: "temporary",
      }),
    ).toBe("client");
    expect(
      decideGuestMergeStrategy({
        flagEnabled: false,
        backendStatus: "available",
      }),
    ).toBe("client");
  });

  it("normalizes prepare response and throws on missing data", () => {
    expect(
      normalizePrepareGuestMergeResult({
        requestId: "req",
        secret: "sec",
        expiresAt: "2024-01-01T00:00:00.000Z",
      }),
    ).toEqual({
      requestId: "req",
      secret: "sec",
      expiresAt: "2024-01-01T00:00:00.000Z",
    });

    expect(() => normalizePrepareGuestMergeResult({})).toThrow(
      "統合準備に失敗しました",
    );
  });

  it("normalizes preview counts", () => {
    expect(
      normalizePreviewGuestMergeCounts({
        counts: { tags: "2", books: 1.9, records: -1 },
      }),
    ).toEqual({ tags: 2, books: 1, records: 0 });
    expect(normalizePreviewGuestMergeCounts({})).toEqual({
      tags: 0,
      books: 0,
      records: 0,
    });
  });

  it("classifies errors and formats messages", () => {
    expect(classifyGuestMergeError("deadline-exceeded")).toBe("expired");
    expect(classifyGuestMergeError("functions/permission-denied")).toBe(
      "permission",
    );
    expect(classifyGuestMergeError("unavailable")).toBe("retryable");
    expect(classifyGuestMergeError()).toBe("unknown");

    expect(formatGuestMergeExecuteErrorMessage("deadline-exceeded")).toContain(
      "有効期限",
    );
    expect(formatGuestMergeExecuteErrorMessage("permission-denied")).toContain(
      "権限",
    );
  });
});
