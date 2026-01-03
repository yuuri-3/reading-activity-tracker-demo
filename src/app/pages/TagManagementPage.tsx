import { useMemo, useState } from "react";

import { Dialog } from "../components/Dialog";
import { FieldItem } from "../components/FieldItem";
import { NeumorphicInput } from "../components/NeumorphicInput";
import { NeumorphicTextarea } from "../components/NeumorphicTextarea";
import { PrimaryButton } from "../components/PrimaryButton";
import { TagListItem } from "../components/TagListItem";
import { IconAdd } from "../components/icons/IconAdd";
import { IconBack } from "../components/icons/IconBack";

export function TagManagementPage() {
  type TagItem = {
    id: string;
    text: string;
    amount: string;
    description: string;
    showDescription?: boolean;
  };

  const makeId = () => {
    if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
      return crypto.randomUUID();
    }
    return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  };

  const initialTags = useMemo(
    () => [
      {
        id: "tag-react",
        text: "React",
        amount: "1",
        description: "ここにタグの補足説明",
      },
      {
        id: "tag-design",
        text: "Design",
        amount: "3",
        description: "",
        showDescription: false,
      },
      {
        id: "tag-journal",
        text: "Journal",
        amount: "4",
        description: "",
        showDescription: false,
      },
      {
        id: "tag-dev",
        text: "Dev",
        amount: "2",
        description: "ここにタグの補足説明",
      },
    ],
    []
  );

  const [tags, setTags] = useState<TagItem[]>(initialTags);

  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [tagName, setTagName] = useState("");
  const [memo, setMemo] = useState("");

  const canSubmit = tagName.trim().length > 0;

  const resetForm = () => {
    setTagName("");
    setMemo("");
  };

  const handleOpenAddDialog = () => {
    resetForm();
    setAddDialogOpen(true);
  };

  const handleCancelAdd = () => {
    setAddDialogOpen(false);
    resetForm();
  };

  const handleConfirmAdd = () => {
    const name = tagName.trim();
    if (!name) return;
    const memoText = memo.trim();

    setTags((prev) => [
      {
        id: makeId(),
        text: name,
        amount: "0",
        description: memoText,
        showDescription: memoText.length > 0,
      },
      ...prev,
    ]);
    setAddDialogOpen(false);
    resetForm();
  };

  return (
    <div className="w-full">
      <div className="max-w-2xl mx-auto">
        <header className="sticky top-0 z-30 flex flex-col gap-2 px-6 pt-8 pb-4 backdrop-blur-lg bg-[rgba(232,237,242,0.9)] supports-[backdrop-filter]:bg-[rgba(232,237,242,0.75)]">
          <a
            href="#sanctum"
            className="inline-flex items-center gap-0.5 text-[14px] font-normal leading-5 text-foreground"
          >
            <IconBack size={20} className="shrink-0" />
            <span className="pb-[2px]">戻る</span>
          </a>

          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-medium leading-[1.3] tracking-[0.08em]">
              タグ管理
            </h1>

            <PrimaryButton
              type="button"
              className="pl-3 pr-3.5 py-2 text-sm"
              icon={<IconAdd size={16} />}
              onClick={handleOpenAddDialog}
            >
              タグを追加
            </PrimaryButton>
          </div>
        </header>

        <main className="px-6 pt-6 pb-40">
          <div className="flex flex-col gap-4">
            {tags.map((t) => (
              <TagListItem
                key={t.id}
                text={t.text}
                amount={t.amount}
                description={t.description}
                showDescription={t.showDescription}
              />
            ))}
          </div>
        </main>

        <Dialog
          open={addDialogOpen}
          onOpenChange={(open) => {
            setAddDialogOpen(open);
            if (!open) resetForm();
          }}
          title="タグを追加"
          description="新しいタグを追加します"
          cancelLabel="キャンセル"
          confirmLabel="追加"
          onCancel={handleCancelAdd}
          onConfirm={handleConfirmAdd}
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
      </div>
    </div>
  );
}
