import React, {
  createContext,
  useContext,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import type { ReactNode } from "react";

import type { TimerState } from "../types";

type TimerContextType = {
  timerState: TimerState;
  startTimer: () => void;
  pauseTimer: () => void;
  resetTimer: () => void;
};

const TimerContext = createContext<TimerContextType | undefined>(undefined);

type PersistedTimerStateV1 = {
  v: 1;
  isRunning: boolean;
  startTime: number | null;
  pausedTime: number;
};

const TIMER_STORAGE_VERSION = 1 as const;

function getTimerStorageKey(uid: string | undefined) {
  return `yomzoy:timerState:v${TIMER_STORAGE_VERSION}:${uid ?? "anon"}`;
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function loadPersistedTimerState(storageKey: string): TimerState | null {
  if (typeof window === "undefined") return null;

  try {
    const raw = window.localStorage.getItem(storageKey);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<PersistedTimerStateV1>;
    if (parsed.v !== TIMER_STORAGE_VERSION) return null;
    if (typeof parsed.isRunning !== "boolean") return null;

    const startTime = parsed.startTime ?? null;
    const pausedTime = isFiniteNumber(parsed.pausedTime)
      ? Math.max(0, Math.floor(parsed.pausedTime))
      : 0;

    const hasValidStartTime = isFiniteNumber(startTime) && startTime > 0;

    if (parsed.isRunning && hasValidStartTime) {
      const elapsedTime = pausedTime + (Date.now() - startTime) / 1000;
      return {
        isRunning: true,
        startTime,
        pausedTime,
        elapsedTime: Math.max(0, elapsedTime),
      };
    }

    return {
      isRunning: false,
      startTime: null,
      pausedTime,
      elapsedTime: pausedTime,
    };
  } catch {
    return null;
  }
}

function savePersistedTimerState(storageKey: string, timerState: TimerState) {
  if (typeof window === "undefined") return;

  const isDefault =
    !timerState.isRunning &&
    timerState.startTime === null &&
    timerState.pausedTime === 0;

  try {
    if (isDefault) {
      window.localStorage.removeItem(storageKey);
      return;
    }

    const payload: PersistedTimerStateV1 = {
      v: TIMER_STORAGE_VERSION,
      isRunning: timerState.isRunning,
      startTime: timerState.isRunning ? timerState.startTime : null,
      pausedTime: Math.max(0, Math.floor(timerState.pausedTime)),
    };
    window.localStorage.setItem(storageKey, JSON.stringify(payload));
  } catch {
    // ignore (e.g. storage full / disabled)
  }
}

export type TimerProviderProps = {
  children: ReactNode;
  uid?: string;
  tickMs?: number;
  persist?: boolean;
  initialState?: TimerState;
};

const DEFAULT_TIMER_STATE: TimerState = {
  isRunning: false,
  startTime: null,
  elapsedTime: 0,
  pausedTime: 0,
};

export function TimerProvider({
  children,
  uid,
  tickMs = 1000,
  persist = true,
  initialState,
}: TimerProviderProps) {
  const storageKey = useMemo(() => getTimerStorageKey(uid), [uid]);
  const hydratingKeyRef = useRef<string | null>(null);

  const [timerState, setTimerState] = useState<TimerState>(() => {
    if (!persist) return initialState ?? DEFAULT_TIMER_STATE;
    // In SSR, localStorage isn't available; fall back to default.
    return DEFAULT_TIMER_STATE;
  });

  useLayoutEffect(() => {
    if (!persist) {
      setTimerState(initialState ?? DEFAULT_TIMER_STATE);
      return;
    }

    hydratingKeyRef.current = storageKey;
    const restored = loadPersistedTimerState(storageKey);
    if (restored) {
      setTimerState(restored);
    } else {
      setTimerState(DEFAULT_TIMER_STATE);
    }
  }, [storageKey, persist, initialState]);

  useEffect(() => {
    if (!persist) return;
    if (hydratingKeyRef.current !== storageKey) return;
    savePersistedTimerState(storageKey, timerState);
  }, [
    storageKey,
    persist,
    timerState.isRunning,
    timerState.startTime,
    timerState.pausedTime,
  ]);

  useEffect(() => {
    if (!timerState.isRunning || !timerState.startTime) return;

    const update = () => {
      setTimerState((prev) => {
        if (!prev.isRunning || !prev.startTime) return prev;
        return {
          ...prev,
          elapsedTime: prev.pausedTime + (Date.now() - prev.startTime) / 1000,
        };
      });
    };

    // Update immediately, then on interval.
    update();
    const interval = window.setInterval(update, tickMs);

    return () => {
      window.clearInterval(interval);
    };
  }, [timerState.isRunning, timerState.startTime, tickMs]);

  const startTimer = () => {
    setTimerState((prev) => ({
      ...prev,
      isRunning: true,
      startTime: Date.now(),
    }));
  };

  const pauseTimer = () => {
    setTimerState((prev) => {
      if (!prev.isRunning || !prev.startTime) {
        const nextPausedTime = Math.max(0, Math.floor(prev.elapsedTime));
        return {
          ...prev,
          isRunning: false,
          startTime: null,
          pausedTime: nextPausedTime,
        };
      }

      const elapsedTime =
        prev.pausedTime + (Date.now() - prev.startTime) / 1000;
      const nextPausedTime = Math.max(0, Math.floor(elapsedTime));
      return {
        ...prev,
        isRunning: false,
        startTime: null,
        elapsedTime,
        pausedTime: nextPausedTime,
      };
    });
  };

  const resetTimer = () => {
    setTimerState(DEFAULT_TIMER_STATE);
  };

  const value = useMemo<TimerContextType>(() => {
    return {
      timerState,
      startTimer,
      pauseTimer,
      resetTimer,
    };
  }, [timerState]);

  return (
    <TimerContext.Provider value={value}>{children}</TimerContext.Provider>
  );
}

export function useTimer() {
  const ctx = useContext(TimerContext);
  if (!ctx) throw new Error("useTimer must be used within TimerProvider");
  return ctx;
}
