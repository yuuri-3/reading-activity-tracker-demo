import { describe, expect, it, vi } from "vitest";

import { callOcrHandwrittenMemo } from "./ocrHandwrittenMemo";

type OcrResult = Awaited<ReturnType<typeof callOcrHandwrittenMemo>>;

function expectFailed(
  res: OcrResult,
): asserts res is Extract<OcrResult, { ok: false }> {
  expect(res.ok).toBe(false);
}

describe("callOcrHandwrittenMemo", () => {
  it("returns disabled error when feature flag is off and does not call Functions", async () => {
    const httpsCallable = vi.fn(() => {
      throw new Error("should-not-be-called");
    });

    const res = await callOcrHandwrittenMemo(
      { mimeType: "image/png", base64: "AAAA" },
      {
        isEnabled: () => false,
        getFunctions: () => ({}),
        httpsCallable: httpsCallable as any,
      },
    );

    expectFailed(res);
    expect(res.error.reason).toBe("disabled");
    expect(res.error.class).toBe("other");
    expect(httpsCallable).not.toHaveBeenCalled();
  });

  it("returns success data on callable success", async () => {
    const callable = vi.fn(async () => ({
      data: { requestId: "r1", text: "hello" },
    }));
    const httpsCallable = vi.fn(() => callable);

    const res = await callOcrHandwrittenMemo(
      { mimeType: "image/png", base64: "AAAA" },
      {
        isEnabled: () => true,
        getFunctions: () => ({}),
        httpsCallable: httpsCallable as any,
      },
    );

    expect(res).toEqual({ ok: true, data: { requestId: "r1", text: "hello" } });
    expect(httpsCallable).toHaveBeenCalledTimes(1);
    expect(callable).toHaveBeenCalledTimes(1);
  });

  it("normalizes unauthenticated errors", async () => {
    const callable = vi.fn(async () => {
      throw { code: "functions/unauthenticated" };
    });
    const httpsCallable = vi.fn(() => callable);

    const res = await callOcrHandwrittenMemo(
      { mimeType: "image/png", base64: "AAAA" },
      {
        isEnabled: () => true,
        getFunctions: () => ({}),
        httpsCallable: httpsCallable as any,
      },
    );

    expectFailed(res);
    expect(res.error.code).toBe("unauthenticated");
    expect(res.error.class).toBe("other");
    expect(res.error.message).toContain("ログイン");
  });

  it("picks reason and retryAfterSeconds from details", async () => {
    const callable = vi.fn(async () => {
      throw {
        code: "functions/resource-exhausted",
        details: { reason: "rate-limit", retryAfterSeconds: 12 },
      };
    });
    const httpsCallable = vi.fn(() => callable);

    const res = await callOcrHandwrittenMemo(
      { mimeType: "image/png", base64: "AAAA" },
      {
        isEnabled: () => true,
        getFunctions: () => ({}),
        httpsCallable: httpsCallable as any,
      },
    );

    expectFailed(res);
    expect(res.error.code).toBe("resource-exhausted");
    expect(res.error.class).toBe("temporary");
    expect(res.error.reason).toBe("rate-limit");
    expect(res.error.retryAfterSeconds).toBe(12);
  });

  it("classifies missing backend errors", async () => {
    const callable = vi.fn(async () => {
      throw { code: "functions/unimplemented" };
    });
    const httpsCallable = vi.fn(() => callable);

    const res = await callOcrHandwrittenMemo(
      { mimeType: "image/png", base64: "AAAA" },
      {
        isEnabled: () => true,
        getFunctions: () => ({}),
        httpsCallable: httpsCallable as any,
      },
    );

    expectFailed(res);
    expect(res.error.code).toBe("unimplemented");
    expect(res.error.class).toBe("missing");
  });
});
