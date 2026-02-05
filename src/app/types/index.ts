import type { Timestamp } from "firebase/firestore";

export interface BookMemo {
  id: string;
  text: string;
  createdAt: string;
}

export type BookMemoRef = {
  bookId: string;
  memoId: string;
  text: string;
  createdAt: Timestamp;
};

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
  bookMemoId?: string;
  bookMemo?: string;
  duration: number; // seconds
  memo: string;
  /** Tag references (preferred). */
  tagIds?: string[];
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
