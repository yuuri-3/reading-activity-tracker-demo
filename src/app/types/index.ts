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

export interface History {
  id: string;
  bookId?: string;
  duration: number; // seconds
  memo: string;
  startTime: string;
  endTime: string;
  createdAt: string;
}

export interface TimerState {
  isRunning: boolean;
  startTime: number | null;
  elapsedTime: number;
  pausedTime: number;
}