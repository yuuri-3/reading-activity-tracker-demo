import { useMemo, useState } from "react";

import { useApp } from "../context/AppContext";
import type { Book } from "../types";
import { ListCard } from "../components/ListCard";
import { SegmentedControl } from "../components/SegmentedControl";
import { PrimaryButton } from "../components/PrimaryButton";
import { Dialog } from "../components/Dialog";
import { FieldItem } from "../components/FieldItem";
import { NeumorphicTextarea } from "../components/NeumorphicTextarea";
import { formatDateTime, formatDurationHms } from "../utils/format";
import { toast } from "sonner";
import { Tag as TagChip } from "../components/Tag";
import { IconBack } from "../components/icons/IconBack";
import { IconClock } from "../components/icons/IconClock";
import { IconBookRibbon } from "../components/icons/IconBookRibbon";
import { IconNoteStack } from "../components/icons/IconNoteStack";
import { parseRecordMemo, serializeRecordMemo } from "../utils/recordMemoMeta";

export type BookSingleViewProps = {
  book: Book;
  onBack: () => void;
};

export function BookSingleView({ book, onBack }: BookSingleViewProps) {
  const {
    updateBook,
    deleteBook,
    updateBookMemo,
    deleteBookMemo,
    restoreBookMemo,
    tags,
    getRecordsByBook,
    getTotalDurationByBook,
    updateRecord,
    deleteRecord,
  } = useApp();

  const tagsById = useMemo(() => {
    return new Map(tags.map((t) => [t.id, t.text] as const));
  }, [tags]);

  const [segment, setSegment] = useState<"all" | "reading" | "book">("all");
  const [selectedBookMemoTagId, setSelectedBookMemoTagId] = useState("");

  const [isEditBookMemoOpen, setIsEditBookMemoOpen] = useState(false);
  const [editingBookMemoId, setEditingBookMemoId] = useState<string | null>(
    null,
  );
  const [editingBookMemoText, setEditingBookMemoText] = useState("");

  const [isEditRecordOpen, setIsEditRecordOpen] = useState(false);
  const [editingRecordId, setEditingRecordId] = useState<string | null>(null);
  const [editingRecordRawMemo, setEditingRecordRawMemo] = useState("");
  const [editingRecordMemo, setEditingRecordMemo] = useState("");

  const records = getRecordsByBook(book.id);
  const totalDuration = getTotalDurationByBook(book.id);
  const memos = book.memos ?? [];
  const memoTagIdsByMemoId = useMemo(() => {
    const byMemoId = new Map<string, string[]>();

    for (const record of records) {
      if (!record.bookMemoId) continue;
      const ids = record.tagIds ?? [];
      if (ids.length === 0) continue;

      const existing = byMemoId.get(record.bookMemoId) ?? [];
      const next = [...existing];
      for (const id of ids) {
        if (id && !next.includes(id)) {
          next.push(id);
        }
      }
      byMemoId.set(record.bookMemoId, next);
    }

    return byMemoId;
  }, [records]);

  const bookMemoTagOptions = useMemo(() => {
    const ids = new Set<string>();
    for (const memo of memos) {
      for (const id of memoTagIdsByMemoId.get(memo.id) ?? []) {
        ids.add(id);
      }
    }

    return Array.from(ids).sort((a, b) =>
      (tagsById.get(a) ?? a).localeCompare(tagsById.get(b) ?? b, "ja"),
    );
  }, [memos, memoTagIdsByMemoId, tagsById]);

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
      Boolean,
    ) as string[];
    if (candidates.length === 0) return new Date().toISOString();
    return candidates.reduce((latest, t) =>
      new Date(t).getTime() > new Date(latest).getTime() ? t : latest,
    );
  })();

  const allCount = records.length + memos.length;

  const feedItems = (() => {
    const recordItems = records.map((r) => ({
      key: `record:${r.id}`,
      kind: "record" as const,
      time: r.startTime || r.createdAt,
      record: r,
    }));
    const memoSource =
      segment === "book" && selectedBookMemoTagId
        ? memos.filter((m) =>
            (memoTagIdsByMemoId.get(m.id) ?? []).includes(
              selectedBookMemoTagId,
            ),
          )
        : memos;

    const memoItems = memoSource.map((m) => ({
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
          (a, b) => new Date(b.time).getTime() - new Date(a.time).getTime(),
        );
      case "book":
        return memoItems.sort(
          (a, b) => new Date(b.time).getTime() - new Date(a.time).getTime(),
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

    // Show Undo toast immediately (Firestore ack can be slow on mobile networks).
    toast.success("書籍メモを削除しました", {
      action: {
        label: "Undo",
        onClick: () => {
          void restoreBookMemo(book.id, deletedMemo).catch((err) => {
            console.error(err);
            toast.error("書籍メモの復元に失敗しました");
          });
        },
      },
    });

    void deleteBookMemo(book.id, memoId).catch((err) => {
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
    void updateBookMemo(book.id, editingBookMemoId, {
      text: editingBookMemoText,
    }).catch((err) => {
      console.error(err);
      toast.error("書籍メモの更新に失敗しました");
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
    const rawMemo = record.memo ?? "";
    const parsedMemo = parseRecordMemo(rawMemo);
    setEditingRecordRawMemo(rawMemo);
    setEditingRecordMemo(parsedMemo.body);
    setIsEditRecordOpen(true);
  };

  const handleConfirmEditRecord = () => {
    if (!editingRecordId) return;
    const parsedCurrentMemo = parseRecordMemo(editingRecordRawMemo);
    const nextMemo = serializeRecordMemo({
      body: editingRecordMemo,
      meta: parsedCurrentMemo.meta,
    });
    void updateRecord(editingRecordId, { memo: nextMemo });
    setIsEditRecordOpen(false);
    setEditingRecordId(null);
    setEditingRecordRawMemo("");
    setEditingRecordMemo("");
  };

  return (
    <div className="flex flex-col h-full w-full overflow-hidden">
      <div className="shrink-0">
        <div className="max-w-2xl mx-auto">
          <header className="sticky top-0 z-30 flex flex-col gap-2 px-6 pt-8 pb-4 backdrop-blur-lg bg-[rgba(232,237,242,0.9)] supports-[backdrop-filter]:bg-[rgba(232,237,242,0.75)]">
            <button
              type="button"
              onClick={onBack}
              className="inline-flex items-center gap-0.5 text-[14px] font-normal leading-5 text-foreground"
            >
              <IconBack size={5} />
              <span className="pb-[2px]">戻る</span>
            </button>

            <div className="flex flex-col gap-6 pt-2">
              <div className="flex flex-col gap-1">
                <h1 className="text-2xl font-medium tracking-[0.02em] text-foreground">
                  {book.title}
                </h1>
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-1 text-muted-foreground">
                    <IconBookRibbon size={4} />
                    <p className="text-[13px] leading-5 tabular-nums">
                      {formatDateTime(lastActivityAt)}
                    </p>
                  </div>

                  <div className="flex items-center gap-2.5 text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <IconNoteStack size={4} />
                      <p className="text-[13px] leading-5 tabular-nums">
                        {memos.length} notes
                      </p>
                    </div>

                    <div className="flex items-center gap-1">
                      <IconClock size={4} />
                      <p className="text-[13px] leading-5 tabular-nums">
                        {formatDurationHms(totalDuration)}
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
                  {
                    value: "reading",
                    text: "記録メモ",
                    amount: records.length,
                  },
                  { value: "book", text: "書籍メモ", amount: memos.length },
                ]}
              />

              {segment === "book" && bookMemoTagOptions.length > 0 ? (
                <div className="flex flex-col gap-2">
                  <p className="text-xs text-muted-foreground">
                    タグで絞り込み
                  </p>
                  <div className="flex flex-wrap gap-2">
                    <TagChip asChild>
                      <button
                        type="button"
                        onClick={() => setSelectedBookMemoTagId("")}
                        className={
                          selectedBookMemoTagId
                            ? "opacity-70 hover:opacity-100 transition-opacity"
                            : ""
                        }
                      >
                        すべて
                      </button>
                    </TagChip>
                    {bookMemoTagOptions.map((id) => {
                      const label = tagsById.get(id) ?? id;
                      const selected = selectedBookMemoTagId === id;
                      return (
                        <TagChip key={id} asChild>
                          <button
                            type="button"
                            onClick={() => setSelectedBookMemoTagId(id)}
                            className={
                              selected
                                ? ""
                                : "opacity-70 hover:opacity-100 transition-opacity"
                            }
                          >
                            {label}
                          </button>
                        </TagChip>
                      );
                    })}
                  </div>
                </div>
              ) : null}
            </div>
          </header>
        </div>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto">
        <div className="max-w-2xl mx-auto px-6 pt-6 pb-28">
          <div className="flex flex-col gap-4">
            {feedItems.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                表示する項目がありません
              </p>
            ) : (
              feedItems.map((item) => {
                if (item.kind === "record") {
                  const r = item.record;
                  const parsedRecordMemo = parseRecordMemo(r.memo ?? "");

                  const tagsNode = (() => {
                    const ids = r.tagIds ?? [];
                    if (ids.length > 0) {
                      return ids.map((id) => (
                        <TagChip key={id}>{tagsById.get(id) ?? id}</TagChip>
                      ));
                    }

                    return undefined;
                  })();

                  return (
                    <ListCard
                      key={item.key}
                      type="Record"
                      durationSeconds={r.duration}
                      dateTime={r.startTime}
                      {...(parsedRecordMemo.meta.source_url
                        ? { sourceUrl: parsedRecordMemo.meta.source_url }
                        : {})}
                      recordNote={parsedRecordMemo.body}
                      bookName={book.title}
                      tagsNode={tagsNode}
                      onDelete={() => handleDeleteRecord(r.id)}
                      onEdit={() => handleOpenEditRecord(r.id)}
                    />
                  );
                }

                const m = item.memo;
                const memoTagsNode = (() => {
                  const ids = memoTagIdsByMemoId.get(m.id) ?? [];
                  if (ids.length === 0) return undefined;
                  return ids.map((id) => (
                    <TagChip key={id}>{tagsById.get(id) ?? id}</TagChip>
                  ));
                })();
                return (
                  <ListCard
                    key={item.key}
                    type="BookNote"
                    createdAt={m.createdAt}
                    bookName={book.title}
                    bookNote={m.text}
                    {...(memoTagsNode ? { tagsNode: memoTagsNode } : {})}
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
              rows={2}
              autoResize
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
            setEditingRecordRawMemo("");
            setEditingRecordMemo("");
          }
        }}
        title="記録メモを編集"
        description="記録メモを編集します"
        formPatternType="AddRecord"
        stickyHeader
        contentClassName="sm:max-w-[720px]"
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
              rows={2}
              autoResize
              placeholder="例）P.10まで読んだ"
            />
          }
        />
      </Dialog>
    </div>
  );
}
