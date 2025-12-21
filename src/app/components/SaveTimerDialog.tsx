import { useRef, useState } from "react";
import { useApp } from "../context/AppContext";
import { Button } from "./ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "./ui/dialog";
import { Input } from "./ui/input";
import { Textarea } from "./ui/textarea";
import { Label } from "./ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";
import { formatDuration } from "../utils/format";

interface SaveTimerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  duration: number;

  // optional controlled fields (for TimerSection etc)
  selectedBookId?: string;
  setSelectedBookId?: (value: string) => void;
  memo?: string;
  setMemo?: (value: string) => void;
  bookMemo?: string;
  setBookMemo?: (value: string) => void;
}

export function SaveTimerDialog({
  open,
  onOpenChange,
  duration,
  selectedBookId: controlledSelectedBookId,
  setSelectedBookId: setControlledSelectedBookId,
  memo: controlledMemo,
  setMemo: setControlledMemo,
  bookMemo: controlledBookMemo,
  setBookMemo: setControlledBookMemo,
}: SaveTimerDialogProps) {
  const { books, addHistory, addBookMemo, resetTimer } = useApp();
  const [uncontrolledSelectedBookId, setUncontrolledSelectedBookId] =
    useState<string>("");
  const [uncontrolledMemo, setUncontrolledMemo] = useState("");
  const [uncontrolledBookMemo, setUncontrolledBookMemo] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const allowCloseRef = useRef(false);

  const selectedBookId = controlledSelectedBookId ?? uncontrolledSelectedBookId;
  const setSelectedBookId =
    setControlledSelectedBookId ?? setUncontrolledSelectedBookId;
  const memo = controlledMemo ?? uncontrolledMemo;
  const setMemo = setControlledMemo ?? setUncontrolledMemo;
  const bookMemo = controlledBookMemo ?? uncontrolledBookMemo;
  const setBookMemo = setControlledBookMemo ?? setUncontrolledBookMemo;

  const resetForm = () => {
    setSelectedBookId("");
    setMemo("");
    setBookMemo("");
    setSaveError(null);
    setIsSaving(false);
  };

  const handleSave = async () => {
    setSaveError(null);
    setIsSaving(true);
    try {
      const now = new Date();
      const startTime = new Date(now.getTime() - duration * 1000).toISOString();

      const history = {
        duration: Math.floor(duration),
        memo,
        startTime,
        endTime: now.toISOString(),
        ...(selectedBookId ? { bookId: selectedBookId } : {}),
      };

      await addHistory(history);

      // 書籍メモがあり、書籍が選択されている場合は書籍メモを追加
      if (bookMemo.trim() && selectedBookId) {
        addBookMemo(selectedBookId, bookMemo.trim());
      }

      resetTimer();
      resetForm();
      allowCloseRef.current = true;
      onOpenChange(false);
    } catch (err) {
      setSaveError(
        err instanceof Error ? err.message : "履歴の保存に失敗しました"
      );
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    resetTimer();
    resetForm();
    allowCloseRef.current = true;
    onOpenChange(false);
  };

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen && !allowCloseRef.current) {
      return;
    }
    if (!newOpen) {
      allowCloseRef.current = false;
    }
    onOpenChange(newOpen);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent
        onEscapeKeyDown={(e) => e.preventDefault()}
        onInteractOutside={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle>計測結果を保存</DialogTitle>
          <DialogDescription>
            計測時間を記録し、書籍やメモを関連付けることができます
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label>計測時間</Label>
            <p>{formatDuration(duration)}</p>
          </div>

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
              placeholder="例）この章は難しい"
              value={bookMemo}
              onChange={(e) => setBookMemo(e.target.value)}
              rows={3}
            />
          </div>

          {saveError && (
            <div className="text-sm text-destructive whitespace-pre-wrap">
              {saveError}
            </div>
          )}

          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={handleCancel}
              className="flex-1"
              disabled={isSaving}
            >
              破棄
            </Button>
            <Button
              onClick={() => {
                void handleSave();
              }}
              className="flex-1"
              disabled={isSaving}
            >
              保存
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
