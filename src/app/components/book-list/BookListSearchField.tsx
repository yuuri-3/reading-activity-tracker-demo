import { Input } from "../ui/input";
import { IconSearch } from "../icons/IconSearch";

export type BookListSearchFieldProps = {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
};

export function BookListSearchField({
  value,
  onChange,
  placeholder = "書籍を検索",
}: BookListSearchFieldProps) {
  return (
    <div className="relative w-full">
      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground">
        <IconSearch size={4} />
      </span>
      <Input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="h-11 rounded-full pl-11 pr-4"
      />
    </div>
  );
}
