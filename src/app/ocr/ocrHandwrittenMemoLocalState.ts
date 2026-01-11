export type OcrHandwrittenMemoDestination = "book" | "record";

export type OcrHandwrittenMemoLocalState = {
  consentAccepted: boolean;
  defaultDestination: OcrHandwrittenMemoDestination;
};

type PersistedOcrHandwrittenMemoLocalStateV1 = {
  v: 1;
  consentAccepted: boolean;
  defaultDestination: OcrHandwrittenMemoDestination;
};

const STORAGE_KEY = "yomzoy:ocrHandwrittenMemoState:v1" as const;

const DEFAULT_STATE: OcrHandwrittenMemoLocalState = {
  consentAccepted: false,
  defaultDestination: "book",
};

function isDestination(value: unknown): value is OcrHandwrittenMemoDestination {
  return value === "book" || value === "record";
}

function readFromStorage(): OcrHandwrittenMemoLocalState {
  if (typeof window === "undefined") return DEFAULT_STATE;

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_STATE;

    const parsed = JSON.parse(
      raw
    ) as Partial<PersistedOcrHandwrittenMemoLocalStateV1>;
    if (parsed.v !== 1) return DEFAULT_STATE;

    const consentAccepted =
      typeof parsed.consentAccepted === "boolean"
        ? parsed.consentAccepted
        : DEFAULT_STATE.consentAccepted;

    const defaultDestination = isDestination(parsed.defaultDestination)
      ? parsed.defaultDestination
      : DEFAULT_STATE.defaultDestination;

    return { consentAccepted, defaultDestination };
  } catch {
    return DEFAULT_STATE;
  }
}

function writeToStorage(state: OcrHandwrittenMemoLocalState): void {
  if (typeof window === "undefined") return;

  try {
    const payload: PersistedOcrHandwrittenMemoLocalStateV1 = {
      v: 1,
      consentAccepted: state.consentAccepted,
      defaultDestination: state.defaultDestination,
    };

    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
  } catch {
    // ignore (e.g. storage disabled / quota exceeded)
  }
}

export const ocrHandwrittenMemoLocalState = {
  storageKey: STORAGE_KEY,

  load(): OcrHandwrittenMemoLocalState {
    return readFromStorage();
  },

  save(next: OcrHandwrittenMemoLocalState): void {
    writeToStorage(next);
  },

  patch(
    patch: Partial<OcrHandwrittenMemoLocalState>
  ): OcrHandwrittenMemoLocalState {
    const current = readFromStorage();
    const next: OcrHandwrittenMemoLocalState = {
      consentAccepted: patch.consentAccepted ?? current.consentAccepted,
      defaultDestination:
        patch.defaultDestination ?? current.defaultDestination,
    };
    writeToStorage(next);
    return next;
  },
};
