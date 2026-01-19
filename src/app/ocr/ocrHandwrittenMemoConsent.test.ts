// @vitest-environment jsdom

import { describe, expect, it } from "vitest";

import {
  acceptOcrHandwrittenMemoConsent,
  getOcrHandwrittenMemoPrivacyPolicyUrl,
  isOcrHandwrittenMemoConsentAccepted,
} from "./ocrHandwrittenMemoConsent";
import { ocrHandwrittenMemoLocalState } from "./ocrHandwrittenMemoLocalState";

describe("ocrHandwrittenMemoConsent", () => {
  it("returns privacy policy url under app base", () => {
    expect(getOcrHandwrittenMemoPrivacyPolicyUrl()).toContain(
      "/sanctum/privacy",
    );
  });

  it("accept persists consentAccepted", () => {
    window.localStorage.clear();
    ocrHandwrittenMemoLocalState.save({
      consentAccepted: false,
      defaultDestination: "book",
    });

    expect(isOcrHandwrittenMemoConsentAccepted()).toBe(false);

    acceptOcrHandwrittenMemoConsent();

    expect(isOcrHandwrittenMemoConsentAccepted()).toBe(true);
    expect(ocrHandwrittenMemoLocalState.load().consentAccepted).toBe(true);
  });
});
