import { BookOpen } from "lucide-react";
import * as React from "react";

type ListEmptyViewProps = {
  icon?: React.ReactNode;
  message?: React.ReactNode;
  submessage?: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
};

export function ListEmptyView({
  icon,
  message,
  submessage,
  action,
  className,
}: ListEmptyViewProps) {
  const resolvedMessage =
    message === undefined ? "書籍が登録されていません" : message;
  const resolvedSubmessage =
    submessage === undefined ? "書籍の情報を登録してください" : submessage;

  return (
    <div
      className={[
        "flex flex-col items-center text-center gap-8 py-12",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      <div className="flex flex-col items-center gap-4">
        {icon === undefined ? (
          <BookOpen className="size-12 text-muted-foreground" />
        ) : (
          icon
        )}

        <div className="flex flex-col items-center text-muted-foreground leading-6">
          {resolvedMessage === null ? null : typeof resolvedMessage ===
            "string" ? (
            <p className="text-base">{resolvedMessage}</p>
          ) : (
            <div className="text-base">{resolvedMessage}</div>
          )}

          {resolvedSubmessage === null ? null : typeof resolvedSubmessage ===
            "string" ? (
            <p className="text-[13px]">{resolvedSubmessage}</p>
          ) : (
            <div className="text-[13px]">{resolvedSubmessage}</div>
          )}
        </div>
      </div>

      {action ? <div>{action}</div> : null}
    </div>
  );
}
