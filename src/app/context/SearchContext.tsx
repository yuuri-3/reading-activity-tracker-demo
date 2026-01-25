import { createContext, useContext, useMemo, useState } from "react";
import type { ReactNode } from "react";

type SearchContextType = {
  searchText: string;
  setSearchText: (text: string) => void;
};

type SearchProviderProps = {
  children: ReactNode;
  initialSearchText?: string;
};

const SearchContext = createContext<SearchContextType | undefined>(undefined);

export function SearchProvider({
  children,
  initialSearchText,
}: SearchProviderProps) {
  const [searchText, setSearchText] = useState(initialSearchText ?? "");

  const value = useMemo<SearchContextType>(() => {
    return { searchText, setSearchText };
  }, [searchText]);

  return (
    <SearchContext.Provider value={value}>{children}</SearchContext.Provider>
  );
}

export function useSearch() {
  const context = useContext(SearchContext);
  if (!context) {
    throw new Error("useSearch must be used within SearchProvider");
  }
  return context;
}
