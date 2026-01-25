import { describe, expect, it, afterEach } from "vitest";
import { parseRouteFromPathname, toPathname } from "./router";

const originalEnv = (import.meta as any).env;

const setBaseUrl = (baseUrl: string) => {
  (import.meta as any).env = { ...originalEnv, BASE_URL: baseUrl };
};

afterEach(() => {
  (import.meta as any).env = originalEnv;
});

describe("parseRouteFromPathname", () => {
  it("returns home for empty path", () => {
    setBaseUrl("/");
    const result = parseRouteFromPathname("/");
    expect(result).toEqual({
      page: "home",
      recordsSubPage: null,
      sanctumSubPage: null,
      ocrActive: false,
    });
  });

  it("handles base path and trailing slash", () => {
    setBaseUrl("/app/");
    const result = parseRouteFromPathname("/app/records/add/");
    expect(result).toEqual({
      page: "records",
      recordsSubPage: "add",
      sanctumSubPage: null,
      ocrActive: false,
    });
  });

  it("falls back to home for unknown path", () => {
    setBaseUrl("/");
    const result = parseRouteFromPathname("/unknown/path");
    expect(result).toEqual({
      page: "home",
      recordsSubPage: null,
      sanctumSubPage: null,
      ocrActive: false,
    });
  });

  it("activates ocr when enabled", () => {
    setBaseUrl("/");
    const result = parseRouteFromPathname("/ocr", { ocrEnabled: true });
    expect(result).toEqual({
      page: "home",
      recordsSubPage: null,
      sanctumSubPage: null,
      ocrActive: true,
    });
  });

  it("ignores ocr when disabled", () => {
    setBaseUrl("/");
    const result = parseRouteFromPathname("/ocr", { ocrEnabled: false });
    expect(result).toEqual({
      page: "home",
      recordsSubPage: null,
      sanctumSubPage: null,
      ocrActive: false,
    });
  });
});

describe("toPathname", () => {
  it("returns ocr path when active", () => {
    const result = toPathname({
      page: "home",
      recordsSubPage: null,
      sanctumSubPage: null,
      ocrActive: true,
    });
    expect(result).toBe("/ocr");
  });

  it("returns sub page paths", () => {
    expect(
      toPathname({
        page: "records",
        recordsSubPage: "add",
        sanctumSubPage: null,
        ocrActive: false,
      }),
    ).toBe("/records/add");

    expect(
      toPathname({
        page: "sanctum",
        recordsSubPage: null,
        sanctumSubPage: "privacy",
        ocrActive: false,
      }),
    ).toBe("/sanctum/privacy");
  });

  it("returns top-level path for base pages", () => {
    expect(
      toPathname({
        page: "books",
        recordsSubPage: null,
        sanctumSubPage: null,
        ocrActive: false,
      }),
    ).toBe("/books");

    expect(
      toPathname({
        page: "home",
        recordsSubPage: null,
        sanctumSubPage: null,
        ocrActive: false,
      }),
    ).toBe("/");
  });
});
