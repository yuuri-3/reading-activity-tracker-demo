import { joinWithBase } from "../utils/navigation";

import { ocrHandwrittenMemoLocalState } from "./ocrHandwrittenMemoLocalState";

export function getOcrHandwrittenMemoPrivacyPolicyUrl() {
  return joinWithBase("/sanctum/privacy");
}

export function isOcrHandwrittenMemoConsentAccepted() {
  return ocrHandwrittenMemoLocalState.load().consentAccepted;
}

export function acceptOcrHandwrittenMemoConsent() {
  return ocrHandwrittenMemoLocalState.patch({ consentAccepted: true });
}
