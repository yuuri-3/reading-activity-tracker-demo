import { Clock, FileText, Calendar } from "lucide-react";

import { ListCard } from "../ListCard";
import { formatDateTime, formatDurationHm } from "../../utils/format";

export type BookListCardProps = {
  title: string;
  lastActivityAt: string;
  notesCount: number;
  totalDurationSeconds: number;
  onClick?: () => void;
};

export function BookListCard({
  title,
  lastActivityAt,
  notesCount,
  totalDurationSeconds,
  onClick,
}: BookListCardProps) {
  return (
    <ListCard
      as={onClick ? "button" : "div"}
      shadow="sm"
      className="w-full"
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
    </ListCard>
  );
}
