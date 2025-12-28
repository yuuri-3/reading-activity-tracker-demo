import { BookOpen, Plus } from "lucide-react";

import * as React from "react";

import { useApp } from "../../context/AppContext";
import { Dialog } from "../Dialog";
import { FieldItem } from "../FieldItem";
import { PrimaryButton } from "../PrimaryButton";
import { Input } from "../ui/input";

export function BookListEmptyView() {
  const { addBook } = useApp();
  const [isDialogOpen, setIsDialogOpen] = React.useState(false);
  const [bookTitle, setBookTitle] = React.useState("");

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
    <div className="flex flex-col items-center text-center gap-8 py-12">
      <div className="flex flex-col items-center gap-4">
        <BookOpen className="size-12 text-muted-foreground" />
        <div className="flex flex-col items-center text-muted-foreground leading-6">
          <p className="text-base">書籍が登録されていません</p>
          <p className="text-[13px]">書籍の情報を登録してください</p>
        </div>
      </div>

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
            書籍登録
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
    </div>
  );
}
