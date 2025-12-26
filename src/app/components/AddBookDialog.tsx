import { useState } from "react";
import { useApp } from "../context/AppContext";
import { Button } from "./ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "./ui/dialog";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Plus } from "lucide-react";

export type AddBookDialogProps = {
  trigger?: React.ReactElement;
};

export function AddBookDialog({ trigger }: AddBookDialogProps) {
  const { addBook } = useApp();
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [author, setAuthor] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (title.trim()) {
      addBook({
        title: title.trim(),
        author: author.trim() || undefined,
        memos: [],
      });
      setTitle("");
      setAuthor("");
      setOpen(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger ?? (
          <Button>
            <Plus className="size-4 mr-2" />
            書籍登録
          </Button>
        )}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>書籍を登録</DialogTitle>
          <DialogDescription>
            読書時間を記録したい書籍を追加します
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="title">タイトル</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="書籍のタイトルを入力"
              required
            />
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="author">著者（任意）</Label>
            <Input
              id="author"
              value={author}
              onChange={(e) => setAuthor(e.target.value)}
              placeholder="著者名を入力"
            />
          </div>

          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              className="flex-1"
            >
              キャンセル
            </Button>
            <Button type="submit" className="flex-1">
              登録
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
