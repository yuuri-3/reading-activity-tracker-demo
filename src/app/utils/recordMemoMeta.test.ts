import { describe, expect, it } from "vitest";

import { parseRecordMemo, serializeRecordMemo } from "./recordMemoMeta";

describe("parseRecordMemo", () => {
  it("returns raw body when no meta block exists", () => {
    expect(parseRecordMemo("hello")).toEqual({ body: "hello", meta: {} });
  });

  it("parses meta block and body", () => {
    const raw =
      "[meta]\nsource_url: https://example.com\nsource_type: web\n[/meta]\n\n本文";
    expect(parseRecordMemo(raw)).toEqual({
      body: "本文",
      meta: {
        source_url: "https://example.com",
        source_type: "web",
      },
    });
  });

  it("handles meta-only memo", () => {
    const raw = "[meta]\nsource_url: https://example.com\n[/meta]";
    expect(parseRecordMemo(raw)).toEqual({
      body: "",
      meta: {
        source_url: "https://example.com",
      },
    });
  });
});

describe("serializeRecordMemo", () => {
  it("returns body when meta is empty", () => {
    expect(serializeRecordMemo({ body: "hello", meta: {} })).toBe("hello");
  });

  it("serializes body and meta block", () => {
    expect(
      serializeRecordMemo({
        body: "本文",
        meta: {
          source_url: "https://example.com",
          source_type: "web",
        },
      }),
    ).toBe(
      "[meta]\nsource_url: https://example.com\nsource_type: web\n[/meta]\n\n本文",
    );
  });
});
