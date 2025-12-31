import { useMemo, useRef, useState, type ReactNode } from "react";
import { Clock, Plus } from "lucide-react";
import { toast } from "sonner";

import { useApp } from "../context/AppContext";
import { formatDurationHms } from "../utils/format";
import { Header } from "../components/Header";
import { IconRecord } from "../components/icons/IconRecord";
import { ListCard } from "../components/ListCard";
import { ListEmptyView } from "../components/ListEmptyView";
import { PrimaryButton } from "../components/PrimaryButton";
import { Dialog } from "../components/Dialog";
import { FieldItem } from "../components/FieldItem";
import { NeumorphicInput } from "../components/NeumorphicInput";
import { NeumorphicTextarea } from "../components/NeumorphicTextarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectNoneItem,
  SelectValue,
  fromSelectValue,
  toSelectValue,
} from "../components/ui/select";
import { TagMultiSelectInput } from "../components/TagMultiSelectInput";
import { NeumorphicSelectTrigger } from "../components/NeumorphicSelectTrigger";
import type { Book, BookMemo, ReadingRecord } from "../types";
import { Tag } from "../components/Tag";
import { useElementScrollRestoration } from "../utils/useElementScrollRestoration";

type RecordsSegment = "all" | "reading" | "book";

type SearchItem =
  | {
      kind: "record";
      key: string;
      timestamp: string;
      record: ReadingRecord;
      matchedMemo: boolean;
      matchedTags: boolean;
    }
  | {
      kind: "bookMemo";
      key: string;
      timestamp: string;
      book: Book;
      memo: BookMemo;
    };

function toDayKey(date: Date) {
  const pad2 = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(
    date.getDate()
  )}`;
}

function highlightText(text: string, query: string): ReactNode {
  const q = query.trim();
  if (!text || !q) return text;

  const lowerText = text.toLowerCase();
  const lowerQuery = q.toLowerCase();
  const parts: Array<ReactNode> = [];
  let start = 0;
  while (start < text.length) {
    const idx = lowerText.indexOf(lowerQuery, start);
    if (idx === -1) break;
    if (idx > start) parts.push(text.slice(start, idx));
    parts.push(
      <mark
        key={`${idx}-${q}`}
        className="bg-[var(--search-highlight)] text-[var(--search-highlight-foreground)] rounded-[2px] px-0.5"
      >
        {text.slice(idx, idx + q.length)}
      </mark>
    );
    start = idx + q.length;
  }

  if (parts.length === 0) return text;
  if (start < text.length) parts.push(text.slice(start));
  return <>{parts}</>;
}

function toLocalDateTimeInputValue(date: Date) {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(
    date.getDate()
  )}T${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(
    date.getSeconds()
  )}`;
}

function getDefaultAddRecordDateTimeValues(openedAt: Date = new Date()) {
  const end = openedAt;
  const start = new Date(end.getTime() - 30 * 60 * 1000);
  return {
    startAt: toLocalDateTimeInputValue(start),
    endAt: toLocalDateTimeInputValue(end),
  };
}

export function RecordSingleView() {
  const {
    records,
    books,
    addRecord,
    updateRecord,
    deleteRecord,
    restoreRecord,
    addBookMemo,
    getBook,
  } = useApp();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedSegment, setSelectedSegment] = useState<RecordsSegment>("all");

  const normalizedQuery = searchQuery.trim().toLowerCase();
  const isSearchActive = normalizedQuery.length > 0;

  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [editingRecordId, setEditingRecordId] = useState<string | null>(null);
  const [selectedBookId, setSelectedBookId] = useState<string>("");
  const [memo, setMemo] = useState("");
  const [bookMemo, setBookMemo] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [startAt, setStartAt] = useState(
    () => getDefaultAddRecordDateTimeValues().startAt
  );
  const [endAt, setEndAt] = useState(
    () => getDefaultAddRecordDateTimeValues().endAt
  );
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const scrollContainerRef = useRef<HTMLDivElement | null>(null);
  useElementScrollRestoration(scrollContainerRef, "records");

  const tagOptions = useMemo(() => {
    const unique = new Map<string, string>();
    for (const record of records) {
      for (const t of record.tags ?? []) {
        const trimmed = t.trim();
        if (!trimmed) continue;
        const key = trimmed.toLocaleLowerCase();
        if (!unique.has(key)) unique.set(key, trimmed);
      }
    }
    return Array.from(unique.values()).sort((a, b) => a.localeCompare(b, "ja"));
  }, [records]);

  const durationSeconds = useMemo(() => {
    const start = startAt ? new Date(startAt) : null;
    const end = endAt ? new Date(endAt) : null;
    if (
      !start ||
      !end ||
      Number.isNaN(start.getTime()) ||
      Number.isNaN(end.getTime())
    ) {
      return 0;
    }
    const diff = Math.floor((end.getTime() - start.getTime()) / 1000);
    return diff > 0 ? diff : 0;
  }, [startAt, endAt]);

  const resetAddForm = () => {
    const defaults = getDefaultAddRecordDateTimeValues();
    setEditingRecordId(null);
    setSelectedBookId("");
    setMemo("");
    setBookMemo("");
    setTags([]);
    setStartAt(defaults.startAt);
    setEndAt(defaults.endAt);
    setSaveError(null);
    setIsSaving(false);
  };

  const handleOpenAddDialog = () => {
    resetAddForm();
    setIsAddDialogOpen(true);
  };

  const handleOpenEditDialog = (recordId: string) => {
    const record = records.find((r) => r.id === recordId);
    if (!record) return;

    resetAddForm();
    setEditingRecordId(record.id);
    setSelectedBookId(record.bookId ?? "");
    setMemo(record.memo ?? "");
    setBookMemo("");
    setTags(record.tags ?? []);

    const start = new Date(record.startTime);
    const end = new Date(record.endTime);
    if (!Number.isNaN(start.getTime())) {
      setStartAt(toLocalDateTimeInputValue(start));
    }
    if (!Number.isNaN(end.getTime())) {
      setEndAt(toLocalDateTimeInputValue(end));
    }

    setIsAddDialogOpen(true);
  };

  const handleCancelAdd = () => {
    resetAddForm();
    setIsAddDialogOpen(false);
  };

  const handleConfirmAdd = async () => {
    setSaveError(null);
    setIsSaving(true);
    try {
      const start = new Date(startAt);
      const end = new Date(endAt);
      if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
        throw new Error("開始日時・終了日時を正しく入力してください");
      }

      const duration = Math.floor((end.getTime() - start.getTime()) / 1000);
      if (duration <= 0) {
        throw new Error("終了日時は開始日時より後にしてください");
      }

      if (editingRecordId) {
        await updateRecord(editingRecordId, {
          duration,
          memo,
          startTime: start.toISOString(),
          endTime: end.toISOString(),
          // 編集時は、解除(空文字)も反映させるため常に送る
          bookId: selectedBookId,
          // 編集時は、タグを全て外した場合(空配列)も反映させるため常に送る
          tags,
        });
      } else {
        await addRecord({
          duration,
          memo,
          startTime: start.toISOString(),
          endTime: end.toISOString(),
          ...(selectedBookId ? { bookId: selectedBookId } : {}),
          ...(tags.length ? { tags } : {}),
        });
      }

      if (bookMemo.trim() && selectedBookId) {
        addBookMemo(selectedBookId, bookMemo.trim());
      }

      resetAddForm();
      setIsAddDialogOpen(false);
    } catch (err) {
      setSaveError(
        err instanceof Error ? err.message : "記録の追加に失敗しました"
      );
      setIsSaving(false);
    }
  };

  const handleDelete = async (recordId: string) => {
    const deletedRecord = records.find((r) => r.id === recordId);

    // Firestore write acknowledgements can be delayed on poor networks.
    // Show the Undo toast immediately, and only show an error if the delete fails.
    toast.success("記録を削除しました", {
      action: deletedRecord
        ? {
            label: "Undo",
            onClick: () => {
              void restoreRecord(deletedRecord).catch((err) => {
                console.error(err);
                toast.error("記録の復元に失敗しました");
              });
            },
          }
        : undefined,
    });

    void deleteRecord(recordId).catch((err) => {
      console.error(err);
      toast.error("記録の削除に失敗しました");
    });
  };

  const handleSearchQueryChange = (value: string) => {
    setSearchQuery(value);
    if (!value.trim()) {
      setSelectedSegment("all");
    }
  };

  const recordSearchItems = useMemo(() => {
    if (!isSearchActive) return [] as SearchItem[];

    return records
      .map((record) => {
        const memoText = (record.memo ?? "").toLowerCase();
        const tags = record.tags ?? [];
        const matchedMemo = memoText.includes(normalizedQuery);
        const matchedTags = tags.some((t) =>
          t.trim().toLowerCase().includes(normalizedQuery)
        );

        if (!matchedMemo && !matchedTags) return null;

        return {
          kind: "record" as const,
          key: `record:${record.id}`,
          timestamp: record.startTime,
          record,
          matchedMemo,
          matchedTags,
        };
      })
      .filter(Boolean) as SearchItem[];
  }, [records, isSearchActive, normalizedQuery]);

  const bookMemoSearchItems = useMemo(() => {
    if (!isSearchActive) return [] as SearchItem[];

    const items: SearchItem[] = [];
    for (const book of books) {
      for (const memo of book.memos ?? []) {
        if ((memo.text ?? "").toLowerCase().includes(normalizedQuery)) {
          items.push({
            kind: "bookMemo",
            key: `bookMemo:${book.id}:${memo.id}`,
            timestamp: memo.createdAt,
            book,
            memo,
          });
        }
      }
    }
    return items;
  }, [books, isSearchActive, normalizedQuery]);

  const segmentedControlItems = useMemo(() => {
    if (!isSearchActive) return undefined;

    const recordCount = recordSearchItems.length;
    const bookCount = bookMemoSearchItems.length;
    const allCount = recordCount + bookCount;

    return [
      { value: "all", text: "すべて", amount: allCount },
      { value: "reading", text: "記録メモ", amount: recordCount },
      { value: "book", text: "書籍メモ", amount: bookCount },
    ];
  }, [bookMemoSearchItems, isSearchActive, recordSearchItems]);

  const groupedRecords = useMemo(() => {
    const groups = new Map<
      string,
      { date: Date; dateLabel: string; totalSeconds: number; ids: string[] }
    >();

    for (const h of records) {
      const start = new Date(h.startTime);
      if (Number.isNaN(start.getTime())) continue;

      const key = toDayKey(start);
      const date = new Date(
        start.getFullYear(),
        start.getMonth(),
        start.getDate()
      );
      const dateLabel = new Intl.DateTimeFormat("ja-JP", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      }).format(date);

      const existing = groups.get(key);
      if (existing) {
        existing.totalSeconds += h.duration;
        existing.ids.push(h.id);
      } else {
        groups.set(key, {
          date,
          dateLabel,
          totalSeconds: h.duration,
          ids: [h.id],
        });
      }
    }

    const itemsById = new Map(records.map((h) => [h.id, h] as const));

    return Array.from(groups.values())
      .sort((a, b) => b.date.getTime() - a.date.getTime())
      .map((g) => {
        const items = g.ids
          .map((id) => itemsById.get(id))
          .filter(Boolean)
          .sort(
            (a, b) =>
              new Date(b!.startTime).getTime() -
              new Date(a!.startTime).getTime()
          ) as ReadingRecord[];
        return { ...g, items };
      });
  }, [records]);

  const monthlyTotalSeconds = useMemo(() => {
    const now = new Date();
    const y = now.getFullYear();
    const m = now.getMonth();

    return records.reduce((sum, r) => {
      const start = new Date(r.startTime);
      if (Number.isNaN(start.getTime())) return sum;
      if (start.getFullYear() !== y || start.getMonth() !== m) return sum;
      return sum + r.duration;
    }, 0);
  }, [records]);

  const groupedSearchItems = useMemo(() => {
    if (!isSearchActive)
      return [] as Array<{
        date: Date;
        dateLabel: string;
        totalSeconds: number;
        items: SearchItem[];
      }>;

    const baseItems =
      selectedSegment === "reading"
        ? recordSearchItems
        : selectedSegment === "book"
        ? bookMemoSearchItems
        : [...recordSearchItems, ...bookMemoSearchItems];

    const groups = new Map<
      string,
      {
        date: Date;
        dateLabel: string;
        totalSeconds: number;
        items: SearchItem[];
      }
    >();

    for (const item of baseItems) {
      const t = new Date(item.timestamp);
      if (Number.isNaN(t.getTime())) continue;
      const key = toDayKey(t);
      const date = new Date(t.getFullYear(), t.getMonth(), t.getDate());
      const dateLabel = new Intl.DateTimeFormat("ja-JP", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      }).format(date);

      const existing = groups.get(key);
      if (existing) {
        existing.items.push(item);
        if (item.kind === "record") {
          existing.totalSeconds += item.record.duration;
        }
      } else {
        groups.set(key, {
          date,
          dateLabel,
          totalSeconds: item.kind === "record" ? item.record.duration : 0,
          items: [item],
        });
      }
    }

    return Array.from(groups.values())
      .sort((a, b) => b.date.getTime() - a.date.getTime())
      .map((g) => ({
        ...g,
        items: g.items.sort(
          (a, b) =>
            new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
        ),
      }));
  }, [bookMemoSearchItems, isSearchActive, recordSearchItems, selectedSegment]);

  const addRecordButton = (
    <PrimaryButton
      className="px-3 py-2 text-sm"
      icon={<Plus className="size-4" />}
      type="button"
      onClick={handleOpenAddDialog}
    >
      記録を追加
    </PrimaryButton>
  );

  return (
    <>
      <div className="flex flex-col h-full overflow-hidden">
        <div className="shrink-0">
          <div className="max-w-2xl mx-auto">
            <Header
              pageTitle="記録"
              icon={
                <IconRecord
                  className="shrink-0"
                  size={28}
                  color="var(--muted-foreground)"
                />
              }
              action={addRecordButton}
              searchQuery={searchQuery}
              onSearchQueryChange={handleSearchQueryChange}
              searchPlaceholder="キーワードで検索"
              showSegmentedControl={isSearchActive}
              segmentedControlItems={segmentedControlItems}
              segmentedControlValue={selectedSegment}
              onSegmentedControlValueChange={(value) =>
                setSelectedSegment(value as RecordsSegment)
              }
            />
          </div>
        </div>

        <div
          ref={scrollContainerRef}
          className="flex-1 min-h-0 overflow-y-auto"
        >
          <div className="max-w-2xl mx-auto px-6 pt-2 pb-28">
            {!isSearchActive ? (
              <div className="pb-6">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Clock className="size-4" />
                  <p className="text-sm">今月の合計時間</p>
                </div>
                <p className="mt-1 text-[28px] leading-8 font-medium tabular-nums text-foreground">
                  {formatDurationHms(monthlyTotalSeconds)}
                </p>
              </div>
            ) : null}

            {!isSearchActive && records.length === 0 ? (
              <div className="min-h-full flex items-start justify-center">
                <ListEmptyView
                  icon={
                    <IconRecord size={48} color="var(--muted-foreground)" />
                  }
                  message="記録登録されていません"
                  submessage={
                    <>
                      <p className="mb-0">手動で追加するか</p>
                      <p>計測画面で計測すると表示されます</p>
                    </>
                  }
                  action={addRecordButton}
                />
              </div>
            ) : isSearchActive && groupedSearchItems.length === 0 ? (
              <div className="min-h-full flex flex-col items-center justify-center py-12 text-center">
                <p className="text-muted-foreground">
                  該当する項目が見つかりません
                </p>
              </div>
            ) : !isSearchActive &&
              records.length > 0 &&
              groupedRecords.length === 0 ? (
              <div className="min-h-full flex flex-col items-center justify-center py-12 text-center">
                <p className="text-muted-foreground">
                  該当する記録が見つかりません
                </p>
              </div>
            ) : (
              <div className="flex flex-col gap-6">
                <div className="flex flex-col gap-10">
                  {isSearchActive
                    ? groupedSearchItems.map((group) => (
                        <section
                          key={group.dateLabel}
                          className="flex flex-col gap-5"
                        >
                          <div className="flex items-center gap-2 w-full">
                            <div className="flex items-center gap-1 text-sm text-muted-foreground tabular-nums">
                              <span>{group.dateLabel}</span>
                              {group.totalSeconds > 0 ? (
                                <>
                                  <span>:</span>
                                  <span>
                                    {formatDurationHms(group.totalSeconds)}
                                  </span>
                                </>
                              ) : null}
                            </div>
                            <div className="flex-1 h-px bg-border" />
                          </div>

                          <div className="flex flex-col gap-5">
                            {group.items.map((item) => {
                              if (item.kind === "bookMemo") {
                                return (
                                  <ListCard
                                    key={item.key}
                                    type="BookNote"
                                    createdAt={item.memo.createdAt}
                                    bookName={item.book.title}
                                    bookNote={highlightText(
                                      item.memo.text,
                                      searchQuery
                                    )}
                                  />
                                );
                              }

                              const record = item.record;
                              const book = record.bookId
                                ? getBook(record.bookId)
                                : null;

                              const recordNoteNode = item.matchedMemo
                                ? highlightText(record.memo ?? "", searchQuery)
                                : record.memo;

                              const tagsNode = (record.tags ?? []).length
                                ? (record.tags ?? []).map((t) => {
                                    const tagMatched = t
                                      .trim()
                                      .toLowerCase()
                                      .includes(normalizedQuery);
                                    return (
                                      <Tag key={t}>
                                        {tagMatched
                                          ? highlightText(t, searchQuery)
                                          : t}
                                      </Tag>
                                    );
                                  })
                                : undefined;

                              return (
                                <ListCard
                                  key={item.key}
                                  type="Record"
                                  durationSeconds={record.duration}
                                  dateTime={record.startTime}
                                  recordNote={recordNoteNode}
                                  bookName={book?.title}
                                  tagsNode={tagsNode}
                                  onEdit={() => handleOpenEditDialog(record.id)}
                                  onDelete={() => void handleDelete(record.id)}
                                />
                              );
                            })}
                          </div>
                        </section>
                      ))
                    : groupedRecords.map((group) => (
                        <section
                          key={group.dateLabel}
                          className="flex flex-col gap-5"
                        >
                          <div className="flex items-center gap-2 w-full">
                            <div className="flex items-center gap-1 text-sm text-muted-foreground tabular-nums">
                              <span>{group.dateLabel}</span>
                              {group.totalSeconds > 0 ? (
                                <>
                                  <span>:</span>
                                  <span>
                                    {formatDurationHms(group.totalSeconds)}
                                  </span>
                                </>
                              ) : null}
                            </div>
                            <div className="flex-1 h-px bg-border" />
                          </div>

                          <div className="flex flex-col gap-5">
                            {group.items.map((record) => {
                              const book = record.bookId
                                ? getBook(record.bookId)
                                : null;

                              return (
                                <ListCard
                                  key={record.id}
                                  type="Record"
                                  durationSeconds={record.duration}
                                  dateTime={record.startTime}
                                  recordNote={record.memo}
                                  bookName={book?.title}
                                  tags={record.tags}
                                  onEdit={() => handleOpenEditDialog(record.id)}
                                  onDelete={() => void handleDelete(record.id)}
                                />
                              );
                            })}
                          </div>
                        </section>
                      ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <Dialog
        open={isAddDialogOpen}
        onOpenChange={(open) => {
          if (!open) {
            resetAddForm();
          }
          setIsAddDialogOpen(open);
        }}
        title={editingRecordId ? "記録を編集" : "記録を追加"}
        description={
          editingRecordId
            ? "記録の内容を編集できます"
            : "手動で記録を追加できます"
        }
        formPatternType="AddRecord"
        cancelLabel="キャンセル"
        confirmLabel={editingRecordId ? "保存" : "追加"}
        onCancel={handleCancelAdd}
        onConfirm={() => {
          void handleConfirmAdd();
        }}
        cancelButtonProps={{ disabled: isSaving }}
        confirmButtonProps={{ disabled: isSaving || durationSeconds <= 0 }}
      >
        <div className="flex flex-col gap-4">
          <FieldItem
            className="w-full"
            labelProps={{ text: "開始日時", showOptionalLabel: false }}
            instance={
              <NeumorphicInput
                id="startAt"
                type="datetime-local"
                step={1}
                value={startAt}
                onChange={(e) => setStartAt(e.target.value)}
                disabled={isSaving}
              />
            }
          />

          <FieldItem
            className="w-full"
            labelProps={{ text: "終了日時", showOptionalLabel: false }}
            instance={
              <NeumorphicInput
                id="endAt"
                type="datetime-local"
                step={1}
                value={endAt}
                onChange={(e) => setEndAt(e.target.value)}
                disabled={isSaving}
              />
            }
          />

          <FieldItem
            className="w-full"
            labelProps={{ text: "記録メモ", showOptionalLabel: true }}
            instance={
              <NeumorphicTextarea
                id="memo"
                placeholder="例）P.10まで読んだ"
                value={memo}
                onChange={(e) => setMemo(e.target.value)}
                rows={1}
                className="h-11 text-sm leading-5"
                disabled={isSaving}
              />
            }
          />

          <FieldItem
            className="w-full"
            labelProps={{ text: "書籍", showOptionalLabel: true }}
            instance={
              <Select
                value={toSelectValue(selectedBookId)}
                onValueChange={(next) =>
                  setSelectedBookId(fromSelectValue(next))
                }
              >
                <NeumorphicSelectTrigger id="book">
                  <SelectValue placeholder="選択なし" />
                </NeumorphicSelectTrigger>
                <SelectContent>
                  <SelectNoneItem />
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
            labelProps={{ text: "書籍に関するメモ", showOptionalLabel: true }}
            instance={
              <NeumorphicTextarea
                id="bookMemo"
                placeholder="例）第2章に具体的な例が多い"
                value={bookMemo}
                onChange={(e) => setBookMemo(e.target.value)}
                rows={1}
                className="h-11 text-sm leading-5"
                disabled={isSaving}
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
                placeholder="タグを選択または追加してください"
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
    </>
  );
}
