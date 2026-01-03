import { useMemo, useState } from "react";
import { toast } from "sonner";

import type { Tag } from "../types";

import { useApp } from "../context/AppContext";

import { Dialog } from "../components/Dialog";
import { FieldItem } from "../components/FieldItem";
import { NeumorphicInput } from "../components/NeumorphicInput";
import { NeumorphicTextarea } from "../components/NeumorphicTextarea";
import { PrimaryButton } from "../components/PrimaryButton";
import { TagListItem } from "../components/TagListItem";
import { IconAdd } from "../components/icons/IconAdd";
import { IconBack } from "../components/icons/IconBack";

export type TagManagementPageProps = {
  initialTags?: Tag[];
};

type DisplayedTag = Tag & {
  amount: string;
  showDescription: boolean;
};

function normalizeTagKey(text: string) {
  return text.trim().toLocaleLowerCase();
}

export function TagManagementPage({ initialTags }: TagManagementPageProps) {
  const app = (() => {
    try {
      return useApp();
    } catch {
      return null;
    }
  })();

  const records = app?.records ?? [];
  const storedTags = app?.tags ?? [];
  const createTag = app?.createTag;
  const updateTag = app?.updateTag;
  const deleteTag = app?.deleteTag;
  const restoreTag = app?.restoreTag;

  const [localTags, setLocalTags] = useState<Tag[]>(() => initialTags ?? []);

  const tagsSource = initialTags !== undefined ? localTags : storedTags;

  const usageCountById = useMemo(() => {
    const map = new Map<string, number>();

    // Legacy fallback: map tag label -> first tag id (duplicates allowed).
    const idByTextKey = new Map<string, string>();
    for (const t of storedTags) {
      const k = normalizeTagKey(t.text);
      if (!k) continue;
      if (!idByTextKey.has(k)) idByTextKey.set(k, t.id);
    }

    for (const r of records) {
      const ids = r.tagIds ?? [];
      if (ids.length > 0) {
        for (const id of ids) {
          map.set(id, (map.get(id) ?? 0) + 1);
        }
        continue;
      }

      for (const raw of r.tags ?? []) {
        const k = normalizeTagKey(raw);
        if (!k) continue;
        const id = idByTextKey.get(k);
        if (!id) continue;
        map.set(id, (map.get(id) ?? 0) + 1);
      }
    }

    return map;
  }, [records, storedTags]);

  const displayedTags = useMemo<DisplayedTag[]>(() => {
    return tagsSource
      .map((t) => {
        const count = usageCountById.get(t.id) ?? 0;
        const description = t.description ?? "";
        return {
          ...t,
          amount: String(count),
          description,
          showDescription: description.trim().length > 0,
        };
      })
      .sort((a, b) => {
        const aTime = a.createdAt ?? "";
        const bTime = b.createdAt ?? "";
        if (aTime && bTime) return bTime.localeCompare(aTime);
        return a.text.localeCompare(b.text, "ja");
      });
  }, [tagsSource, usageCountById]);
  const makeId = () => {
    if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
      return crypto.randomUUID();
    }
    return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  };

  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [tagName, setTagName] = useState("");
  const [memo, setMemo] = useState("");

  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingTagId, setEditingTagId] = useState<string | null>(null);
  const [editingTagName, setEditingTagName] = useState("");
  const [editingMemo, setEditingMemo] = useState("");

  const canSubmit = tagName.trim().length > 0;
  const canEditSubmit = editingTagName.trim().length > 0;

  const resetForm = () => {
    setTagName("");
    setMemo("");
  };

  const resetEditForm = () => {
    setEditingTagId(null);
    setEditingTagName("");
    setEditingMemo("");
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

    if (initialTags !== undefined) {
      setLocalTags((prev) => [
        {
          id: makeId(),
          text: name,
          description: memoText,
          createdAt: new Date().toISOString(),
        },
        ...prev,
      ]);
    } else {
      void createTag?.({ text: name, description: memoText });
    }
    setAddDialogOpen(false);
    resetForm();
  };

  const handleOpenEditDialog = (id: string) => {
    const tag = displayedTags.find((t) => t.id === id);
    if (!tag) return;
    setEditingTagId(id);
    setEditingTagName(tag.text);
    setEditingMemo(tag.description);
    setEditDialogOpen(true);
  };

  const handleCancelEdit = () => {
    setEditDialogOpen(false);
    resetEditForm();
  };

  const handleConfirmEdit = () => {
    const id = editingTagId;
    if (!id) return;

    const name = editingTagName.trim();
    if (!name) return;
    const memoText = editingMemo.trim();

    if (initialTags !== undefined) {
      setLocalTags((prev) =>
        prev.map((t) =>
          t.id === id
            ? {
                ...t,
                text: name,
                description: memoText,
              }
            : t
        )
      );
    } else {
      void updateTag?.(id, { text: name, description: memoText });
    }

    setEditDialogOpen(false);
    resetEditForm();
  };

  const handleDeleteTag = (id: string) => {
    const list = initialTags !== undefined ? localTags : displayedTags;
    const index = list.findIndex((t) => t.id === id);
    if (index < 0) return;
    const removed = list[index];
    const removedTag: Tag = {
      id: removed.id,
      text: removed.text,
      description: removed.description ?? "",
      createdAt: removed.createdAt,
    };

    if (initialTags !== undefined) {
      setLocalTags((prev) => prev.filter((t) => t.id !== id));
    } else {
      void deleteTag?.(id);
    }

    const toastId = toast.success("タグを削除しました", {
      action: {
        label: "Undo",
        onClick: () => {
          toast.dismiss(toastId);
          if (initialTags !== undefined) {
            setLocalTags((current) => {
              if (current.some((t) => t.id === removedTag.id)) return current;
              const insertAt = Math.min(index, current.length);
              return [
                ...current.slice(0, insertAt),
                removedTag,
                ...current.slice(insertAt),
              ];
            });
          } else {
            void restoreTag?.(removedTag);
          }
        },
      },
    });
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
            {displayedTags.map((t) => (
              <TagListItem
                key={t.id}
                text={t.text}
                amount={t.amount}
                description={t.description}
                showDescription={t.showDescription}
                onEdit={() => handleOpenEditDialog(t.id)}
                onDelete={() => handleDeleteTag(t.id)}
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

        <Dialog
          open={editDialogOpen}
          onOpenChange={(open) => {
            setEditDialogOpen(open);
            if (!open) resetEditForm();
          }}
          title="タグを編集"
          description="タグの名前や説明を編集します"
          cancelLabel="キャンセル"
          confirmLabel="保存"
          onCancel={handleCancelEdit}
          onConfirm={handleConfirmEdit}
          confirmButtonProps={{ disabled: !canEditSubmit }}
        >
          <div className="flex flex-col gap-4">
            <FieldItem
              className="w-full"
              labelProps={{ text: "タグ名", showOptionalLabel: false }}
              instance={
                <NeumorphicInput
                  value={editingTagName}
                  onChange={(e) => setEditingTagName(e.target.value)}
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
                  value={editingMemo}
                  onChange={(e) => setEditingMemo(e.target.value)}
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
