import { useState } from 'react';
import { useApp } from '../context/AppContext';
import { AddHistoryDialog } from '../components/AddHistoryDialog';
import { formatDuration, formatDateTime } from '../utils/format';
import { Input } from '../components/ui/input';
import { Textarea } from '../components/ui/textarea';
import { Search, Clock } from 'lucide-react';
import { History } from '../types';

export function HistoriesPage() {
  const { histories, books, getBook, updateHistory, deleteHistory } = useApp();
  const [searchQuery, setSearchQuery] = useState('');
  const [editingHistoryId, setEditingHistoryId] = useState<string | null>(null);
  const [editingMemo, setEditingMemo] = useState('');

  const filteredHistories = histories.filter(history => {
    const book = history.bookId ? getBook(history.bookId) : null;
    const query = searchQuery.toLowerCase();
    
    return (
      history.memo.toLowerCase().includes(query) ||
      (book && book.title.toLowerCase().includes(query)) ||
      (book && book.memo.toLowerCase().includes(query))
    );
  });

  const handleStartEdit = (history: History) => {
    setEditingHistoryId(history.id);
    setEditingMemo(history.memo);
  };

  const handleSaveEdit = (historyId: string) => {
    updateHistory(historyId, { memo: editingMemo });
    setEditingHistoryId(null);
    setEditingMemo('');
  };

  const handleCancelEdit = () => {
    setEditingHistoryId(null);
    setEditingMemo('');
  };

  const handleDelete = (historyId: string) => {
    if (confirm('この履歴を削除しますか？')) {
      deleteHistory(historyId);
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="mb-2">履歴一覧</h1>
          <p className="text-sm text-muted-foreground">
            計測した履歴の一覧
          </p>
        </div>
        <AddHistoryDialog />
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
            {searchQuery ? '該当する履歴が見つかりません' : '履歴がありません'}
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {filteredHistories.map((history) => {
            const book = history.bookId ? getBook(history.bookId) : null;
            const isEditing = editingHistoryId === history.id;
            
            return (
              <div key={history.id} className="p-4 border rounded-lg">
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
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
