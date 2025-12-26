import { BookOpen, Plus } from "lucide-react";

import { AddBookDialog } from "../AddBookDialog";
import { PrimaryButton } from "../PrimaryButton";
import { BookListSearchField } from "./BookListSearchField";

export type BookListHeaderProps = {
  searchQuery: string;
  onSearchQueryChange: (value: string) => void;
};

export function BookListHeader({
  searchQuery,
  onSearchQueryChange,
}: BookListHeaderProps) {
  return (
    <div className="flex flex-col gap-6 px-6 pt-8 pb-4 min-h-[152px]">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <BookOpen className="size-7 text-foreground" />
          <h1 className="text-2xl tracking-[0.08em]">本棚</h1>
        </div>
        <AddBookDialog
          trigger={
            <PrimaryButton
              className="px-3 py-2 text-sm"
              icon={<Plus className="size-4" />}
            >
              書籍登録
            </PrimaryButton>
          }
        />
      </div>

      <BookListSearchField value={searchQuery} onChange={onSearchQueryChange} />
    </div>
  );
}
