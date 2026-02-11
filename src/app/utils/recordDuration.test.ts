import { describe, expect, it } from "vitest";
import {
  computeElapsedSecondsFromTimerState,
  createTimeRangeFromDuration,
  normalizeDurationSeconds,
} from "./recordDuration";

describe("normalizeDurationSeconds", () => {
  it("prefers explicit duration even when start/end diff is larger", () => {
    expect(
      normalizeDurationSeconds({
        duration: 120,
        startTime: "2026-02-11T00:00:00.000Z",
        endTime: "2026-02-11T00:10:00.000Z",
      })
    ).toBe(120);
  });

  it("accepts numeric-string duration and floors it", () => {
    expect(normalizeDurationSeconds({ duration: "95.9" })).toBe(95);
  });

  it("falls back to start/end diff when duration is missing", () => {
    expect(
      normalizeDurationSeconds({
        startTime: "2026-02-11T00:00:00.000Z",
        endTime: "2026-02-11T00:02:10.000Z",
      })
    ).toBe(130);
  });

  it("subtracts pause intervals when duration is missing", () => {
    expect(
      normalizeDurationSeconds({
        startTime: "2026-02-11T00:00:00.000Z",
        endTime: "2026-02-11T00:10:00.000Z",
        pauseIntervals: [
          {
            startTime: "2026-02-11T00:03:00.000Z",
            endTime: "2026-02-11T00:05:00.000Z",
          },
        ],
      })
    ).toBe(480);
  });

  it("returns zero for invalid inputs", () => {
    expect(
      normalizeDurationSeconds({
        duration: undefined,
        startTime: "invalid",
        endTime: "2026-02-11T00:02:10.000Z",
      })
    ).toBe(0);
  });
});

describe("createTimeRangeFromDuration", () => {
  it("returns start/end where diff equals duration", () => {
    const end = new Date("2026-02-11T12:00:00.000Z");
    const { startTime, endTime } = createTimeRangeFromDuration(end, 125);

    expect(endTime).toBe("2026-02-11T12:00:00.000Z");
    expect(startTime).toBe("2026-02-11T11:57:55.000Z");
    expect(
      Math.floor(
        (new Date(endTime).getTime() - new Date(startTime).getTime()) / 1000
      )
    ).toBe(125);
  });

  it("floors and clamps duration", () => {
    const end = new Date("2026-02-11T12:00:00.000Z");
    const { startTime } = createTimeRangeFromDuration(end, -2.7);

    expect(startTime).toBe("2026-02-11T12:00:00.000Z");
  });
});

describe("computeElapsedSecondsFromTimerState", () => {
  it("returns pausedTime when start is null", () => {
    expect(computeElapsedSecondsFromTimerState(123, null, Date.now())).toBe(123);
  });

  it("adds running duration to pausedTime when start exists", () => {
    const now = 1_000_000;
    const start = 997_500;
    expect(computeElapsedSecondsFromTimerState(100, start, now)).toBe(102.5);
  });

  it("clamps negative values to zero", () => {
    expect(computeElapsedSecondsFromTimerState(-10, 0, 1000)).toBe(0);
  });
});
