import { ListCard } from "../ListCard";

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
      type="Book"
      title={title}
      lastActivityAt={lastActivityAt}
      notesCount={notesCount}
      totalDurationSeconds={totalDurationSeconds}
      onClick={onClick}
    />
  );
}
