import { useMemo, useState } from "react";
import { Clock, Plus } from "lucide-react";
import { toast } from "sonner";

import { useApp } from "../context/AppContext";
import { formatDurationHm } from "../utils/format";
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
  SelectValue,
} from "../components/ui/select";
import { TagMultiSelectInput } from "../components/TagMultiSelectInput";
import { NeumorphicSelectTrigger } from "../components/NeumorphicSelectTrigger";

function toLocalDateTimeInputValue(date: Date) {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(
    date.getDate()
  )}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export function RecordsPage() {
  const {
    histories,
    books,
    addHistory,
    updateHistory,
    deleteHistory,
    addBookMemo,
    getBook,
  } = useApp();
  const [searchQuery, setSearchQuery] = useState("");

  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [editingHistoryId, setEditingHistoryId] = useState<string | null>(null);
  const [selectedBookId, setSelectedBookId] = useState<string>("");
  const [memo, setMemo] = useState("");
  const [bookMemo, setBookMemo] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [startAt, setStartAt] = useState(() =>
    toLocalDateTimeInputValue(new Date(Date.now() - 30 * 60 * 1000))
  );
  const [endAt, setEndAt] = useState(() =>
    toLocalDateTimeInputValue(new Date())
  );
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

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
    setEditingHistoryId(null);
    setSelectedBookId("");
    setMemo("");
    setBookMemo("");
    setTags([]);
    setStartAt(
      toLocalDateTimeInputValue(new Date(Date.now() - 30 * 60 * 1000))
    );
    setEndAt(toLocalDateTimeInputValue(new Date()));
    setSaveError(null);
    setIsSaving(false);
  };

  const handleOpenAddDialog = () => {
    resetAddForm();
    setIsAddDialogOpen(true);
  };

  const handleOpenEditDialog = (historyId: string) => {
    const history = histories.find((h) => h.id === historyId);
    if (!history) return;

    resetAddForm();
    setEditingHistoryId(history.id);
    setSelectedBookId(history.bookId ?? "");
    setMemo(history.memo ?? "");
    setBookMemo("");
    setTags(history.tags ?? []);

    const start = new Date(history.startTime);
    const end = new Date(history.endTime);
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

      if (editingHistoryId) {
        await updateHistory(editingHistoryId, {
          duration,
          memo,
          startTime: start.toISOString(),
          endTime: end.toISOString(),
          ...(selectedBookId ? { bookId: selectedBookId } : {}),
          ...(tags.length ? { tags } : {}),
        });
      } else {
        await addHistory({
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

  const handleDelete = async (historyId: string) => {
    try {
      await deleteHistory(historyId);
      toast.success("記録を削除しました");
    } catch (err) {
      console.error(err);
      toast.error("記録の削除に失敗しました");
    }
  };

  const filteredHistories = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return histories;

    return histories.filter((history) => {
      const book = history.bookId ? getBook(history.bookId) : null;
      return (
        (history.memo ?? "").toLowerCase().includes(query) ||
        (book && book.title.toLowerCase().includes(query))
      );
    });
  }, [histories, searchQuery, getBook]);

  const monthlyTotalSeconds = useMemo(() => {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth();
    return histories.reduce((total, h) => {
      const end = new Date(h.endTime);
      if (Number.isNaN(end.getTime())) return total;
      return end.getFullYear() === year && end.getMonth() === month
        ? total + h.duration
        : total;
    }, 0);
  }, [histories]);

  const groupedHistories = useMemo(() => {
    const pad2 = (n: number) => String(n).padStart(2, "0");

    const groups = new Map<
      string,
      { date: Date; dateLabel: string; totalSeconds: number; ids: string[] }
    >();

    for (const h of filteredHistories) {
      const end = new Date(h.endTime);
      if (Number.isNaN(end.getTime())) continue;

      const y = end.getFullYear();
      const m = end.getMonth() + 1;
      const d = end.getDate();
      const key = `${y}-${pad2(m)}-${pad2(d)}`;
      const date = new Date(y, m - 1, d);
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

    const itemsById = new Map(filteredHistories.map((h) => [h.id, h] as const));

    return Array.from(groups.values())
      .sort((a, b) => b.date.getTime() - a.date.getTime())
      .map((g) => {
        const items = g.ids
          .map((id) => itemsById.get(id))
          .filter(Boolean)
          .sort(
            (a, b) =>
              new Date(b!.endTime).getTime() - new Date(a!.endTime).getTime()
          ) as typeof filteredHistories;
        return { ...g, items };
      });
  }, [filteredHistories]);

  const formatHoursMinutes = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return `${hours}:${String(minutes).padStart(2, "0")}`;
  };

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
            onSearchQueryChange={setSearchQuery}
            searchPlaceholder="キーワードで検索"
            showSegmentedControl={false}
          />
        </div>

        <div className="flex-1 min-h-0 overflow-y-auto px-6 pt-2 pb-28">
          {histories.length === 0 ? (
            <div className="min-h-full flex items-start justify-center">
              <ListEmptyView
                icon={<IconRecord size={48} color="var(--muted-foreground)" />}
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
          ) : filteredHistories.length === 0 ? (
            <div className="min-h-full flex flex-col items-center justify-center py-12 text-center">
              <p className="text-muted-foreground">
                該当する記録が見つかりません
              </p>
            </div>
          ) : (
            <div className="flex flex-col gap-6">
              <div className="flex flex-col gap-1">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Clock className="size-4" />
                  <p className="text-sm">今月の合計時間</p>
                </div>
                <p className="text-2xl font-bold leading-8 tabular-nums text-foreground">
                  {formatHoursMinutes(monthlyTotalSeconds)}
                </p>
              </div>

              <div className="flex flex-col gap-10">
                {groupedHistories.map((group) => (
                  <section
                    key={group.dateLabel}
                    className="flex flex-col gap-5"
                  >
                    <div className="flex items-center gap-2 w-full">
                      <div className="flex items-center gap-1 text-sm text-muted-foreground tabular-nums">
                        <span>{group.dateLabel}</span>
                        <span>:</span>
                        <span>{formatDurationHm(group.totalSeconds)}</span>
                      </div>
                      <div className="flex-1 h-px bg-border" />
                    </div>

                    <div className="flex flex-col gap-5">
                      {group.items.map((history) => {
                        const book = history.bookId
                          ? getBook(history.bookId)
                          : null;

                        return (
                          <ListCard
                            key={history.id}
                            type="Record"
                            durationSeconds={history.duration}
                            dateTime={history.endTime}
                            recordNote={history.memo}
                            bookName={book?.title}
                            tags={history.tags}
                            onEdit={() => handleOpenEditDialog(history.id)}
                            onDelete={() => void handleDelete(history.id)}
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

      <Dialog
        open={isAddDialogOpen}
        onOpenChange={(open) => {
          if (!open) {
            resetAddForm();
          }
          setIsAddDialogOpen(open);
        }}
        title={editingHistoryId ? "記録を編集" : "記録を追加"}
        description={
          editingHistoryId
            ? "記録の内容を編集できます"
            : "手動で記録を追加できます"
        }
        formPatternType="AddRecord"
        cancelLabel="キャンセル"
        confirmLabel={editingHistoryId ? "保存" : "追加"}
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
                value={endAt}
                onChange={(e) => setEndAt(e.target.value)}
                disabled={isSaving}
              />
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
    </>
  );
}
