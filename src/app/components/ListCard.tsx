import * as React from "react";
import { Calendar, Clock, FileText } from "lucide-react";

import { cn } from "./ui/utils";
import { Tag } from "./Tag";
import { formatDateTime, formatDurationHm } from "../utils/format";

type Shadow = "md" | "sm";

type BaseProps = {
  className?: string;
  shadow?: Shadow;
};

type BookVariantProps = BaseProps & {
  type: "Book";
  isDetected?: boolean;
  title: string;
  lastActivityAt: string;
  notesCount: number;
  totalDurationSeconds: number;
  onClick?: () => void;
};

type RecordVariantProps = BaseProps & {
  type: "Record";
  isDetected?: boolean;
  durationSeconds: number;
  dateTime: string;
  recordNote?: React.ReactNode;
  bookName?: string;
  tags?: string[];
  tagsNode?: React.ReactNode;
  onEdit?: () => void;
  onDelete?: () => void;
};

type BookNoteVariantProps = BaseProps & {
  type: "BookNote";
  isDetected?: boolean;
  createdAt: string;
  bookName?: string;
  bookNote: React.ReactNode;
  onEdit?: () => void;
  onDelete?: () => void;
};

export type ListCardProps =
  | BookVariantProps
  | RecordVariantProps
  | BookNoteVariantProps;

function ListCardFrame<TAs extends React.ElementType = "div">({
  as,
  shadow = "md",
  className,
  ...props
}: {
  as?: TAs;
  shadow?: Shadow;
  className?: string;
} & Omit<React.ComponentPropsWithoutRef<TAs>, "as" | "className">) {
  const Component = (as ?? "div") as React.ElementType;
  const isButton = Component === "button";

  const componentProps =
    isButton && (props as any).type == null
      ? ({ ...props, type: "button" } as typeof props)
      : props;

  return (
    <Component
      data-slot="list-card"
      className={cn(
        "bg-[var(--background-solid)] rounded-[12px] border-0",
        shadow === "md"
          ? "[box-shadow:var(--shadow-neumorphism)]"
          : "[box-shadow:var(--shadow-neumorphism-sm)]",
        "p-4",
        isButton && "w-full text-left hover:bg-accent transition-colors",
        className
      )}
      {...(componentProps as any)}
    />
  );
}

function Actions({
  onDelete,
  onEdit,
}: {
  onDelete?: () => void;
  onEdit?: () => void;
}) {
  if (!onDelete && !onEdit) return null;

  return (
    <div className="flex items-start gap-2 text-sm text-muted-foreground">
      {onDelete ? (
        <button
          type="button"
          onClick={onDelete}
          className="hover:text-foreground transition-colors"
        >
          削除
        </button>
      ) : null}
      {onEdit ? (
        <button
          type="button"
          onClick={onEdit}
          className="hover:text-foreground transition-colors"
        >
          編集
        </button>
      ) : null}
    </div>
  );
}

export function ListCard(props: ListCardProps) {
  // isDetected=true はまだ未実装のため、現状は off と同じ表示に寄せる
  switch (props.type) {
    case "Book": {
      const {
        className,
        shadow = "sm",
        title,
        lastActivityAt,
        notesCount,
        totalDurationSeconds,
        onClick,
      } = props;

      return (
        <ListCardFrame
          as={onClick ? "button" : "div"}
          shadow={shadow}
          className={cn("w-full", className)}
          onClick={onClick}
        >
          <div className="flex flex-col gap-2">
            <p className="text-base font-medium leading-6 text-foreground">
              {title}
            </p>

            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-1 text-muted-foreground">
                <Calendar className="size-4" />
                <p className="text-[13px] leading-5 tabular-nums">
                  {formatDateTime(lastActivityAt)}
                </p>
              </div>

              <div className="flex items-center gap-2.5 text-muted-foreground">
                <div className="flex items-center gap-1">
                  <FileText className="size-4" />
                  <p className="text-[13px] leading-5 tabular-nums">
                    {notesCount} notes
                  </p>
                </div>

                <div className="flex items-center gap-1">
                  <Clock className="size-4" />
                  <p className="text-[13px] leading-5 tabular-nums">
                    {formatDurationHm(totalDurationSeconds)}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </ListCardFrame>
      );
    }

    case "Record": {
      const {
        className,
        shadow = "md",
        durationSeconds,
        dateTime,
        recordNote,
        bookName,
        tags,
        tagsNode,
        onDelete,
        onEdit,
      } = props;

      return (
        <ListCardFrame shadow={shadow} className={cn("w-full", className)}>
          <div className="flex flex-col gap-2">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-center gap-3 text-sm text-muted-foreground">
                <p className="tabular-nums">
                  {formatDurationHm(durationSeconds)}
                </p>
                <p className="tabular-nums">{formatDateTime(dateTime)}</p>
              </div>
              <Actions onDelete={onDelete} onEdit={onEdit} />
            </div>

            {recordNote ? (
              <p className="text-sm whitespace-pre-wrap">{recordNote}</p>
            ) : null}

            {bookName ? (
              <p className="text-sm text-muted-foreground truncate">
                {bookName}
              </p>
            ) : null}

            {tagsNode ? (
              <div className="flex flex-wrap gap-2">{tagsNode}</div>
            ) : tags && tags.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {tags.map((t) => (
                  <Tag key={t} text={t} />
                ))}
              </div>
            ) : null}
          </div>
        </ListCardFrame>
      );
    }

    case "BookNote": {
      const {
        className,
        shadow = "md",
        createdAt,
        bookName,
        bookNote,
        onDelete,
        onEdit,
      } = props;

      return (
        <ListCardFrame shadow={shadow} className={cn("w-full", className)}>
          <div className="flex flex-col gap-2">
            <div className="flex items-start justify-between gap-4">
              <p className="text-sm text-muted-foreground tabular-nums">
                {formatDateTime(createdAt)}
              </p>
              <Actions onDelete={onDelete} onEdit={onEdit} />
            </div>

            {bookName ? (
              <p className="text-sm text-muted-foreground truncate">
                {bookName}
              </p>
            ) : null}

            <p className="text-sm whitespace-pre-wrap">{bookNote}</p>
          </div>
        </ListCardFrame>
      );
    }
  }
}
