import { describe, expect, it } from "vitest";

import {
  classifyCallableError,
  normalizeCallableErrorCode,
} from "./functionsError";

describe("functionsError", () => {
  it("normalizes Firebase prefixed codes", () => {
    expect(normalizeCallableErrorCode("functions/not-found")).toBe("not-found");
    expect(normalizeCallableErrorCode("not-found")).toBe("not-found");
  });

  it("classifies missing backend", () => {
    expect(classifyCallableError("functions/not-found")).toBe("missing");
    expect(classifyCallableError("functions/unimplemented")).toBe("missing");
  });

  it("classifies temporary backend errors", () => {
    expect(classifyCallableError("functions/unavailable")).toBe("temporary");
    expect(classifyCallableError("functions/deadline-exceeded")).toBe(
      "temporary"
    );
  });
});
