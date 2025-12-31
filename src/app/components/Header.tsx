import * as React from "react";
import { Plus } from "lucide-react";

import { useApp } from "../context/AppContext";
import { Dialog } from "./Dialog";
import { FieldItem } from "./FieldItem";
import { PrimaryButton } from "./PrimaryButton";
import { BookListSearchField } from "./book-list/BookListSearchField";
import { IconBookshelf } from "./icons/IconBookshelf";
import { Input } from "./ui/input";
import {
  SegmentedControl,
  type SegmentedControlItem,
} from "./SegmentedControl";

type HeaderSharedProps = {
  /** Figma: pageTitle */
  pageTitle?: string;
  /** Figma: nested instance (left icon slot) */
  icon?: React.ReactNode | null;
  /** Figma: nested instance (right action slot) */
  action?: React.ReactNode | null;
};

type HeaderDefaultProps = HeaderSharedProps & {
  variant?: "default";
  /** Figma: action label */
  buttonLabel?: string;

  /** Figma: show/hide SegmentedControl */
  showSegmentedControl?: boolean;
  /** Optional override for SegmentedControl items */
  segmentedControlItems?: SegmentedControlItem[];
  /** Optional controlled value for SegmentedControl */
  segmentedControlValue?: string;
  /** Optional change handler for SegmentedControl */
  onSegmentedControlValueChange?: (value: string) => void;

  /** SearchField controlled props */
  searchQuery: string;
  onSearchQueryChange: (value: string) => void;
  searchPlaceholder?: string;
};

type HeaderSimpleProps = HeaderSharedProps & {
  variant: "simple";
};

export type HeaderProps = HeaderDefaultProps | HeaderSimpleProps;

function HeaderSimple({ pageTitle = "本棚", icon, action }: HeaderSimpleProps) {
  return (
    <div className="flex flex-col gap-6 px-6 pt-8 pb-4">
      <div className="flex items-center justify-between h-9">
        <div className="flex items-center gap-1">
          <span className="shrink-0 text-muted-foreground">
            {icon === undefined ? (
              <IconBookshelf size={28} color="currentColor" />
            ) : (
              icon
            )}
          </span>
          <h1 className="text-2xl leading-[1.3] tracking-[0.08em]">
            {pageTitle}
          </h1>
        </div>

        {action ?? null}
      </div>
    </div>
  );
}

function HeaderDefault({
  pageTitle = "本棚",
  buttonLabel = "書籍登録",
  icon,
  action,
  showSegmentedControl = true,
  segmentedControlItems,
  segmentedControlValue,
  onSegmentedControlValueChange,
  searchQuery,
  onSearchQueryChange,
  searchPlaceholder = "書籍を検索",
}: HeaderDefaultProps) {
  const { addBook } = useApp();
  const [isDialogOpen, setIsDialogOpen] = React.useState(false);
  const [bookTitle, setBookTitle] = React.useState("");

  const effectiveSegmentedItems = React.useMemo<SegmentedControlItem[]>(
    () =>
      segmentedControlItems ?? [
        { value: "all", text: "すべて" },
        { value: "reading", text: "記録メモ" },
        { value: "book", text: "書籍メモ" },
      ],
    [segmentedControlItems]
  );

  const isSegmentedControlled =
    segmentedControlValue !== undefined &&
    onSegmentedControlValueChange !== undefined;

  const [uncontrolledSegmentedValue, setUncontrolledSegmentedValue] =
    React.useState(() => effectiveSegmentedItems[0]?.value ?? "all");

  const currentSegmentedValue = isSegmentedControlled
    ? segmentedControlValue
    : uncontrolledSegmentedValue;

  const handleSegmentedValueChange = (nextValue: string) => {
    if (isSegmentedControlled) {
      onSegmentedControlValueChange(nextValue);
      return;
    }

    setUncontrolledSegmentedValue(nextValue);
    onSegmentedControlValueChange?.(nextValue);
  };

  const handleSubmitBook = (e: React.FormEvent) => {
    e.preventDefault();
    if (!bookTitle.trim()) return;

    addBook({
      title: bookTitle.trim(),
      memos: [],
    });

    setBookTitle("");
    setIsDialogOpen(false);
  };

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
          <h1 className="text-2xl leading-[1.3] tracking-[0.08em]">
            {pageTitle}
          </h1>
        </div>

        {action === undefined ? (
          <Dialog
            open={isDialogOpen}
            onOpenChange={setIsDialogOpen}
            title="書籍を登録"
            description="読書時間を記録したい書籍を追加します"
            formPatternType="RegistBook"
            cancelLabel="キャンセル"
            confirmLabel="登録"
            confirmButtonType="submit"
            confirmForm="regist-book-form"
            onCancel={() => setIsDialogOpen(false)}
            trigger={
              <PrimaryButton
                className="px-3 py-2 text-sm"
                icon={<Plus className="size-4" />}
              >
                {buttonLabel}
              </PrimaryButton>
            }
          >
            <form id="regist-book-form" onSubmit={handleSubmitBook}>
              <FieldItem
                className="w-full"
                labelProps={{ text: "書籍タイトル", showOptionalLabel: false }}
                instance={
                  <Input
                    id="title"
                    value={bookTitle}
                    onChange={(e) => setBookTitle(e.target.value)}
                    placeholder="書籍名を入力"
                    required
                    className="h-auto min-h-[44px] rounded-[6px] px-4 py-3 text-sm leading-5"
                  />
                }
              />
            </form>
          </Dialog>
        ) : (
          action
        )}
      </div>

      <div className="flex flex-col gap-4">
        <BookListSearchField
          value={searchQuery}
          onChange={onSearchQueryChange}
          placeholder={searchPlaceholder}
        />

        {showSegmentedControl && (
          <SegmentedControl
            className="w-full"
            items={effectiveSegmentedItems}
            value={currentSegmentedValue}
            onValueChange={handleSegmentedValueChange}
          />
        )}
      </div>
    </div>
  );
}

export function Header(props: HeaderProps) {
  if (props.variant === "simple") {
    return <HeaderSimple {...props} />;
  }

  return <HeaderDefault {...props} />;
}
