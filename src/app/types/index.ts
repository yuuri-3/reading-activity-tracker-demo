export interface BookMemo {
  id: string;
  text: string;
  createdAt: string;
}

export interface Book {
  id: string;
  title: string;
  author?: string;
  memos: BookMemo[];
  createdAt: string;
}

export interface ReadingRecord {
  id: string;
  bookId?: string;
  duration: number; // seconds
  memo: string;
  /** Tag references (preferred). */
  tagIds?: string[];
  /** Legacy tag labels attached to the record (backward compatibility). */
  tags?: string[];
  startTime: string;
  endTime: string;
  createdAt: string;
}

export interface Tag {
  id: string;
  text: string;
  description: string;
  /** ISO string; used for ordering in Firestore. */
  createdAt: string;
}

export interface TimerState {
  isRunning: boolean;
  startTime: number | null;
  elapsedTime: number;
  pausedTime: number;
}
