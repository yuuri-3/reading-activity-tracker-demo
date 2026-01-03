import { IconDelete } from "./icons/IconDelete";
import { IconEdit } from "./icons/IconEdit";

export type TagListItemProps = {
  showDescription?: boolean;
  text?: string;
  description?: string;
  amount?: string;
};

export function TagListItem({
  showDescription = true,
  text = "React",
  description = "あああ",
  amount = "1",
}: TagListItemProps) {
  return (
    <div
      data-slot="tag-list-item"
      className="w-[345px] rounded-[12px] bg-[var(--background-solid)] p-4 [box-shadow:var(--shadow-neumorphism-sm)]"
    >
      <div className="flex w-full items-start gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <div className="min-w-0">
              <p className="truncate text-[16px] font-normal leading-[1.3] text-foreground">
                {text}
              </p>
            </div>
            <div className="shrink-0 rounded-full bg-[var(--taglistitem-badge)] px-2 py-0.5">
              <p className="pb-px text-[12px] font-normal leading-none text-primary-foreground tabular-nums">
                {amount}
              </p>
            </div>
          </div>

          {showDescription ? (
            <p className="mt-0.5 text-[14px] font-normal leading-5 text-muted-foreground">
              {description}
            </p>
          ) : null}
        </div>

        <div className="shrink-0">
          <div className="flex items-center gap-2 text-muted-foreground">
            <button
              type="button"
              aria-label="編集"
              className="transition-colors hover:text-foreground"
            >
              <IconEdit size={20} />
            </button>
            <button
              type="button"
              aria-label="削除"
              className="transition-colors hover:text-foreground"
            >
              <IconDelete size={20} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
