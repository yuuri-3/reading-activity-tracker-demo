import { useMemo, useState } from "react";
import { Plus } from "lucide-react";

import { useApp } from "../context/AppContext";
import { formatDateTime, formatDuration } from "../utils/format";
import { Header } from "../components/Header";
import { IconRecord } from "../components/icons/IconRecord";
import { ListCard } from "../components/ListCard";
import { ListEmptyView } from "../components/ListEmptyView";
import { PrimaryButton } from "../components/PrimaryButton";

export function RecordList() {
  const { histories, getBook } = useApp();
  const [searchQuery, setSearchQuery] = useState("");

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

  const addRecordButton = (
    <PrimaryButton
      className="px-3 py-2 text-sm"
      icon={<Plus className="size-4" />}
      type="button"
    >
      記録追加
    </PrimaryButton>
  );

  return (
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
          searchPlaceholder="書籍を検索"
          showSegmentedControl={false}
        />
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto px-6 pt-4 pb-28">
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
          <div className="flex flex-col gap-2">
            {filteredHistories.map((history) => {
              const book = history.bookId ? getBook(history.bookId) : null;

              return (
                <ListCard key={history.id}>
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1 min-w-0">
                      <p className="tabular-nums">
                        {formatDuration(history.duration)}
                      </p>
                      {book && (
                        <p className="text-sm text-muted-foreground truncate">
                          {book.title}
                        </p>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground ml-4">
                      {formatDateTime(history.endTime)}
                    </p>
                  </div>

                  {history.memo && (
                    <p className="text-sm whitespace-pre-wrap">
                      {history.memo}
                    </p>
                  )}
                </ListCard>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
