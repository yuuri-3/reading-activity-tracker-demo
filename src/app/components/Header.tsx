import * as React from "react";
import { Plus } from "lucide-react";

import { AddBookDialog } from "./AddBookDialog";
import { PrimaryButton } from "./PrimaryButton";
import { BookListSearchField } from "./book-list/BookListSearchField";
import { IconBookshelf } from "./icons/IconBookshelf";

export type HeaderProps = {
  /** Figma: pageTitle */
  pageTitle?: string;
  /** Figma: action label */
  buttonLabel?: string;
  /** Figma: nested instance (left icon slot) */
  icon?: React.ReactNode | null;
  /** Figma: nested instance (right action slot) */
  action?: React.ReactNode | null;

  /** SearchField controlled props */
  searchQuery: string;
  onSearchQueryChange: (value: string) => void;
  searchPlaceholder?: string;
};

export function Header({
  pageTitle = "本棚",
  buttonLabel = "書籍登録",
  icon,
  action,
  searchQuery,
  onSearchQueryChange,
  searchPlaceholder = "書籍を検索",
}: HeaderProps) {
  return (
    <div className="flex flex-col gap-6 px-6 pt-8 pb-4 min-h-[152px]">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1">
          {icon === undefined ? (
            <IconBookshelf
              className="shrink-0"
              size={28}
              color="var(--muted-foreground)"
            />
          ) : (
            icon
          )}
          <h1 className="text-2xl tracking-[0.08em]">{pageTitle}</h1>
        </div>

        {action === undefined ? (
          <AddBookDialog
            trigger={
              <PrimaryButton
                className="px-3 py-2 text-sm"
                icon={<Plus className="size-4" />}
              >
                {buttonLabel}
              </PrimaryButton>
            }
          />
        ) : (
          action
        )}
      </div>

      <BookListSearchField
        value={searchQuery}
        onChange={onSearchQueryChange}
        placeholder={searchPlaceholder}
      />
    </div>
  );
}
