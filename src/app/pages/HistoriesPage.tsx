import { useState, type FormEvent } from "react";
import { useApp } from "../context/AppContext";
import { formatDuration, formatDateTime } from "../utils/format";
import { Input } from "../components/ui/input";
import { Textarea } from "../components/ui/textarea";
import { Search, Clock, Plus } from "lucide-react";
import { History } from "../types";
import { ListCard } from "../components/ListCard";
import { Dialog } from "../components/Dialog";
import { FieldItem } from "../components/FieldItem";
import { Button } from "../components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../components/ui/select";

export function HistoriesPage() {
  const {
    histories,
    getBook,
    updateHistory,
    deleteHistory,
    books,
    addHistory,
    addBookMemo,
  } = useApp();
  const [searchQuery, setSearchQuery] = useState("");
  const [editingHistoryId, setEditingHistoryId] = useState<string | null>(null);
  const [editingMemo, setEditingMemo] = useState("");

  const [isManualDialogOpen, setIsManualDialogOpen] = useState(false);
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

  const filteredHistories = histories.filter((history) => {
    const book = history.bookId ? getBook(history.bookId) : null;
    const query = searchQuery.toLowerCase();

    return (
      (history.memo ?? "").toLowerCase().includes(query) ||
      (book && book.title.toLowerCase().includes(query))
    );
  });

  const handleStartEdit = (history: History) => {
    setEditingHistoryId(history.id);
    setEditingMemo(history.memo);
  };

  const handleSaveEdit = (historyId: string) => {
    void updateHistory(historyId, { memo: editingMemo });
    setEditingHistoryId(null);
    setEditingMemo("");
  };

  const handleCancelEdit = () => {
    setEditingHistoryId(null);
    setEditingMemo("");
  };

  const handleDelete = (historyId: string) => {
    if (confirm("この履歴を削除しますか？")) {
      void deleteHistory(historyId);
    }
  };

  const handleSubmitManual = (e: FormEvent) => {
    e.preventDefault();

    const totalSeconds =
      (parseInt(hours) || 0) * 3600 + (parseInt(minutes) || 0) * 60;

    if (totalSeconds <= 0) return;

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
    setIsManualDialogOpen(false);
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="mb-2">履歴一覧</h1>
          <p className="text-sm text-muted-foreground">計測した履歴の一覧</p>
        </div>
        <Dialog
          open={isManualDialogOpen}
          onOpenChange={setIsManualDialogOpen}
          trigger={
            <Button variant="outline">
              <Plus className="size-4 mr-2" />
              手動登録
            </Button>
          }
          title="履歴を手動登録"
          description="過去の計測時間を手動で記録できます"
          formPatternType="AddRecord"
          cancelLabel="キャンセル"
          confirmLabel="登録"
          confirmButtonType="submit"
          confirmForm="add-history-form"
          onCancel={() => setIsManualDialogOpen(false)}
          confirmButtonProps={{ disabled: !hours && !minutes }}
        >
          <form id="add-history-form" onSubmit={handleSubmitManual}>
            <div className="flex flex-col gap-4">
              <FieldItem
                className="w-full"
                labelProps={{ text: "書籍", showOptionalLabel: true }}
                instance={
                  <Select
                    value={selectedBookId}
                    onValueChange={setSelectedBookId}
                  >
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
                }
              />

              <div className="flex gap-2">
                <FieldItem
                  className="w-full flex-1"
                  labelProps={{ text: "時間", showOptionalLabel: false }}
                  instance={
                    <Input
                      id="hours"
                      type="number"
                      min="0"
                      value={hours}
                      onChange={(e) => setHours(e.target.value)}
                      placeholder="0"
                    />
                  }
                />
                <FieldItem
                  className="w-full flex-1"
                  labelProps={{ text: "分", showOptionalLabel: false }}
                  instance={
                    <Input
                      id="minutes"
                      type="number"
                      min="0"
                      max="59"
                      value={minutes}
                      onChange={(e) => setMinutes(e.target.value)}
                      placeholder="0"
                    />
                  }
                />
              </div>

              <div className="flex gap-2">
                <FieldItem
                  className="w-full flex-1"
                  labelProps={{ text: "日付", showOptionalLabel: false }}
                  instance={
                    <Input
                      id="date"
                      type="date"
                      value={date}
                      onChange={(e) => setDate(e.target.value)}
                    />
                  }
                />
                <FieldItem
                  className="w-full flex-1"
                  labelProps={{ text: "時刻", showOptionalLabel: false }}
                  instance={
                    <Input
                      id="time"
                      type="time"
                      value={time}
                      onChange={(e) => setTime(e.target.value)}
                    />
                  }
                />
              </div>

              <FieldItem
                className="w-full"
                labelProps={{ text: "メモ", showOptionalLabel: true }}
                instance={
                  <Textarea
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
                  <Textarea
                    id="bookMemo"
                    placeholder="例）次回はP.11から読む"
                    value={bookMemo}
                    onChange={(e) => setBookMemo(e.target.value)}
                    rows={3}
                  />
                }
              />

              {!!hours || !!minutes ? (
                <p className="text-muted-foreground text-[13px]">
                  記録時間:{" "}
                  {formatDuration(
                    (parseInt(hours) || 0) * 3600 +
                      (parseInt(minutes) || 0) * 60
                  )}
                </p>
              ) : null}
            </div>
          </form>
        </Dialog>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
        <Input
          placeholder="履歴・書籍を検索..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-9"
        />
      </div>

      {filteredHistories.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <Clock className="size-12 mb-4 text-muted-foreground" />
          <p className="text-muted-foreground">
            {searchQuery ? "該当する履歴が見つかりません" : "履歴がありません"}
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {filteredHistories.map((history) => {
            const book = history.bookId ? getBook(history.bookId) : null;
            const isEditing = editingHistoryId === history.id;

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

                {isEditing ? (
                  <div className="flex flex-col gap-2 mt-2">
                    <Textarea
                      value={editingMemo}
                      onChange={(e) => setEditingMemo(e.target.value)}
                      placeholder="メモを入力..."
                      rows={3}
                    />
                    <div className="flex gap-2">
                      <button
                        onClick={handleCancelEdit}
                        className="flex-1 px-3 py-1.5 text-sm border rounded hover:bg-accent"
                      >
                        キャンセル
                      </button>
                      <button
                        onClick={() => handleSaveEdit(history.id)}
                        className="flex-1 px-3 py-1.5 text-sm bg-primary text-primary-foreground rounded hover:bg-primary/90"
                      >
                        保存
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    {history.memo && (
                      <p className="text-sm whitespace-pre-wrap mt-2">
                        {history.memo}
                      </p>
                    )}
                    <div className="flex gap-2 mt-2">
                      <button
                        onClick={() => handleStartEdit(history)}
                        className="text-sm text-muted-foreground hover:text-foreground"
                      >
                        編集
                      </button>
                      <button
                        onClick={() => handleDelete(history.id)}
                        className="text-sm text-destructive hover:text-destructive/80"
                      >
                        削除
                      </button>
                    </div>
                  </>
                )}
              </ListCard>
            );
          })}
        </div>
      )}
    </div>
  );
}
