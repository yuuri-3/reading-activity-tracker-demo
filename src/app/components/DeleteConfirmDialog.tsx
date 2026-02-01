import * as React from "react";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "./ui/dialog";
import { PrimaryButton } from "./PrimaryButton";
import { cn } from "./ui/utils";

export type DeleteConfirmDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  memoText?: string | null;
  onDeleteRecord: () => void;
  onDeleteBoth: () => void;
  cancelLabel?: React.ReactNode;
  deleteRecordLabel?: React.ReactNode;
  deleteBothLabel?: React.ReactNode;
};

function createMemoPreview(text: string | null | undefined, limit = 50) {
  const trimmed = text?.trim() ?? "";
  if (!trimmed) return "";
  if (trimmed.length <= limit) return trimmed;
  return `${trimmed.slice(0, limit)}…`;
}

export function DeleteConfirmDialog({
  open,
  onOpenChange,
  memoText,
  onDeleteRecord,
  onDeleteBoth,
  cancelLabel = "キャンセル",
  deleteRecordLabel = "記録のみ削除",
  deleteBothLabel = "両方削除",
}: DeleteConfirmDialogProps) {
  const preview = createMemoPreview(memoText);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent hideClose className="sm:max-w-[420px]">
        <DialogHeader className="items-center text-center">
          <DialogTitle>記録を削除</DialogTitle>
          <DialogDescription>
            この記録と一緒に作成された書籍メモがあります
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-3">
          <p className="text-xs text-muted-foreground">書籍メモのプレビュー</p>
          <div className="rounded-[12px] border border-border bg-[var(--background-solid)] px-3 py-2">
            <p
              className={cn(
                "text-sm text-muted-foreground whitespace-pre-wrap",
                preview ? "" : "italic",
              )}
            >
              {preview || "(メモは空です)"}
            </p>
          </div>
        </div>

        <div className="flex flex-col gap-3">
          <PrimaryButton type="button" onClick={() => onOpenChange(false)}>
            {cancelLabel}
          </PrimaryButton>
          <PrimaryButton type="button" onClick={onDeleteRecord}>
            {deleteRecordLabel}
          </PrimaryButton>
          <PrimaryButton
            type="button"
            onClick={onDeleteBoth}
            className="text-destructive"
          >
            {deleteBothLabel}
          </PrimaryButton>
        </div>
      </DialogContent>
    </Dialog>
  );
}
