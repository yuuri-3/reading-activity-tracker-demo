import { describe, expect, it } from "vitest";

import { isOcrHandwrittenMemoEnabled } from "./env";

describe("isOcrHandwrittenMemoEnabled", () => {
  it("returns true only when env is exactly 'true'", () => {
    expect(
      isOcrHandwrittenMemoEnabled({ VITE_ENABLE_OCR_HANDWRITTEN_MEMO: "true" })
    ).toBe(true);

    expect(
      isOcrHandwrittenMemoEnabled({ VITE_ENABLE_OCR_HANDWRITTEN_MEMO: "false" })
    ).toBe(false);

    expect(
      isOcrHandwrittenMemoEnabled({ VITE_ENABLE_OCR_HANDWRITTEN_MEMO: "TRUE" })
    ).toBe(false);

    expect(isOcrHandwrittenMemoEnabled({})).toBe(false);
  });
});
