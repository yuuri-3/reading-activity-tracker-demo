import { useState } from 'react';
import { useApp } from '../context/AppContext';
import { Button } from './ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from './ui/dialog';
import { Input } from './ui/input';
import { Textarea } from './ui/textarea';
import { Label } from './ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { formatDuration } from '../utils/format';

interface SaveTimerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  duration: number;
}

export function SaveTimerDialog({ open, onOpenChange, duration }: SaveTimerDialogProps) {
  const { books, addHistory, addBookMemo, resetTimer } = useApp();
  const [selectedBookId, setSelectedBookId] = useState<string>('');
  const [memo, setMemo] = useState('');
  const [bookMemo, setBookMemo] = useState('');

  const handleSave = () => {
    const now = new Date();
    const startTime = new Date(now.getTime() - duration * 1000).toISOString();
    
    addHistory({
      bookId: selectedBookId || undefined,
      duration: Math.floor(duration),
      memo,
      startTime,
      endTime: now.toISOString(),
    });
    
    // 書籍メモがあり、書籍が選択されている場合は書籍メモを追加
    if (bookMemo.trim() && selectedBookId) {
      addBookMemo(selectedBookId, bookMemo.trim());
    }
    
    resetTimer();
    setSelectedBookId('');
    setMemo('');
    setBookMemo('');
    onOpenChange(false);
  };

  const handleCancel = () => {
    resetTimer();
    setSelectedBookId('');
    setMemo('');
    setBookMemo('');
    onOpenChange(false);
  };

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      // モーダルが閉じられる際にタイマーをリセット
      resetTimer();
      setSelectedBookId('');
      setMemo('');
      setBookMemo('');
    }
    onOpenChange(newOpen);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>計測結果を保存</DialogTitle>
          <DialogDescription>
            計測時間を記録し、書籍やメモを関連付けることができます
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label>計測時間</Label>
            <p>{formatDuration(duration)}</p>
          </div>
          
          <div className="flex flex-col gap-2">
            <Label htmlFor="book">書籍（任意）</Label>
            <Select value={selectedBookId} onValueChange={setSelectedBookId}>
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
          </div>
          
          <div className="flex flex-col gap-2">
            <Label htmlFor="memo">メモ（任意）</Label>
            <Textarea
              id="memo"
              placeholder="例）P.10まで読んだ"
              value={memo}
              onChange={(e) => setMemo(e.target.value)}
              rows={3}
            />
          </div>
          
          <div className="flex flex-col gap-2">
            <Label htmlFor="bookMemo">書籍メモ（任意）</Label>
            <Textarea
              id="bookMemo"
              placeholder="例）この章は難しい"
              value={bookMemo}
              onChange={(e) => setBookMemo(e.target.value)}
              rows={3}
            />
          </div>
          
          <div className="flex gap-2">
            <Button variant="outline" onClick={handleCancel} className="flex-1">
              破棄
            </Button>
            <Button onClick={handleSave} className="flex-1">
              保存
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
