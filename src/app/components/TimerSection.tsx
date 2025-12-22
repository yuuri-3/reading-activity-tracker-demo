import { useState } from "react";
import { useApp } from "../context/AppContext";
import { PrimaryButton } from "./PrimaryButton";
import { FieldItem } from "./FieldItem";
import { NeumorphicTextarea } from "./NeumorphicTextarea";
import { NeumorphicSelectTrigger } from "./NeumorphicSelectTrigger";
import { Select, SelectContent, SelectItem, SelectValue } from "./ui/select";
import { Play, Pause, Square } from "lucide-react";
import { formatDuration } from "../utils/format";
import { SaveTimerDialog } from "./SaveTimerDialog";
import { AnimatePresence, motion } from "motion/react";

export function TimerSection() {
  const { timerState, startTimer, pauseTimer, books } = useApp();
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [selectedBookId, setSelectedBookId] = useState<string>("");
  const [memo, setMemo] = useState("");
  const [bookMemo, setBookMemo] = useState("");

  const handleStop = () => {
    if (timerState.elapsedTime > 0) {
      pauseTimer();
      setShowSaveDialog(true);
    }
  };

  const getStartTimeText = () => {
    if (timerState.elapsedTime === 0) return "";
    const startTime = new Date(Date.now() - timerState.elapsedTime * 1000);
    const month = startTime.getMonth() + 1;
    const day = startTime.getDate();
    const hours = startTime.getHours().toString().padStart(2, "0");
    const minutes = startTime.getMinutes().toString().padStart(2, "0");
    return `${month}/${day} ${hours}:${minutes}から計測開始`;
  };

  return (
    <>
      <div className="flex flex-col gap-8">
        <div className="w-full">
          <div className="flex flex-col items-center gap-10 p-6">
            <div className="flex flex-col items-center gap-2">
              <p className="tabular-nums text-[96px] leading-[96px] text-foreground font-['Allerta_Stencil']">
                {formatDuration(timerState.elapsedTime)}
              </p>
              {timerState.elapsedTime > 0 && (
                <p className="text-center text-sm text-muted-foreground">
                  {getStartTimeText()}
                </p>
              )}
            </div>

            <div className="relative flex w-full justify-center">
              <AnimatePresence mode="wait">
                {!timerState.isRunning ? (
                  <motion.div
                    key="start-button"
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ transition: { duration: 0.5 } }}
                    className="w-full"
                  >
                    <PrimaryButton
                      onClick={startTimer}
                      className="w-full overflow-hidden"
                      icon={<Play />}
                    >
                      <motion.span
                        className="flex items-center"
                        exit={{ opacity: 0, transition: { duration: 0.15 } }}
                      >
                        {timerState.elapsedTime > 0 ? "再開" : "Start"}
                      </motion.span>
                    </PrimaryButton>
                  </motion.div>
                ) : (
                  <motion.div
                    key="control-buttons"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.3, delay: 0.2 }}
                    className="flex w-full gap-4"
                  >
                    <motion.div
                      initial={{ x: "100%", opacity: 0 }}
                      animate={{ x: 0, opacity: 1 }}
                      transition={{
                        type: "spring",
                        stiffness: 200,
                        damping: 20,
                        delay: 0.2,
                      }}
                      className="flex-1"
                    >
                      <PrimaryButton
                        onClick={pauseTimer}
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
                        delay: 0.2,
                      }}
                      className="flex-1"
                    >
                      <PrimaryButton
                        onClick={handleStop}
                        className="w-full"
                        icon={<Square />}
                      >
                        停止
                      </PrimaryButton>
                    </motion.div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>

        <div className="flex w-full flex-col gap-6">
          <FieldItem
            className="w-full"
            labelProps={{ text: "メモ" }}
            instance={
              <NeumorphicTextarea
                id="memo"
                placeholder="例）P.10まで読んだ"
                value={memo}
                onChange={(e) => setMemo(e.target.value)}
                rows={3}
              />
            }
          />

          <FieldItem
            className="w-full"
            labelProps={{ text: "書籍" }}
            instance={
              <Select value={selectedBookId} onValueChange={setSelectedBookId}>
                <NeumorphicSelectTrigger id="book">
                  <SelectValue placeholder="選択なし" />
                </NeumorphicSelectTrigger>
                <SelectContent>
                  {books.map((book) => (
                    <SelectItem key={book.id} value={book.id}>
                      {book.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            }
          />

          <FieldItem
            className="w-full"
            labelProps={{ text: "書籍に関するメモ" }}
            instance={
              <NeumorphicTextarea
                id="bookMemo"
                placeholder="例）P.10まで読んだ"
                value={bookMemo}
                onChange={(e) => setBookMemo(e.target.value)}
                rows={3}
              />
            }
          />
        </div>
      </div>

      <SaveTimerDialog
        open={showSaveDialog}
        onOpenChange={setShowSaveDialog}
        duration={timerState.elapsedTime}
        selectedBookId={selectedBookId}
        setSelectedBookId={setSelectedBookId}
        memo={memo}
        setMemo={setMemo}
        bookMemo={bookMemo}
        setBookMemo={setBookMemo}
      />
    </>
  );
}
