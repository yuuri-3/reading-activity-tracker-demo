import { describe, expect, it } from "vitest";

import { isOcrHandwrittenMemoEnabled } from "./env";

describe("isOcrHandwrittenMemoEnabled", () => {
  it("returns true only when env is exactly '1'", () => {
    expect(isOcrHandwrittenMemoEnabled({ VITE_FEATURE_OCR: "1" })).toBe(true);

    expect(isOcrHandwrittenMemoEnabled({ VITE_FEATURE_OCR: "0" })).toBe(false);

    expect(isOcrHandwrittenMemoEnabled({ VITE_FEATURE_OCR: "TRUE" })).toBe(
      false,
    );

    expect(isOcrHandwrittenMemoEnabled({})).toBe(false);
  });
});
