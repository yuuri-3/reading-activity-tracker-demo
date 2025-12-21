import { useState, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import { Input } from '../components/ui/input';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../components/ui/tabs';
import { Search, BookOpen, Clock } from 'lucide-react';
import { formatDuration, formatDateTime } from '../utils/format';

export function SearchPage() {
  const { books, histories, getBook } = useApp();
  const [searchQuery, setSearchQuery] = useState('');

  const searchResults = useMemo(() => {
    if (!searchQuery.trim()) {
      return { books: [], histories: [] };
    }

    const query = searchQuery.toLowerCase();

    const matchedBooks = books.filter(book => {
      // タイトルと著者での検索
      const titleMatch = book.title.toLowerCase().includes(query);
      const authorMatch = book.author && book.author.toLowerCase().includes(query);
      
      // 書籍メモでの検索
      const memoMatch = book.memos && book.memos.some(memo => 
        memo.text.toLowerCase().includes(query)
      );
      
      return titleMatch || authorMatch || memoMatch;
    });

    const matchedHistories = histories.filter(history => {
      const book = history.bookId ? getBook(history.bookId) : null;
      return (
        history.memo.toLowerCase().includes(query) ||
        (book && book.title.toLowerCase().includes(query))
      );
    });

    return { books: matchedBooks, histories: matchedHistories };
  }, [searchQuery, books, histories, getBook]);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="mb-2">検索</h1>
        <p className="text-sm text-muted-foreground">
          書籍・履歴のメモを検索
        </p>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
        <Input
          placeholder="キーワードで検索..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-9"
          autoFocus
        />
      </div>

      {searchQuery.trim() === '' ? (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <Search className="size-12 mb-4 text-muted-foreground" />
          <p className="text-muted-foreground">
            キーワードを入力して検索
          </p>
        </div>
      ) : (
        <Tabs defaultValue="all" className="w-full">
          <TabsList className="w-full grid grid-cols-3">
            <TabsTrigger value="all">
              すべて ({searchResults.books.length + searchResults.histories.length})
            </TabsTrigger>
            <TabsTrigger value="books">
              書籍 ({searchResults.books.length})
            </TabsTrigger>
            <TabsTrigger value="histories">
              履歴 ({searchResults.histories.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="all" className="flex flex-col gap-4 mt-6">
            {searchResults.books.length === 0 && searchResults.histories.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <p className="text-muted-foreground">
                  該当する結果が見つかりません
                </p>
              </div>
            ) : (
              <>
                {searchResults.books.length > 0 && (
                  <div className="flex flex-col gap-2">
                    <p className="text-sm text-muted-foreground">書籍</p>
                    {searchResults.books.map((book) => (
                      <BookResultItem key={book.id} book={book} searchQuery={searchQuery} />
                    ))}
                  </div>
                )}
                
                {searchResults.histories.length > 0 && (
                  <div className="flex flex-col gap-2">
                    <p className="text-sm text-muted-foreground">履歴</p>
                    {searchResults.histories.map((history) => (
                      <HistoryResultItem key={history.id} history={history} searchQuery={searchQuery} />
                    ))}
                  </div>
                )}
              </>
            )}
          </TabsContent>

          <TabsContent value="books" className="flex flex-col gap-2 mt-6">
            {searchResults.books.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <BookOpen className="size-12 mb-4 text-muted-foreground" />
                <p className="text-muted-foreground">
                  該当する書籍が見つかりません
                </p>
              </div>
            ) : (
              searchResults.books.map((book) => (
                <BookResultItem key={book.id} book={book} searchQuery={searchQuery} />
              ))
            )}
          </TabsContent>

          <TabsContent value="histories" className="flex flex-col gap-2 mt-6">
            {searchResults.histories.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <Clock className="size-12 mb-4 text-muted-foreground" />
                <p className="text-muted-foreground">
                  該当する履歴が見つかりません
                </p>
              </div>
            ) : (
              searchResults.histories.map((history) => (
                <HistoryResultItem key={history.id} history={history} searchQuery={searchQuery} />
              ))
            )}
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}

function BookResultItem({ book, searchQuery }: { book: any; searchQuery: string }) {
  const { getTotalDurationByBook } = useApp();
  const totalDuration = getTotalDurationByBook(book.id);

  const highlightText = (text: string) => {
    if (!searchQuery.trim()) return text;
    const regex = new RegExp(`(${searchQuery})`, 'gi');
    return text.replace(regex, '<mark class=\"bg-yellow-200\">$1</mark>');
  };

  // 検索クエリにマッチする書籍メモを見つける
  const matchedMemos = book.memos?.filter((memo: any) => 
    memo.text.toLowerCase().includes(searchQuery.toLowerCase())
  ) || [];

  return (
    <div className="p-4 border rounded-lg">
      <div className="flex items-start justify-between mb-2">
        <div className="flex-1 min-w-0">
          <p 
            dangerouslySetInnerHTML={{ __html: highlightText(book.title) }}
            className="truncate"
          />
          {book.author && (
            <p 
              className="text-sm text-muted-foreground truncate"
              dangerouslySetInnerHTML={{ __html: highlightText(book.author) }}
            />
          )}
        </div>
        <div className="ml-4 text-right">
          <p className="text-sm tabular-nums">{formatDuration(totalDuration)}</p>
        </div>
      </div>
      {matchedMemos.length > 0 && (
        <div className="flex flex-col gap-1 mt-2">
          {matchedMemos.map((memo: any) => (
            <p 
              key={memo.id}
              className="text-sm text-muted-foreground whitespace-pre-wrap"
              dangerouslySetInnerHTML={{ __html: highlightText(memo.text) }}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function HistoryResultItem({ history, searchQuery }: { history: any; searchQuery: string }) {
  const { getBook } = useApp();
  const book = history.bookId ? getBook(history.bookId) : null;

  const highlightText = (text: string) => {
    if (!searchQuery.trim()) return text;
    const regex = new RegExp(`(${searchQuery})`, 'gi');
    return text.replace(regex, '<mark class="bg-yellow-200">$1</mark>');
  };

  return (
    <div className="p-4 border rounded-lg">
      <div className="flex items-start justify-between mb-2">
        <div className="flex-1 min-w-0">
          <p className="tabular-nums">{formatDuration(history.duration)}</p>
          {book && (
            <p 
              className="text-sm text-muted-foreground truncate"
              dangerouslySetInnerHTML={{ __html: highlightText(book.title) }}
            />
          )}
        </div>
        <p className="text-sm text-muted-foreground ml-4">
          {formatDateTime(history.endTime)}
        </p>
      </div>
      {history.memo && (
        <p 
          className="text-sm whitespace-pre-wrap"
          dangerouslySetInnerHTML={{ __html: highlightText(history.memo) }}
        />
      )}
    </div>
  );
}