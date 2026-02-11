export type DurationLikeRecord = {
  duration?: unknown;
  startTime?: unknown;
  endTime?: unknown;
  pauseIntervals?: unknown;
};

/**
 * Use explicit duration as the source of truth when present.
 * Fall back to start/end diff only for legacy records missing duration.
 */
export function normalizeDurationSeconds(data: DurationLikeRecord): number {
  const n =
    typeof data.duration === "number" ? data.duration : Number(data.duration);
  if (Number.isFinite(n)) {
    return Math.max(0, Math.floor(n));
  }

  const startTime = typeof data.startTime === "string" ? data.startTime : "";
  const endTime = typeof data.endTime === "string" ? data.endTime : "";
  if (!startTime || !endTime) return 0;

  const start = new Date(startTime);
  const end = new Date(endTime);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
    return 0;
  }

  const diffSeconds = Math.floor((end.getTime() - start.getTime()) / 1000);
  if (diffSeconds <= 0) return 0;

  const pauseSeconds = getTotalPauseSeconds(data.pauseIntervals);
  return Math.max(0, diffSeconds - pauseSeconds);
}

export function createTimeRangeFromDuration(end: Date, durationSeconds: number) {
  const safeDurationSeconds = Math.max(0, Math.floor(durationSeconds));
  const endMs = end.getTime();
  const startMs = endMs - safeDurationSeconds * 1000;

  return {
    startTime: new Date(startMs).toISOString(),
    endTime: end.toISOString(),
  };
}

export function computeElapsedSecondsFromTimerState(
  pausedTime: number,
  startTimeMs: number | null,
  nowMs: number
) {
  const safePausedSeconds = Math.max(0, Number(pausedTime) || 0);
  if (!Number.isFinite(startTimeMs) || startTimeMs == null || startTimeMs <= 0) {
    return safePausedSeconds;
  }

  const runningSeconds = Math.max(0, (nowMs - startTimeMs) / 1000);
  return safePausedSeconds + runningSeconds;
}

export function normalizePauseIntervals(
  value: unknown
): { startTime: string; endTime: string }[] {
  if (!Array.isArray(value)) return [];

  return value
    .map((item) => {
      if (typeof item !== "object" || item == null) return null;
      const raw = item as { startTime?: unknown; endTime?: unknown };
      const startTime = typeof raw.startTime === "string" ? raw.startTime : "";
      const endTime = typeof raw.endTime === "string" ? raw.endTime : "";
      if (!startTime || !endTime) return null;

      const startMs = new Date(startTime).getTime();
      const endMs = new Date(endTime).getTime();
      if (!Number.isFinite(startMs) || !Number.isFinite(endMs) || endMs <= startMs) {
        return null;
      }

      return { startTime, endTime };
    })
    .filter((v): v is { startTime: string; endTime: string } => v !== null);
}

export function getTotalPauseSeconds(value: unknown): number {
  return normalizePauseIntervals(value).reduce((sum, interval) => {
    const startMs = new Date(interval.startTime).getTime();
    const endMs = new Date(interval.endTime).getTime();
    return sum + Math.floor((endMs - startMs) / 1000);
  }, 0);
}
