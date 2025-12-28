import { BookOpen, Plus } from "lucide-react";

import { AddBookDialog } from "../AddBookDialog";
import { PrimaryButton } from "../PrimaryButton";

export function BookListEmptyView() {
  return (
    <div className="flex flex-col items-center text-center gap-8 py-12">
      <div className="flex flex-col items-center gap-4">
        <BookOpen className="size-12 text-muted-foreground" />
        <div className="flex flex-col items-center text-muted-foreground leading-6">
          <p className="text-base">書籍が登録されていません</p>
          <p className="text-[13px]">書籍の情報を登録してください</p>
        </div>
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
  );
}
