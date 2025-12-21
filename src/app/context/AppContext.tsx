import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Book, History, TimerState, BookMemo } from '../types';

// App context for managing global state
interface AppContextType {
  // Books
  books: Book[];
  addBook: (book: Omit<Book, 'id' | 'createdAt'>) => void;
  updateBook: (id: string, book: Partial<Book>) => void;
  deleteBook: (id: string) => void;
  getBook: (id: string) => Book | undefined;
  addBookMemo: (bookId: string, memoText: string) => void;
  
  // Histories
  histories: History[];
  addHistory: (history: Omit<History, 'id' | 'createdAt'>) => void;
  updateHistory: (id: string, history: Partial<History>) => void;
  deleteHistory: (id: string) => void;
  getHistoriesByBook: (bookId: string) => History[];
  getTotalDurationByBook: (bookId: string) => number;
  
  // Timer
  timerState: TimerState;
  startTimer: () => void;
  pauseTimer: () => void;
  resetTimer: () => void;
  
  // Search
  searchText: string;
  setSearchText: (text: string) => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export function AppProvider({ children }: { children: ReactNode }) {
  const [books, setBooks] = useState<Book[]>([]);
  const [histories, setHistories] = useState<History[]>([]);
  const [searchText, setSearchText] = useState('');
  const [timerState, setTimerState] = useState<TimerState>({
    isRunning: false,
    startTime: null,
    elapsedTime: 0,
    pausedTime: 0,
  });

  // Load data from localStorage
  useEffect(() => {
    const storedBooks = localStorage.getItem('books');
    const storedHistories = localStorage.getItem('histories');
    
    if (storedBooks) {
      setBooks(JSON.parse(storedBooks));
    }
    if (storedHistories) {
      setHistories(JSON.parse(storedHistories));
    }
  }, []);

  // Save books to localStorage
  useEffect(() => {
    localStorage.setItem('books', JSON.stringify(books));
  }, [books]);

  // Save histories to localStorage
  useEffect(() => {
    localStorage.setItem('histories', JSON.stringify(histories));
  }, [histories]);

  // Timer interval
  useEffect(() => {
    let interval: NodeJS.Timeout;
    
    if (timerState.isRunning && timerState.startTime) {
      interval = setInterval(() => {
        setTimerState(prev => ({
          ...prev,
          elapsedTime: prev.pausedTime + (Date.now() - prev.startTime!) / 1000,
        }));
      }, 100);
    }
    
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [timerState.isRunning, timerState.startTime]);

  // Book operations
  const addBook = (book: Omit<Book, 'id' | 'createdAt'>) => {
    const newBook: Book = {
      ...book,
      id: Date.now().toString(),
      createdAt: new Date().toISOString(),
    };
    setBooks(prev => [newBook, ...prev]);
  };

  const updateBook = (id: string, updates: Partial<Book>) => {
    setBooks(prev => prev.map(book => 
      book.id === id ? { ...book, ...updates } : book
    ));
  };

  const deleteBook = (id: string) => {
    setBooks(prev => prev.filter(book => book.id !== id));
  };

  const getBook = (id: string) => {
    return books.find(book => book.id === id);
  };

  const addBookMemo = (bookId: string, memoText: string) => {
    const book = getBook(bookId);
    if (book) {
      const newMemo: BookMemo = {
        id: Date.now().toString(),
        text: memoText,
        createdAt: new Date().toISOString(),
      };
      updateBook(bookId, { memos: [...(book.memos || []), newMemo] });
    }
  };

  // History operations
  const addHistory = (history: Omit<History, 'id' | 'createdAt'>) => {
    const newHistory: History = {
      ...history,
      id: Date.now().toString(),
      createdAt: new Date().toISOString(),
    };
    setHistories(prev => [newHistory, ...prev]);
  };

  const updateHistory = (id: string, updates: Partial<History>) => {
    setHistories(prev => prev.map(history => 
      history.id === id ? { ...history, ...updates } : history
    ));
  };

  const deleteHistory = (id: string) => {
    setHistories(prev => prev.filter(history => history.id !== id));
  };

  const getHistoriesByBook = (bookId: string) => {
    return histories.filter(history => history.bookId === bookId);
  };

  const getTotalDurationByBook = (bookId: string) => {
    return histories
      .filter(history => history.bookId === bookId)
      .reduce((total, history) => total + history.duration, 0);
  };

  // Timer operations
  const startTimer = () => {
    setTimerState(prev => ({
      ...prev,
      isRunning: true,
      startTime: Date.now(),
    }));
  };

  const pauseTimer = () => {
    setTimerState(prev => ({
      ...prev,
      isRunning: false,
      pausedTime: prev.elapsedTime,
    }));
  };

  const resetTimer = () => {
    setTimerState({
      isRunning: false,
      startTime: null,
      elapsedTime: 0,
      pausedTime: 0,
    });
  };

  return (
    <AppContext.Provider
      value={{
        books,
        addBook,
        updateBook,
        deleteBook,
        getBook,
        addBookMemo,
        histories,
        addHistory,
        updateHistory,
        deleteHistory,
        getHistoriesByBook,
        getTotalDurationByBook,
        timerState,
        startTimer,
        pauseTimer,
        resetTimer,
        searchText,
        setSearchText,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within AppProvider');
  }
  return context;
}