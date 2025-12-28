import { useMemo, useRef, useState } from "react";
import { useApp } from "../context/AppContext";
import { NeumorphicTextarea } from "./NeumorphicTextarea";
import { Select, SelectContent, SelectItem, SelectValue } from "./ui/select";
import { NeumorphicSelectTrigger } from "./NeumorphicSelectTrigger";
import { formatDuration } from "../utils/format";
import { Dialog } from "./Dialog";
import { FieldItem } from "./FieldItem";
import { TagMultiSelectInput } from "./TagMultiSelectInput";

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
  const { books, histories, addHistory, addBookMemo, resetTimer } = useApp();
  const [uncontrolledSelectedBookId, setUncontrolledSelectedBookId] =
    useState<string>("");
  const [uncontrolledMemo, setUncontrolledMemo] = useState("");
  const [uncontrolledBookMemo, setUncontrolledBookMemo] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const allowCloseRef = useRef(false);

  const tagOptions = useMemo(() => {
    const unique = new Map<string, string>();
    for (const h of histories) {
      for (const t of h.tags ?? []) {
        const trimmed = t.trim();
        if (!trimmed) continue;
        const key = trimmed.toLocaleLowerCase();
        if (!unique.has(key)) unique.set(key, trimmed);
      }
    }
    return Array.from(unique.values()).sort((a, b) => a.localeCompare(b, "ja"));
  }, [histories]);

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
    setTags([]);
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
        ...(tags.length ? { tags } : {}),
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
    <Dialog
      open={open}
      onOpenChange={handleOpenChange}
      title="計測結果を保存"
      description="計測時間を記録し、書籍やメモを関連付けることができます"
      formPatternType="AddRecord"
      cancelLabel="破棄"
      confirmLabel="保存"
      onCancel={handleCancel}
      onConfirm={() => {
        void handleSave();
      }}
      disableEscapeClose
      disableOutsideClose
      cancelButtonProps={{ disabled: isSaving }}
      confirmButtonProps={{ disabled: isSaving }}
    >
      <div className="flex flex-col gap-4">
        <FieldItem
          className="w-full"
          labelProps={{ text: "計測時間", showOptionalLabel: false }}
          instance={<p className="text-sm">{formatDuration(duration)}</p>}
        />

        <FieldItem
          className="w-full"
          labelProps={{ text: "書籍", showOptionalLabel: true }}
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
          labelProps={{ text: "メモ", showOptionalLabel: true }}
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
          labelProps={{ text: "書籍メモ", showOptionalLabel: true }}
          instance={
            <NeumorphicTextarea
              id="bookMemo"
              placeholder="例）この章は難しい"
              value={bookMemo}
              onChange={(e) => setBookMemo(e.target.value)}
              rows={3}
            />
          }
        />

        <FieldItem
          className="w-full"
          labelProps={{ text: "タグ", showOptionalLabel: true }}
          instance={
            <TagMultiSelectInput
              id="tags"
              value={tags}
              onChange={setTags}
              options={tagOptions}
              placeholder="タグを入力してEnterで追加（日本語確定後はもう一度Enter）"
              disabled={isSaving}
            />
          }
        />

        {saveError && (
          <div className="text-sm text-destructive whitespace-pre-wrap">
            {saveError}
          </div>
        )}
      </div>
    </Dialog>
  );
}
