import type { Meta, StoryObj } from "@storybook/react-vite";

import { useMemo, useState } from "react";

import { Dialog } from "../../components/Dialog";
import { FieldItem } from "../../components/FieldItem";
import { NeumorphicInput } from "../../components/NeumorphicInput";
import { NeumorphicSelectTrigger } from "../../components/NeumorphicSelectTrigger";
import { NeumorphicTextarea } from "../../components/NeumorphicTextarea";
import { TagMultiSelectInput } from "../../components/TagMultiSelectInput";
import {
  fromSelectValue,
  Select,
  SelectContent,
  SelectItem,
  SelectNoneItem,
  SelectValue,
  toSelectValue,
} from "../../components/ui/select";

import type { Tag } from "../../types";

import { DialogStoryFrame } from "./DialogStoryFrame";

const meta = {
  title: "Dialogs/Records",
  parameters: {
    layout: "fullscreen",
  },
} satisfies Meta;

export default meta;

type Story = StoryObj;

const sampleBooks = [
  { id: "book-1", title: "サンプル書籍A" },
  { id: "book-2", title: "サンプル書籍B" },
] as const;

const initialTags: Array<Pick<Tag, "id" | "text">> = [
  { id: "tag-1", text: "Dairy" },
  { id: "tag-2", text: "読書" },
  { id: "tag-3", text: "メモ" },
];

function useRecordDialogFields() {
  const [startAt, setStartAt] = useState("2026-01-11T10:00:00");
  const [endAt, setEndAt] = useState("2026-01-11T10:30:00");
  const [memo, setMemo] = useState("例）P.10まで読んだ");
  const [bookId, setBookId] = useState<string | null>(sampleBooks[0]?.id ?? null);
  const [bookMemo, setBookMemo] = useState("例）第2章に具体的な例が多い");

  const [tagOptions, setTagOptions] = useState<Array<Pick<Tag, "id" | "text">>>(
    () => [...initialTags]
  );
  const [tagIds, setTagIds] = useState<string[]>(() =>
    initialTags[0] ? [initialTags[0].id] : []
  );

  const durationSeconds = useMemo(() => {
    const s = Date.parse(startAt);
    const e = Date.parse(endAt);
    if (!Number.isFinite(s) || !Number.isFinite(e)) return 0;
    const diff = Math.floor((e - s) / 1000);
    return diff > 0 ? diff : 0;
  }, [endAt, startAt]);

  return {
    startAt,
    setStartAt,
    endAt,
    setEndAt,
    memo,
    setMemo,
    bookId,
    setBookId,
    bookMemo,
    setBookMemo,
    tagOptions,
    setTagOptions,
    tagIds,
    setTagIds,
    durationSeconds,
  };
}

export const AddRecord: Story = {
  render: () => {
    const [open, setOpen] = useState(true);
    const f = useRecordDialogFields();
    const canSubmit = f.durationSeconds > 0;

    return (
      <DialogStoryFrame open={open} setOpen={setOpen} reopenLabel="記録追加を開く">
        <Dialog
          open={open}
          onOpenChange={setOpen}
          title="記録を追加"
          description="手動で記録を追加できます"
          formPatternType="AddRecord"
          stickyHeader
          contentClassName="sm:max-w-[720px]"
          cancelLabel="追加せず戻る"
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
              labelProps={{ text: "開始日時", showOptionalLabel: false }}
              instance={
                <NeumorphicInput
                  id="startAt"
                  type="datetime-local"
                  step={1}
                  value={f.startAt}
                  onChange={(e) => f.setStartAt(e.target.value)}
                />
              }
            />

            <FieldItem
              className="w-full"
              labelProps={{ text: "終了日時", showOptionalLabel: false }}
              instance={
                <NeumorphicInput
                  id="endAt"
                  type="datetime-local"
                  step={1}
                  value={f.endAt}
                  onChange={(e) => f.setEndAt(e.target.value)}
                />
              }
            />

            <FieldItem
              className="w-full"
              labelProps={{ text: "記録メモ", showOptionalLabel: true }}
              instance={
                <NeumorphicTextarea
                  id="memo"
                  placeholder="例）P.10まで読んだ"
                  value={f.memo}
                  onChange={(e) => f.setMemo(e.target.value)}
                  className="text-base leading-5"
                  rows={2}
                  autoResize
                />
              }
            />

            <FieldItem
              className="w-full"
              labelProps={{ text: "書籍", showOptionalLabel: true }}
              instance={
                <Select
                  value={toSelectValue(f.bookId)}
                  onValueChange={(next) =>
                    f.setBookId(fromSelectValue(next) || null)
                  }
                >
                  <NeumorphicSelectTrigger id="book">
                    <SelectValue placeholder="選択なし" />
                  </NeumorphicSelectTrigger>
                  <SelectContent>
                    <SelectNoneItem />
                    {sampleBooks.map((b) => (
                      <SelectItem key={b.id} value={b.id}>
                        {b.title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              }
            />

            <FieldItem
              className="w-full"
              labelProps={{ text: "書籍に関するメモ", showOptionalLabel: true }}
              instance={
                <NeumorphicTextarea
                  id="bookMemo"
                  placeholder="例）第2章に具体的な例が多い"
                  value={f.bookMemo}
                  onChange={(e) => f.setBookMemo(e.target.value)}
                  className="text-base leading-5"
                  rows={2}
                  autoResize
                />
              }
            />

            <FieldItem
              className="w-full"
              labelProps={{ text: "タグ", showOptionalLabel: true }}
              instance={
                <TagMultiSelectInput
                  id="tags"
                  value={f.tagIds}
                  onChange={f.setTagIds}
                  options={f.tagOptions}
                  placeholder="タグを選択または追加してください"
                  onCreateOption={(text) => {
                    const id = `tag-${Date.now()}`;
                    f.setTagOptions((prev) => [{ id, text }, ...prev]);
                    return id;
                  }}
                />
              }
            />
          </div>
        </Dialog>
      </DialogStoryFrame>
    );
  },
};

export const EditRecord: Story = {
  render: () => {
    const [open, setOpen] = useState(true);
    const f = useRecordDialogFields();
    const canSubmit = f.durationSeconds > 0;

    return (
      <DialogStoryFrame open={open} setOpen={setOpen} reopenLabel="記録編集を開く">
        <Dialog
          open={open}
          onOpenChange={setOpen}
          title="記録を編集"
          description="記録の内容を編集できます"
          formPatternType="AddRecord"
          stickyHeader
          contentClassName="sm:max-w-[720px]"
          cancelLabel="変更せず戻る"
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
              labelProps={{ text: "開始日時", showOptionalLabel: false }}
              instance={
                <NeumorphicInput
                  id="startAt"
                  type="datetime-local"
                  step={1}
                  value={f.startAt}
                  onChange={(e) => f.setStartAt(e.target.value)}
                />
              }
            />

            <FieldItem
              className="w-full"
              labelProps={{ text: "終了日時", showOptionalLabel: false }}
              instance={
                <NeumorphicInput
                  id="endAt"
                  type="datetime-local"
                  step={1}
                  value={f.endAt}
                  onChange={(e) => f.setEndAt(e.target.value)}
                />
              }
            />

            <FieldItem
              className="w-full"
              labelProps={{ text: "記録メモ", showOptionalLabel: true }}
              instance={
                <NeumorphicTextarea
                  id="memo"
                  placeholder="例）P.10まで読んだ"
                  value={f.memo}
                  onChange={(e) => f.setMemo(e.target.value)}
                  className="text-base leading-5"
                  rows={2}
                  autoResize
                />
              }
            />

            <FieldItem
              className="w-full"
              labelProps={{ text: "書籍", showOptionalLabel: true }}
              instance={
                <Select
                  value={toSelectValue(f.bookId)}
                  onValueChange={(next) =>
                    f.setBookId(fromSelectValue(next) || null)
                  }
                >
                  <NeumorphicSelectTrigger id="book">
                    <SelectValue placeholder="選択なし" />
                  </NeumorphicSelectTrigger>
                  <SelectContent>
                    <SelectNoneItem />
                    {sampleBooks.map((b) => (
                      <SelectItem key={b.id} value={b.id}>
                        {b.title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              }
            />

            <FieldItem
              className="w-full"
              labelProps={{ text: "書籍に関するメモ", showOptionalLabel: true }}
              instance={
                <NeumorphicTextarea
                  id="bookMemo"
                  placeholder="例）第2章に具体的な例が多い"
                  value={f.bookMemo}
                  onChange={(e) => f.setBookMemo(e.target.value)}
                  className="text-base leading-5"
                  rows={2}
                  autoResize
                />
              }
            />

            <FieldItem
              className="w-full"
              labelProps={{ text: "タグ", showOptionalLabel: true }}
              instance={
                <TagMultiSelectInput
                  id="tags"
                  value={f.tagIds}
                  onChange={f.setTagIds}
                  options={f.tagOptions}
                  placeholder="タグを選択または追加してください"
                  onCreateOption={(text) => {
                    const id = `tag-${Date.now()}`;
                    f.setTagOptions((prev) => [{ id, text }, ...prev]);
                    return id;
                  }}
                />
              }
            />
          </div>
        </Dialog>
      </DialogStoryFrame>
    );
  },
};
