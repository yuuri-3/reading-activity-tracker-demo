// @vitest-environment jsdom

import { describe, expect, it, vi } from "vitest";

import { ocrHandwrittenMemoLocalState } from "./ocrHandwrittenMemoLocalState";

describe("ocrHandwrittenMemoLocalState", () => {
  it("loads default when empty", () => {
    window.localStorage.clear();
    expect(ocrHandwrittenMemoLocalState.load()).toEqual({
      consentAccepted: false,
      defaultDestination: "book",
    });
  });

  it("saves and loads persisted state", () => {
    window.localStorage.clear();

    ocrHandwrittenMemoLocalState.save({
      consentAccepted: true,
      defaultDestination: "record",
    });

    expect(ocrHandwrittenMemoLocalState.load()).toEqual({
      consentAccepted: true,
      defaultDestination: "record",
    });
  });

  it("patch persists partial updates", () => {
    window.localStorage.clear();

    ocrHandwrittenMemoLocalState.save({
      consentAccepted: false,
      defaultDestination: "book",
    });

    const next = ocrHandwrittenMemoLocalState.patch({
      defaultDestination: "record",
    });

    expect(next).toEqual({
      consentAccepted: false,
      defaultDestination: "record",
    });

    expect(ocrHandwrittenMemoLocalState.load()).toEqual({
      consentAccepted: false,
      defaultDestination: "record",
    });
  });

  it("falls back to default when JSON is broken", () => {
    window.localStorage.clear();
    window.localStorage.setItem(ocrHandwrittenMemoLocalState.storageKey, "{");

    expect(ocrHandwrittenMemoLocalState.load()).toEqual({
      consentAccepted: false,
      defaultDestination: "book",
    });
  });

  it("falls back to default when destination is invalid", () => {
    window.localStorage.clear();
    window.localStorage.setItem(
      ocrHandwrittenMemoLocalState.storageKey,
      JSON.stringify({ v: 1, consentAccepted: true, defaultDestination: "x" })
    );

    expect(ocrHandwrittenMemoLocalState.load()).toEqual({
      consentAccepted: true,
      defaultDestination: "book",
    });
  });

  it("continues without throwing when storage write fails", () => {
    window.localStorage.clear();

    const original = window.localStorage.setItem.bind(window.localStorage);
    vi.spyOn(window.localStorage, "setItem").mockImplementation(() => {
      throw new Error("quota exceeded");
    });

    expect(() =>
      ocrHandwrittenMemoLocalState.save({
        consentAccepted: true,
        defaultDestination: "record",
      })
    ).not.toThrow();

    window.localStorage.setItem = original;
  });
});
