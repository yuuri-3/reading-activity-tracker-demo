import { useEffect, useRef, useState } from "react";
import { useApp } from "../context/AppContext";
import { useTimer } from "../timer/TimerContext";
import { PrimaryButton } from "./PrimaryButton";
import { Play, Pause, Square } from "lucide-react";
import {
  formatDateTimeWithSeconds,
  formatDurationHmsParts,
} from "../utils/format";
import { AnimatePresence, motion } from "motion/react";
import { toast } from "sonner";

export type TimerSectionProps = {
  memo?: string;
  selectedBookId?: string;
  bookMemo?: string;
  tagIds?: string[];
  onClearInputs?: () => void;
};

export function TimerSection({
  memo = "",
  selectedBookId = "",
  bookMemo = "",
  tagIds = [],
  onClearInputs,
}: TimerSectionProps) {
  const { addRecord, addBookMemo } = useApp();
  const { timerState, startTimer, pauseTimer, resetTimer } = useTimer();
  const [isStarting, setIsStarting] = useState(false);
  const [isStopping, setIsStopping] = useState(false);
  const stopInFlightRef = useRef(false);
  const startTimeoutRef = useRef<number | null>(null);
  const measurementStartMsRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (startTimeoutRef.current !== null) {
        window.clearTimeout(startTimeoutRef.current);
        startTimeoutRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    // Reset cached start time when timer is fully reset.
    if (
      !timerState.isRunning &&
      timerState.startTime === null &&
      timerState.elapsedTime === 0 &&
      timerState.pausedTime === 0
    ) {
      measurementStartMsRef.current = null;
    }
  }, [
    timerState.elapsedTime,
    timerState.isRunning,
    timerState.pausedTime,
    timerState.startTime,
  ]);

  useEffect(() => {
    // Capture the first "measurement started" timestamp once per run.
    // Keep it stable across pause/resume so the caption doesn't drift.
    if (measurementStartMsRef.current !== null) return;
    if (!timerState.isRunning && timerState.elapsedTime <= 0) return;
    measurementStartMsRef.current = Date.now() - timerState.elapsedTime * 1000;
  }, [timerState.elapsedTime, timerState.isRunning]);

  const getStartTimeText = () => {
    if (timerState.elapsedTime <= 0) return "";
    const startMs = measurementStartMsRef.current;
    if (startMs == null) return "";
    return `${formatDateTimeWithSeconds(
      new Date(startMs).toISOString(),
    )}から計測開始`;
  };

  const handleStop = async () => {
    if (stopInFlightRef.current) return;
    const duration = Math.floor(timerState.elapsedTime);
    if (duration <= 0) return;

    stopInFlightRef.current = true;
    setIsStopping(true);
    pauseTimer();

    // Snapshot inputs before any UI updates (e.g. clearing form fields).
    const memoSnapshot = memo;
    const selectedBookIdSnapshot = selectedBookId;
    const bookMemoSnapshot = bookMemo;
    const tagIdsSnapshot = tagIds;

    const now = new Date();
    const computedStartMs =
      measurementStartMsRef.current ?? now.getTime() - duration * 1000;
    const startTime = new Date(computedStartMs).toISOString();

    // Unlock UI immediately after stopping, so the user can start the next
    // measurement even if the network save is slow.
    resetTimer();
    measurementStartMsRef.current = null;
    onClearInputs?.();
    setIsStopping(false);

    // Firestore write acknowledgements can be delayed on poor networks.
    // Show success immediately, and only show an error if the write fails.
    toast.success("計測結果を保存しました");

    void addRecord({
      duration,
      memo: memoSnapshot,
      startTime,
      endTime: now.toISOString(),
      ...(selectedBookIdSnapshot ? { bookId: selectedBookIdSnapshot } : {}),
      ...(tagIdsSnapshot.length ? { tagIds: tagIdsSnapshot } : {}),
    }).catch((err) => {
      console.error(err);
      toast.error("計測結果の保存に失敗しました");
    });

    if (bookMemoSnapshot.trim() && selectedBookIdSnapshot) {
      addBookMemo(selectedBookIdSnapshot, bookMemoSnapshot.trim());
    }

    stopInFlightRef.current = false;
  };

  const handleStart = () => {
    if (isStarting) return;
    setIsStarting(true);
    startTimeoutRef.current = window.setTimeout(() => {
      startTimer();
      setIsStarting(false);
      startTimeoutRef.current = null;
    }, 120);
  };

  const isRunningUi = timerState.isRunning || isStopping;
  const showDetailedTimer = isRunningUi || timerState.elapsedTime > 0;

  return (
    <div
      className={`mx-auto w-full max-w-[345px] p-6 flex flex-col items-center ${
        showDetailedTimer ? "gap-[28px]" : "gap-[40px]"
      }`}
    >
      {showDetailedTimer ? (
        <div className="flex flex-col items-center gap-4">
          {(() => {
            const { hhmm, ss } = formatDurationHmsParts(timerState.elapsedTime);

            return (
              <div className="flex flex-col items-center gap-1 tabular-nums font-['Sometype_Mono'] font-medium leading-none text-[#5e84a6]">
                <p className="text-[80px]">{hhmm}</p>
                <p className="text-[32px]">{ss}</p>
              </div>
            );
          })()}

          <div className="flex h-5 items-center justify-center">
            <p className="text-center text-[14px] leading-5 text-muted-foreground tracking-[-0.1504px]">
              {getStartTimeText()}
            </p>
          </div>
        </div>
      ) : (
        <div className="flex flex-col items-center">
          {(() => {
            const { hhmm } = formatDurationHmsParts(timerState.elapsedTime);
            return (
              <p className="tabular-nums font-['Sometype_Mono'] font-medium leading-none text-[80px] text-[#5e84a6]">
                {hhmm}
              </p>
            );
          })()}
        </div>
      )}

      <div className="relative flex w-full justify-center">
        <AnimatePresence mode="wait">
          {!isRunningUi ? (
            <motion.div
              key="start-button"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, transition: { duration: 0.12 } }}
              className="w-full"
            >
              <PrimaryButton
                onClick={handleStart}
                disabled={isStarting}
                className="w-full overflow-hidden"
                icon={
                  <motion.span
                    className="flex items-center"
                    animate={{ opacity: isStarting ? 0 : 1 }}
                    transition={{ duration: 0.1 }}
                  >
                    <Play />
                  </motion.span>
                }
              >
                <motion.span
                  className="flex items-center"
                  animate={{ opacity: isStarting ? 0 : 1 }}
                  transition={{ duration: 0.1 }}
                >
                  {timerState.elapsedTime > 0 ? "計測再開" : "計測開始"}
                </motion.span>
              </PrimaryButton>
            </motion.div>
          ) : (
            <motion.div
              key="control-buttons"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.2, delay: 0.05 }}
              className="flex w-full gap-6"
            >
              <motion.div
                initial={{ x: "100%", opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                transition={{
                  type: "spring",
                  stiffness: 200,
                  damping: 20,
                  delay: 0.05,
                }}
                className="flex-1"
              >
                <PrimaryButton
                  onClick={pauseTimer}
                  disabled={isStopping}
                  className="w-full"
                  icon={<Pause />}
                >
                  一時停止
                </PrimaryButton>
              </motion.div>
              <motion.div
                initial={{ x: "-100%", opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                transition={{
                  type: "spring",
                  stiffness: 200,
                  damping: 20,
                  delay: 0.05,
                }}
                className="flex-1"
              >
                <PrimaryButton
                  onClick={() => {
                    void handleStop();
                  }}
                  disabled={isStopping}
                  className="w-full"
                  icon={<Square />}
                >
                  計測終了
                </PrimaryButton>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
