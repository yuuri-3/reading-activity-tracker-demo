import { useEffect, useRef, useState } from "react";
import { useApp } from "../context/AppContext";
import { PrimaryButton } from "./PrimaryButton";
import { Play, Pause, Square } from "lucide-react";
import { formatDuration } from "../utils/format";
import { AnimatePresence, motion } from "motion/react";
import { toast } from "sonner";

export type TimerSectionProps = {
  memo?: string;
  selectedBookId?: string;
  bookMemo?: string;
  tags?: string[];
  onClearInputs?: () => void;
};

export function TimerSection({
  memo = "",
  selectedBookId = "",
  bookMemo = "",
  tags = [],
  onClearInputs,
}: TimerSectionProps) {
  const {
    timerState,
    startTimer,
    pauseTimer,
    resetTimer,
    addRecord,
    addBookMemo,
  } = useApp();
  const [isStarting, setIsStarting] = useState(false);
  const [isStopping, setIsStopping] = useState(false);
  const stopInFlightRef = useRef(false);
  const startTimeoutRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (startTimeoutRef.current !== null) {
        window.clearTimeout(startTimeoutRef.current);
        startTimeoutRef.current = null;
      }
    };
  }, []);

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
    const tagsSnapshot = tags;

    const now = new Date();
    const startTime = new Date(now.getTime() - duration * 1000).toISOString();

    // Unlock UI immediately after stopping, so the user can start the next
    // measurement even if the network save is slow.
    resetTimer();
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
      ...(tagsSnapshot.length ? { tags: tagsSnapshot } : {}),
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

  const getStartTimeText = () => {
    if (timerState.elapsedTime === 0) return "";
    const startTime = new Date(Date.now() - timerState.elapsedTime * 1000);
    const formatted = new Intl.DateTimeFormat("ja-JP", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    }).format(startTime);
    return `${formatted}から計測開始`;
  };

  const isRunningUi = timerState.isRunning || isStopping;

  return (
    <div className="mx-auto w-[345px] p-6">
      <div className="flex flex-col items-center gap-6">
        <div className="flex flex-col items-center gap-4">
          <p className="tabular-nums font-['Allerta_Stencil'] text-[96px] leading-[96px] text-foreground">
            {formatDuration(timerState.elapsedTime)}
          </p>
          <div className="flex h-5 items-center justify-center">
            {timerState.elapsedTime > 0 ? (
              <p className="text-center text-[14px] leading-5 text-muted-foreground">
                {getStartTimeText()}
              </p>
            ) : null}
          </div>
        </div>

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
    </div>
  );
}
