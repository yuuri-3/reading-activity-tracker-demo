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
  onClearInputs?: () => void;
};

export function TimerSection({
  memo = "",
  selectedBookId = "",
  bookMemo = "",
  onClearInputs,
}: TimerSectionProps) {
  const {
    timerState,
    startTimer,
    pauseTimer,
    resetTimer,
    addHistory,
    addBookMemo,
  } = useApp();
  const [isStarting, setIsStarting] = useState(false);
  const [isStopping, setIsStopping] = useState(false);
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
    if (isStopping) return;
    const duration = Math.floor(timerState.elapsedTime);
    if (duration <= 0) return;

    setIsStopping(true);
    pauseTimer();

    const watchdogId = window.setTimeout(() => {
      setIsStopping(false);
      toast.error("計測結果の保存に失敗しました");
    }, 8000);

    try {
      const now = new Date();
      const startTime = new Date(now.getTime() - duration * 1000).toISOString();

      await addHistory({
        duration,
        memo,
        startTime,
        endTime: now.toISOString(),
        ...(selectedBookId ? { bookId: selectedBookId } : {}),
      });

      if (bookMemo.trim() && selectedBookId) {
        addBookMemo(selectedBookId, bookMemo.trim());
      }

      resetTimer();
      onClearInputs?.();
      toast.success("計測結果を保存しました");
    } catch (err) {
      console.error(err);
      toast.error("計測結果の保存に失敗しました");
    } finally {
      window.clearTimeout(watchdogId);
      setIsStopping(false);
    }
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
      <div className="flex flex-col items-center gap-8">
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
