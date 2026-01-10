import type { Meta, StoryObj } from "@storybook/react-vite";

import { useMemo, useState } from "react";

import { Dialog } from "../../components/Dialog";
import { FieldItem } from "../../components/FieldItem";
import { NeumorphicTextarea } from "../../components/NeumorphicTextarea";
import { PrimaryButton } from "../../components/PrimaryButton";
import { Input } from "../../components/ui/input";
import { IconAdd } from "../../components/icons/IconAdd";

import { DialogStoryFrame } from "./DialogStoryFrame";

const meta = {
  title: "Dialogs/Books",
  parameters: {
    layout: "fullscreen",
  },
} satisfies Meta;

export default meta;

type Story = StoryObj;

export const RegistBook: Story = {
  render: () => {
    const [open, setOpen] = useState(true);
    const [title, setTitle] = useState("");
    const canSubmit = useMemo(() => title.trim().length > 0, [title]);

    return (
      <DialogStoryFrame open={open} setOpen={setOpen} reopenLabel="書籍登録を開く">
        <Dialog
          open={open}
          onOpenChange={setOpen}
          title="書籍を登録"
          description="読書時間を記録したい書籍を追加します"
          formPatternType="RegistBook"
          cancelLabel="キャンセル"
          confirmLabel="登録"
          confirmButtonType="submit"
          confirmForm="regist-book-form"
          onCancel={() => setOpen(false)}
          confirmButtonProps={{ disabled: !canSubmit }}
          trigger={
            <PrimaryButton
              className="px-3 py-2 text-sm"
              icon={<IconAdd size={16} />}
            >
              書籍登録
            </PrimaryButton>
          }
        >
          <form
            id="regist-book-form"
            onSubmit={(e) => {
              e.preventDefault();
              if (!canSubmit) return;
              setOpen(false);
            }}
          >
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
                  className="h-auto min-h-[44px] rounded-[6px] px-4 py-3 text-base leading-5"
                />
              }
            />
          </form>
        </Dialog>
      </DialogStoryFrame>
    );
  },
};

export const EditBookMemo: Story = {
  render: () => {
    const [open, setOpen] = useState(true);
    const [memo, setMemo] = useState("例）第2章に具体的な例が多い");

    return (
      <DialogStoryFrame
        open={open}
        setOpen={setOpen}
        reopenLabel="書籍メモ編集を開く"
      >
        <Dialog
          open={open}
          onOpenChange={setOpen}
          title="書籍メモを編集"
          description="書籍に関するメモを編集します"
          formPatternType="AddRecord"
          cancelLabel="キャンセル"
          confirmLabel="保存"
          onCancel={() => setOpen(false)}
          onConfirm={() => setOpen(false)}
        >
          <FieldItem
            className="w-full"
            labelProps={{ text: "メモ", showOptionalLabel: false }}
            instance={
              <NeumorphicTextarea
                id="editBookMemo"
                value={memo}
                onChange={(e) => setMemo(e.target.value)}
                rows={2}
                autoResize
                placeholder="例）第2章に具体的な例が多い"
              />
            }
          />
        </Dialog>
      </DialogStoryFrame>
    );
  },
};

export const EditRecordMemo: Story = {
  render: () => {
    const [open, setOpen] = useState(true);
    const [memo, setMemo] = useState("例）P.10まで読んだ");

    return (
      <DialogStoryFrame
        open={open}
        setOpen={setOpen}
        reopenLabel="記録メモ編集を開く"
      >
        <Dialog
          open={open}
          onOpenChange={setOpen}
          title="記録メモを編集"
          description="記録メモを編集します"
          formPatternType="AddRecord"
          stickyHeader
          contentClassName="sm:max-w-[720px]"
          cancelLabel="キャンセル"
          confirmLabel="保存"
          onCancel={() => setOpen(false)}
          onConfirm={() => setOpen(false)}
        >
          <FieldItem
            className="w-full"
            labelProps={{ text: "メモ", showOptionalLabel: true }}
            instance={
              <NeumorphicTextarea
                id="editHistoryMemo"
                value={memo}
                onChange={(e) => setMemo(e.target.value)}
                rows={2}
                autoResize
                placeholder="例）P.10まで読んだ"
              />
            }
          />
        </Dialog>
      </DialogStoryFrame>
    );
  },
};
