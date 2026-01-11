import { httpsCallable } from "firebase/functions";

import { getFirebaseFunctions } from "./firebase";
import { classifyCallableError, getCallableErrorCode } from "./functionsError";

export type GuestMergeBackendCheckResult =
  | {
      status: "available";
      apiVersion: number;
    }
  | {
      status: "missing" | "temporary" | "error";
      code?: string;
    };

type GuestMergeCapabilitiesCallableResult = {
  apiVersion: number;
  features?: unknown;
  checkedAt?: string;
};

export async function checkGuestMergeBackend(): Promise<GuestMergeBackendCheckResult> {
  try {
    const functions = getFirebaseFunctions();
    const callable = httpsCallable(functions, "getGuestMergeCapabilities");
    const res = await callable({});
    const data = (res.data ?? {}) as GuestMergeCapabilitiesCallableResult;
    const apiVersion = Number(data.apiVersion ?? 0);
    return { status: "available", apiVersion: Number.isFinite(apiVersion) ? apiVersion : 0 };
  } catch (err) {
    const code = getCallableErrorCode(err);
    const cls = classifyCallableError(code);

    if (cls === "missing") return { status: "missing", code };
    if (cls === "temporary") return { status: "temporary", code };
    return { status: "error", code };
  }
}
