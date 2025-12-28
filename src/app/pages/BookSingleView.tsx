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

export type BookSingleViewProps = {
  book: Book;
  onBack: () => void;
};

export function BookSingleView({ book, onBack }: BookSingleViewProps) {
  const {
    updateBook,
    deleteBook,
    getHistoriesByBook,
    getTotalDurationByBook,
    updateHistory,
    deleteHistory,
  } = useApp();

  const [segment, setSegment] = useState<"all" | "reading" | "book">("all");

  const [isEditBookMemoOpen, setIsEditBookMemoOpen] = useState(false);
  const [editingBookMemoId, setEditingBookMemoId] = useState<string | null>(
    null
  );
  const [editingBookMemoText, setEditingBookMemoText] = useState("");

  const [isEditHistoryOpen, setIsEditHistoryOpen] = useState(false);
  const [editingHistoryId, setEditingHistoryId] = useState<string | null>(null);
  const [editingHistoryMemo, setEditingHistoryMemo] = useState("");

  const histories = getHistoriesByBook(book.id);
  const totalDuration = getTotalDurationByBook(book.id);
  const memos = book.memos ?? [];

  const lastHistoryEnd = histories.reduce<string | null>((latest, history) => {
    const t = history.endTime;
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
    const candidates = [book.createdAt, lastMemoAt, lastHistoryEnd].filter(
      Boolean
    ) as string[];
    if (candidates.length === 0) return new Date().toISOString();
    return candidates.reduce((latest, t) =>
      new Date(t).getTime() > new Date(latest).getTime() ? t : latest
    );
  })();

  const allCount = histories.length + memos.length;

  const feedItems = (() => {
    const historyItems = histories.map((h) => ({
      key: `history:${h.id}`,
      kind: "history" as const,
      time: h.endTime || h.createdAt,
      history: h,
    }));
    const memoItems = memos.map((m) => ({
      key: `memo:${m.id}`,
      kind: "memo" as const,
      time: m.createdAt,
      memo: m,
    }));

    const combined = [...historyItems, ...memoItems].sort((a, b) => {
      return new Date(b.time).getTime() - new Date(a.time).getTime();
    });

    switch (segment) {
      case "reading":
        return historyItems.sort(
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
    if (!confirm("この書籍メモを削除しますか？")) return;
    void updateBook(book.id, {
      memos: (book.memos ?? []).filter((m) => m.id !== memoId),
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

  const handleDeleteHistory = (historyId: string) => {
    if (!confirm("この記録を削除しますか？")) return;
    void deleteHistory(historyId);
  };

  const handleOpenEditHistory = (historyId: string) => {
    const history = histories.find((h) => h.id === historyId);
    if (!history) return;
    setEditingHistoryId(historyId);
    setEditingHistoryMemo(history.memo ?? "");
    setIsEditHistoryOpen(true);
  };

  const handleConfirmEditHistory = () => {
    if (!editingHistoryId) return;
    void updateHistory(editingHistoryId, { memo: editingHistoryMemo });
    setIsEditHistoryOpen(false);
    setEditingHistoryId(null);
    setEditingHistoryMemo("");
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
            { value: "reading", text: "記録メモ", amount: histories.length },
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
              if (item.kind === "history") {
                const h = item.history;
                return (
                  <ListCard
                    key={item.key}
                    type="Record"
                    durationSeconds={h.duration}
                    dateTime={h.endTime}
                    recordNote={h.memo}
                    bookName={book.title}
                    tags={h.tags}
                    onDelete={() => handleDeleteHistory(h.id)}
                    onEdit={() => handleOpenEditHistory(h.id)}
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
        open={isEditHistoryOpen}
        onOpenChange={(open) => {
          setIsEditHistoryOpen(open);
          if (!open) {
            setEditingHistoryId(null);
            setEditingHistoryMemo("");
          }
        }}
        title="記録メモを編集"
        description="記録メモを編集します"
        formPatternType="AddRecord"
        cancelLabel="キャンセル"
        confirmLabel="保存"
        onCancel={() => setIsEditHistoryOpen(false)}
        onConfirm={handleConfirmEditHistory}
      >
        <FieldItem
          className="w-full"
          labelProps={{ text: "メモ", showOptionalLabel: true }}
          instance={
            <NeumorphicTextarea
              id="editHistoryMemo"
              value={editingHistoryMemo}
              onChange={(e) => setEditingHistoryMemo(e.target.value)}
              rows={3}
              placeholder="例）P.10まで読んだ"
            />
          }
        />
      </Dialog>
    </div>
  );
}
