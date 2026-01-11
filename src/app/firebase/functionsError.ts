export type CallableErrorClass = "missing" | "temporary" | "other";

export function getCallableErrorCode(err: unknown): string | undefined {
  const asAny = err as any;
  const code = asAny?.code;
  return typeof code === "string" ? code : undefined;
}

export function normalizeCallableErrorCode(code: string): string {
  // Firebase Functions JS SDK often prefixes with "functions/".
  const idx = code.indexOf("/");
  return idx >= 0 ? code.slice(idx + 1) : code;
}

export function classifyCallableError(code?: string): CallableErrorClass {
  if (!code) return "other";
  const normalized = normalizeCallableErrorCode(code);

  // “Missing or too old backend” signals.
  if (normalized === "not-found" || normalized === "unimplemented") {
    return "missing";
  }

  // “Retryable” / transient signals.
  if (
    normalized === "unavailable" ||
    normalized === "deadline-exceeded" ||
    normalized === "resource-exhausted"
  ) {
    return "temporary";
  }

  return "other";
}
