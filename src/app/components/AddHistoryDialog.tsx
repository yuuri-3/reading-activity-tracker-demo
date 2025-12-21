import { useState } from "react";
import { useApp } from "../context/AppContext";
import { Button } from "./ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "./ui/dialog";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Textarea } from "./ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";
import { Plus } from "lucide-react";
import { formatDuration } from "../utils/format";

export function AddHistoryDialog() {
  const { books, addHistory, addBookMemo } = useApp();
  const [open, setOpen] = useState(false);
  const [selectedBookId, setSelectedBookId] = useState<string>("");
  const [hours, setHours] = useState("");
  const [minutes, setMinutes] = useState("");
  const [memo, setMemo] = useState("");
  const [bookMemo, setBookMemo] = useState("");
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [time, setTime] = useState(
    new Date().toLocaleTimeString("ja-JP", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    })
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const totalSeconds =
      (parseInt(hours) || 0) * 3600 + (parseInt(minutes) || 0) * 60;

    if (totalSeconds > 0) {
      const endTime = new Date(`${date}T${time}`);
      const startTime = new Date(endTime.getTime() - totalSeconds * 1000);

      const history = {
        duration: totalSeconds,
        memo,
        startTime: startTime.toISOString(),
        endTime: endTime.toISOString(),
        ...(selectedBookId ? { bookId: selectedBookId } : {}),
      };

      addHistory(history);

      // 書籍メモがあり、書籍が選択されている場合は書籍メモを追加
      if (bookMemo.trim() && selectedBookId) {
        addBookMemo(selectedBookId, bookMemo.trim());
      }

      setSelectedBookId("");
      setHours("");
      setMinutes("");
      setMemo("");
      setBookMemo("");
      setDate(new Date().toISOString().split("T")[0]);
      setTime(
        new Date().toLocaleTimeString("ja-JP", {
          hour: "2-digit",
          minute: "2-digit",
          hour12: false,
        })
      );
      setOpen(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline">
          <Plus className="size-4 mr-2" />
          手動登録
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>履歴を手動登録</DialogTitle>
          <DialogDescription>
            過去の計測時間を手動で記録できます
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
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

          <div className="flex gap-2">
            <div className="flex flex-col gap-2 flex-1">
              <Label htmlFor="hours">時間</Label>
              <Input
                id="hours"
                type="number"
                min="0"
                value={hours}
                onChange={(e) => setHours(e.target.value)}
                placeholder="0"
              />
            </div>
            <div className="flex flex-col gap-2 flex-1">
              <Label htmlFor="minutes">分</Label>
              <Input
                id="minutes"
                type="number"
                min="0"
                max="59"
                value={minutes}
                onChange={(e) => setMinutes(e.target.value)}
                placeholder="0"
              />
            </div>
          </div>

          <div className="flex gap-2">
            <div className="flex flex-col gap-2 flex-1">
              <Label htmlFor="date">日付</Label>
              <Input
                id="date"
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
              />
            </div>
            <div className="flex flex-col gap-2 flex-1">
              <Label htmlFor="time">時刻</Label>
              <Input
                id="time"
                type="time"
                value={time}
                onChange={(e) => setTime(e.target.value)}
              />
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="memo">メモ（任意）</Label>
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
              placeholder="例）次回はP.11から読む"
              value={bookMemo}
              onChange={(e) => setBookMemo(e.target.value)}
              rows={3}
            />
          </div>

          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              className="flex-1"
            >
              キャンセル
            </Button>
            <Button
              type="submit"
              className="flex-1"
              disabled={!hours && !minutes}
            >
              登録
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
