import { useState } from "react";

import { Calendar, Clock, FileText } from "lucide-react";

import { useApp } from "../context/AppContext";
import type { Book } from "../types";
import { ListCard } from "../components/ListCard";
import { SegmentedControl } from "../components/SegmentedControl";
import { PrimaryButton } from "../components/PrimaryButton";
import { Dialog } from "../components/Dialog";
import { FieldItem } from "../components/FieldItem";
import { NeumorphicTextarea } from "../components/NeumorphicTextarea";
import { formatDateTime, formatDurationHm } from "../utils/format";
import { toast } from "sonner";

export type BookSingleViewProps = {
  book: Book;
  onBack: () => void;
};

export function BookSingleView({ book, onBack }: BookSingleViewProps) {
  const {
    updateBook,
    deleteBook,
    getRecordsByBook,
    getTotalDurationByBook,
    updateRecord,
    deleteRecord,
  } = useApp();

  const [segment, setSegment] = useState<"all" | "reading" | "book">("all");

  const [isEditBookMemoOpen, setIsEditBookMemoOpen] = useState(false);
  const [editingBookMemoId, setEditingBookMemoId] = useState<string | null>(
    null
  );
  const [editingBookMemoText, setEditingBookMemoText] = useState("");

  const [isEditRecordOpen, setIsEditRecordOpen] = useState(false);
  const [editingRecordId, setEditingRecordId] = useState<string | null>(null);
  const [editingRecordMemo, setEditingRecordMemo] = useState("");

  const records = getRecordsByBook(book.id);
  const totalDuration = getTotalDurationByBook(book.id);
  const memos = book.memos ?? [];

  const lastRecordEnd = records.reduce<string | null>((latest, record) => {
    const t = record.endTime;
    if (!t) return latest;
    if (!latest) return t;
    return new Date(t).getTime() > new Date(latest).getTime() ? t : latest;
  }, null);

  const lastMemoAt = memos.reduce<string | null>((latest, memo) => {
    const t = memo.createdAt;
    if (!t) return latest;
    if (!latest) return t;
    return new Date(t).getTime() > new Date(latest).getTime() ? t : latest;
  }, null);

  const lastActivityAt = (() => {
    const candidates = [book.createdAt, lastMemoAt, lastRecordEnd].filter(
      Boolean
    ) as string[];
    if (candidates.length === 0) return new Date().toISOString();
    return candidates.reduce((latest, t) =>
      new Date(t).getTime() > new Date(latest).getTime() ? t : latest
    );
  })();

  const allCount = records.length + memos.length;

  const feedItems = (() => {
    const recordItems = records.map((r) => ({
      key: `record:${r.id}`,
      kind: "record" as const,
      time: r.endTime || r.createdAt,
      record: r,
    }));
    const memoItems = memos.map((m) => ({
      key: `memo:${m.id}`,
      kind: "memo" as const,
      time: m.createdAt,
      memo: m,
    }));

    const combined = [...recordItems, ...memoItems].sort((a, b) => {
      return new Date(b.time).getTime() - new Date(a.time).getTime();
    });

    switch (segment) {
      case "reading":
        return recordItems.sort(
          (a, b) => new Date(b.time).getTime() - new Date(a.time).getTime()
        );
      case "book":
        return memoItems.sort(
          (a, b) => new Date(b.time).getTime() - new Date(a.time).getTime()
        );
      case "all":
      default:
        return combined;
    }
  })();

  const handleDeleteBook = () => {
    if (confirm("この書籍を削除しますか？")) {
      void deleteBook(book.id);
      onBack();
    }
  };

  const handleDeleteBookMemo = (memoId: string) => {
    const prevMemos = book.memos ?? [];
    const deletedMemo = prevMemos.find((m) => m.id === memoId);
    if (!deletedMemo) return;

    const nextMemos = prevMemos.filter((m) => m.id !== memoId);

    // Show Undo toast immediately (Firestore ack can be slow on mobile networks).
    toast.success("書籍メモを削除しました", {
      action: {
        label: "Undo",
        onClick: () => {
          void updateBook(book.id, { memos: prevMemos }).catch((err) => {
            console.error(err);
            toast.error("書籍メモの復元に失敗しました");
          });
        },
      },
    });

    void updateBook(book.id, { memos: nextMemos }).catch((err) => {
      console.error(err);
      toast.error("書籍メモの削除に失敗しました");
    });
  };

  const handleOpenEditBookMemo = (memoId: string) => {
    const memo = (book.memos ?? []).find((m) => m.id === memoId);
    if (!memo) return;
    setEditingBookMemoId(memoId);
    setEditingBookMemoText(memo.text ?? "");
    setIsEditBookMemoOpen(true);
  };

  const handleConfirmEditBookMemo = () => {
    if (!editingBookMemoId) return;
    void updateBook(book.id, {
      memos: (book.memos ?? []).map((m) =>
        m.id === editingBookMemoId ? { ...m, text: editingBookMemoText } : m
      ),
    });
    setIsEditBookMemoOpen(false);
    setEditingBookMemoId(null);
    setEditingBookMemoText("");
  };

  const handleDeleteRecord = (recordId: string) => {
    if (!confirm("この記録を削除しますか？")) return;
    void deleteRecord(recordId);
  };

  const handleOpenEditRecord = (recordId: string) => {
    const record = records.find((r) => r.id === recordId);
    if (!record) return;
    setEditingRecordId(recordId);
    setEditingRecordMemo(record.memo ?? "");
    setIsEditRecordOpen(true);
  };

  const handleConfirmEditRecord = () => {
    if (!editingRecordId) return;
    void updateRecord(editingRecordId, { memo: editingRecordMemo });
    setIsEditRecordOpen(false);
    setEditingRecordId(null);
    setEditingRecordMemo("");
  };

  return (
    <div className="flex flex-col h-full overflow-hidden p-6">
      <div className="shrink-0 flex flex-col gap-6">
        <button
          onClick={onBack}
          className="text-sm text-muted-foreground hover:text-foreground"
        >
          ← 一覧に戻る
        </button>

        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-medium tracking-[0.02em] text-foreground">
            {book.title}
          </h1>
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-1 text-muted-foreground">
              <Calendar className="size-4" />
              <p className="text-[13px] leading-5 tabular-nums">
                {formatDateTime(lastActivityAt)}
              </p>
            </div>

            <div className="flex items-center gap-2.5 text-muted-foreground">
              <div className="flex items-center gap-1">
                <FileText className="size-4" />
                <p className="text-[13px] leading-5 tabular-nums">
                  {memos.length} notes
                </p>
              </div>

              <div className="flex items-center gap-1">
                <Clock className="size-4" />
                <p className="text-[13px] leading-5 tabular-nums">
                  {formatDurationHm(totalDuration)}
                </p>
              </div>
            </div>
          </div>
        </div>

        <SegmentedControl
          value={segment}
          onValueChange={(v) => setSegment(v as any)}
          className="w-full rounded-full"
          items={[
            { value: "all", text: "すべて", amount: allCount },
            { value: "reading", text: "記録メモ", amount: records.length },
            { value: "book", text: "書籍メモ", amount: memos.length },
          ]}
        />
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto pt-6 pb-28">
        <div className="flex flex-col gap-4">
          {feedItems.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              表示する項目がありません
            </p>
          ) : (
            feedItems.map((item) => {
              if (item.kind === "record") {
                const r = item.record;
                return (
                  <ListCard
                    key={item.key}
                    type="Record"
                    durationSeconds={r.duration}
                    dateTime={r.endTime}
                    recordNote={r.memo}
                    bookName={book.title}
                    tags={r.tags}
                    onDelete={() => handleDeleteRecord(r.id)}
                    onEdit={() => handleOpenEditRecord(r.id)}
                  />
                );
              }

              const m = item.memo;
              return (
                <ListCard
                  key={item.key}
                  type="BookNote"
                  createdAt={m.createdAt}
                  bookName={book.title}
                  bookNote={m.text}
                  onDelete={() => handleDeleteBookMemo(m.id)}
                  onEdit={() => handleOpenEditBookMemo(m.id)}
                />
              );
            })
          )}
        </div>

        <div className="pt-6">
          <PrimaryButton
            onClick={handleDeleteBook}
            className="w-full justify-center text-destructive"
          >
            書籍を削除
          </PrimaryButton>
        </div>
      </div>

      <Dialog
        open={isEditBookMemoOpen}
        onOpenChange={(open) => {
          setIsEditBookMemoOpen(open);
          if (!open) {
            setEditingBookMemoId(null);
            setEditingBookMemoText("");
          }
        }}
        title="書籍メモを編集"
        description="書籍に関するメモを編集します"
        formPatternType="AddRecord"
        cancelLabel="キャンセル"
        confirmLabel="保存"
        onCancel={() => setIsEditBookMemoOpen(false)}
        onConfirm={handleConfirmEditBookMemo}
      >
        <FieldItem
          className="w-full"
          labelProps={{ text: "メモ", showOptionalLabel: false }}
          instance={
            <NeumorphicTextarea
              id="editBookMemo"
              value={editingBookMemoText}
              onChange={(e) => setEditingBookMemoText(e.target.value)}
              rows={3}
              placeholder="例）第2章に具体的な例が多い"
            />
          }
        />
      </Dialog>

      <Dialog
        open={isEditRecordOpen}
        onOpenChange={(open) => {
          setIsEditRecordOpen(open);
          if (!open) {
            setEditingRecordId(null);
            setEditingRecordMemo("");
          }
        }}
        title="記録メモを編集"
        description="記録メモを編集します"
        formPatternType="AddRecord"
        cancelLabel="キャンセル"
        confirmLabel="保存"
        onCancel={() => setIsEditRecordOpen(false)}
        onConfirm={handleConfirmEditRecord}
      >
        <FieldItem
          className="w-full"
          labelProps={{ text: "メモ", showOptionalLabel: true }}
          instance={
            <NeumorphicTextarea
              id="editHistoryMemo"
              value={editingRecordMemo}
              onChange={(e) => setEditingRecordMemo(e.target.value)}
              rows={3}
              placeholder="例）P.10まで読んだ"
            />
          }
        />
      </Dialog>
    </div>
  );
}
