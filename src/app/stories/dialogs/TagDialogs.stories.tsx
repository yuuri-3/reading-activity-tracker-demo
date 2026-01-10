import type { Meta, StoryObj } from "@storybook/react-vite";

import { useMemo, useState } from "react";

import { Dialog } from "../../components/Dialog";
import { FieldItem } from "../../components/FieldItem";
import { NeumorphicInput } from "../../components/NeumorphicInput";
import { NeumorphicTextarea } from "../../components/NeumorphicTextarea";

import { DialogStoryFrame } from "./DialogStoryFrame";

const meta = {
  title: "Dialogs/Tags",
  parameters: {
    layout: "fullscreen",
  },
} satisfies Meta;

export default meta;

type Story = StoryObj;

export const AddTag: Story = {
  render: () => {
    const [open, setOpen] = useState(true);
    const [tagName, setTagName] = useState("");
    const [memo, setMemo] = useState("");
    const canSubmit = useMemo(() => tagName.trim().length > 0, [tagName]);

    return (
      <DialogStoryFrame open={open} setOpen={setOpen} reopenLabel="タグ追加を開く">
        <Dialog
          open={open}
          onOpenChange={(next) => {
            setOpen(next);
            if (!next) {
              setTagName("");
              setMemo("");
            }
          }}
          title="タグを追加"
          description="新しいタグを追加します"
          cancelLabel="キャンセル"
          confirmLabel="追加"
          onCancel={() => setOpen(false)}
          onConfirm={() => {
            if (!canSubmit) return;
            setOpen(false);
          }}
          confirmButtonProps={{ disabled: !canSubmit }}
        >
          <div className="flex flex-col gap-4">
            <FieldItem
              className="w-full"
              labelProps={{ text: "タグ名", showOptionalLabel: false }}
              instance={
                <NeumorphicInput
                  value={tagName}
                  onChange={(e) => setTagName(e.target.value)}
                  placeholder="例）Dairy"
                  autoComplete="off"
                />
              }
            />

            <FieldItem
              className="w-full"
              labelProps={{ text: "メモ", showOptionalLabel: false }}
              instance={
                <NeumorphicTextarea
                  value={memo}
                  onChange={(e) => setMemo(e.target.value)}
                  placeholder="このタグの用途や説明を入力できます"
                  rows={2}
                  className="min-h-[66px] text-base leading-[1.3]"
                />
              }
            />
          </div>
        </Dialog>
      </DialogStoryFrame>
    );
  },
};

export const EditTag: Story = {
  render: () => {
    const [open, setOpen] = useState(true);
    const [tagName, setTagName] = useState("Dairy");
    const [memo, setMemo] = useState("乳製品系をまとめる");
    const canSubmit = useMemo(() => tagName.trim().length > 0, [tagName]);

    return (
      <DialogStoryFrame open={open} setOpen={setOpen} reopenLabel="タグ編集を開く">
        <Dialog
          open={open}
          onOpenChange={setOpen}
          title="タグを編集"
          description="タグの名前や説明を編集します"
          cancelLabel="キャンセル"
          confirmLabel="保存"
          onCancel={() => setOpen(false)}
          onConfirm={() => {
            if (!canSubmit) return;
            setOpen(false);
          }}
          confirmButtonProps={{ disabled: !canSubmit }}
        >
          <div className="flex flex-col gap-4">
            <FieldItem
              className="w-full"
              labelProps={{ text: "タグ名", showOptionalLabel: false }}
              instance={
                <NeumorphicInput
                  value={tagName}
                  onChange={(e) => setTagName(e.target.value)}
                  placeholder="例）Dairy"
                  autoComplete="off"
                />
              }
            />

            <FieldItem
              className="w-full"
              labelProps={{ text: "メモ", showOptionalLabel: false }}
              instance={
                <NeumorphicTextarea
                  value={memo}
                  onChange={(e) => setMemo(e.target.value)}
                  placeholder="このタグの用途や説明を入力できます"
                  rows={2}
                  className="min-h-[66px] text-base leading-[1.3]"
                />
              }
            />
          </div>
        </Dialog>
      </DialogStoryFrame>
    );
  },
};
