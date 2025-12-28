import { useState } from "react";
import { useApp } from "../context/AppContext";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "./ui/dialog";
import { Input } from "./ui/input";
import { Plus } from "lucide-react";
import { FieldItem } from "./FieldItem";
import { PrimaryButton } from "./PrimaryButton";

export type AddBookDialogProps = {
  trigger?: React.ReactElement;
};

export function AddBookDialog({ trigger }: AddBookDialogProps) {
  const { addBook } = useApp();
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (title.trim()) {
      addBook({
        title: title.trim(),
        memos: [],
      });
      setTitle("");
      setOpen(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger ?? (
          <PrimaryButton
            className="px-3 py-2 text-sm"
            icon={<Plus className="size-4" />}
          >
            書籍登録
          </PrimaryButton>
        )}
      </DialogTrigger>
      <DialogContent hideClose>
        <div className="flex flex-col gap-5">
          <DialogHeader className="items-center text-center">
            <DialogTitle>書籍を登録</DialogTitle>
            <DialogDescription>
              読書時間を記録したい書籍を追加します
            </DialogDescription>
          </DialogHeader>

          <form id="add-book-form" onSubmit={handleSubmit}>
            <FieldItem
              className="w-full"
              labelProps={{ text: "書籍タイトル", showOptionalLabel: false }}
              instance={
                <Input
                  id="title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="書籍名を入力"
                  required
                  className="h-auto min-h-[44px] rounded-[6px] px-4 py-3 text-sm leading-5"
                />
              }
            />
          </form>
        </div>

        <div className="flex gap-4">
          <PrimaryButton
            type="button"
            onClick={() => setOpen(false)}
            className="flex-1 px-4 py-2 text-sm"
          >
            キャンセル
          </PrimaryButton>
          <PrimaryButton
            type="submit"
            form="add-book-form"
            className="flex-1 px-4 py-2 text-sm"
          >
            書籍登録
          </PrimaryButton>
        </div>
      </DialogContent>
    </Dialog>
  );
}
