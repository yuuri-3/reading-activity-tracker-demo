import { useState } from "react";
import { useApp } from "../context/AppContext";
import { Button } from "./ui/button";
import { Label } from "./ui/label";
import { Textarea } from "./ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";
import { Play, Pause, Square } from "lucide-react";
import { formatDuration } from "../utils/format";
import { SaveTimerDialog } from "./SaveTimerDialog";

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

  return (
    <>
      <div className="flex flex-col gap-8 p-6 rounded-xl bg-card border-0 [box-shadow:var(--shadow-neumorphism)]">
        <div className="flex items-center justify-center min-h-[80px]">
          <p className="text-6xl tabular-nums">
            {formatDuration(timerState.elapsedTime)}
          </p>
        </div>

        <div className="flex gap-4 justify-center">
          {!timerState.isRunning ? (
            <Button
              onClick={startTimer}
              className="h-24 w-24 rounded-full p-0 flex flex-col items-center justify-center gap-1.5"
              size="lg"
            >
              <Play className="size-9" />
              <span className="text-sm">
                {timerState.elapsedTime > 0 ? "再開" : "計測開始"}
              </span>
            </Button>
          ) : (
            <>
              <Button
                onClick={pauseTimer}
                variant="outline"
                className="flex-1"
                size="lg"
              >
                <Pause className="size-4 mr-2" />
                一時停止
              </Button>
              <Button
                onClick={handleStop}
                variant="outline"
                className="flex-1"
                size="lg"
              >
                <Square className="size-4 mr-2" />
                停止
              </Button>
            </>
          )}
        </div>

        {timerState.isRunning && (
          <p className="text-center text-sm text-muted-foreground">計測中</p>
        )}
      </div>

      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-2">
          <Label htmlFor="book">書籍（任意）</Label>
          <Select value={selectedBookId} onValueChange={setSelectedBookId}>
            <SelectTrigger id="book">
              <SelectValue placeholder="選択なし" />
            </SelectTrigger>
            <SelectContent>
              {books.map((book) => (
                <SelectItem key={book.id} value={book.id}>
                  {book.title}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex flex-col gap-2">
          <Label htmlFor="memo">履歴メモ（任意）</Label>
          <Textarea
            id="memo"
            placeholder="例）P.10まで読んだ"
            value={memo}
            onChange={(e) => setMemo(e.target.value)}
            rows={3}
          />
        </div>

        <div className="flex flex-col gap-2">
          <Label htmlFor="bookMemo">書籍メモ（任意）</Label>
          <Textarea
            id="bookMemo"
            placeholder="例）この章は難しい"
            value={bookMemo}
            onChange={(e) => setBookMemo(e.target.value)}
            rows={3}
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
