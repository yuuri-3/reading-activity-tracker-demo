import type { Meta, StoryObj } from "@storybook/react-vite";

import { useState } from "react";

import { Dialog } from "../../components/Dialog";

import { DialogStoryFrame } from "./DialogStoryFrame";

const meta = {
  title: "Dialogs/Account",
  parameters: {
    layout: "fullscreen",
  },
} satisfies Meta;

export default meta;

type Story = StoryObj;

export const DeleteAccount: Story = {
  render: () => {
    const [open, setOpen] = useState(true);
    const [isDeleting, setIsDeleting] = useState(false);

    return (
      <DialogStoryFrame open={open} setOpen={setOpen} reopenLabel="アカウント削除を開く">
        <Dialog
          open={open}
          onOpenChange={(next) => {
            if (isDeleting) return;
            setOpen(next);
          }}
          title="アカウントを削除"
          description="この操作は取り消せません。書籍・記録などのデータも削除されます。"
          formPatternType="AddRecord"
          cancelLabel="キャンセル"
          confirmLabel={isDeleting ? "削除中…" : "削除する"}
          disableEscapeClose={isDeleting}
          disableOutsideClose={isDeleting}
          onCancel={() => setOpen(false)}
          onConfirm={() => {
            if (isDeleting) return;
            setIsDeleting(true);
            window.setTimeout(() => {
              setIsDeleting(false);
              setOpen(false);
            }, 800);
          }}
          cancelButtonProps={{ disabled: isDeleting }}
          confirmButtonProps={{
            disabled: isDeleting,
            className: "text-destructive",
          }}
        >
          <div className="flex flex-col gap-2 text-sm leading-6 text-foreground">
            <p>
              削除すると、同じアカウントでログインしてもデータを復元できません。
            </p>
            <p className="text-muted-foreground">
              ※削除に失敗する場合は、いったんログアウト→再ログイン後にお試しください。
            </p>
          </div>
        </Dialog>
      </DialogStoryFrame>
    );
  },
};

export const LinkGuestData: Story = {
  render: () => {
    const [open, setOpen] = useState(true);
    const [isLinking, setIsLinking] = useState(false);

    return (
      <DialogStoryFrame
        open={open}
        setOpen={setOpen}
        reopenLabel="ゲストデータ統合を開く"
      >
        <Dialog
          open={open}
          onOpenChange={(next) => {
            if (isLinking) return;
            setOpen(next);
          }}
          title="ゲストデータを統合します"
          description="この端末のゲストデータを、これからログインするアカウントに統合します。"
          cancelLabel="キャンセル"
          confirmLabel={isLinking ? "処理中…" : "続行"}
          disableEscapeClose={isLinking}
          disableOutsideClose={isLinking}
          onCancel={() => setOpen(false)}
          onConfirm={() => {
            if (isLinking) return;
            setIsLinking(true);
            window.setTimeout(() => {
              setIsLinking(false);
              setOpen(false);
            }, 800);
          }}
          cancelButtonProps={{ disabled: isLinking }}
          confirmButtonProps={{ disabled: isLinking }}
        >
          <div className="text-sm leading-6 text-foreground">
            統合後は同じ端末・同じアカウントでログインすると、ゲスト中に作成した本棚や記録が引き続き表示されます。
          </div>
        </Dialog>
      </DialogStoryFrame>
    );
  },
};

export const FallbackMigration: Story = {
  render: () => {
    const [open, setOpen] = useState(true);
    const [isMigrating, setIsMigrating] = useState(false);

    return (
      <DialogStoryFrame open={open} setOpen={setOpen} reopenLabel="追加のみ移行を開く">
        <Dialog
          open={open}
          onOpenChange={(next) => {
            if (isMigrating) return;
            setOpen(next);
          }}
          title="追加のみ移行を実行します"
          description={
            "このGoogleアカウントは、すでに別のユーザーに紐付いているため統合（同じuidのまま連携）ができません。\n\n続行すると、Googleでログインした後に、この端末のゲストデータを『追加のみ』コピーして統合します（既存データは削除しません）。"
          }
          cancelLabel="キャンセル"
          confirmLabel={isMigrating ? "処理中…" : "続行"}
          disableEscapeClose={isMigrating}
          disableOutsideClose={isMigrating}
          onCancel={() => {
            if (isMigrating) return;
            setOpen(false);
          }}
          onConfirm={() => {
            if (isMigrating) return;
            setIsMigrating(true);
            window.setTimeout(() => {
              setIsMigrating(false);
              setOpen(false);
            }, 800);
          }}
          cancelButtonProps={{ disabled: isMigrating }}
          confirmButtonProps={{ disabled: isMigrating }}
        >
          <div className="text-sm leading-6 text-foreground whitespace-pre-line">
            {
              "移行対象: タグ 3件 / 本棚 2件 / 記録 10件\n\n※キャンセルすると、ゲストのまま利用できます。別のGoogleアカウントを選び直すこともできます。"
            }
          </div>
        </Dialog>
      </DialogStoryFrame>
    );
  },
};

export const AccountMismatch: Story = {
  render: () => {
    const [open, setOpen] = useState(true);
    const [isMigrating, setIsMigrating] = useState(false);

    return (
      <DialogStoryFrame open={open} setOpen={setOpen} reopenLabel="アカウント不一致を開く">
        <Dialog
          open={open}
          onOpenChange={(next) => {
            if (isMigrating) return;
            setOpen(next);
          }}
          title="別のGoogleアカウントが選択されました"
          description={
            "最初に選択したアカウント（推定）: expected@example.com\n今回選択したアカウント: selected@example.com\n\nこのアカウントにゲストデータを統合します。よろしいですか？"
          }
          cancelLabel="キャンセル"
          confirmLabel={isMigrating ? "処理中…" : "このアカウントに統合する"}
          disableEscapeClose={isMigrating}
          disableOutsideClose={isMigrating}
          onCancel={() => {
            if (isMigrating) return;
            setOpen(false);
          }}
          onConfirm={() => {
            if (isMigrating) return;
            setIsMigrating(true);
            window.setTimeout(() => {
              setIsMigrating(false);
              setOpen(false);
            }, 800);
          }}
          cancelButtonProps={{ disabled: isMigrating }}
          confirmButtonProps={{ disabled: isMigrating }}
        >
          <div className="text-sm leading-6 text-foreground whitespace-pre-line">
            {"移行対象: タグ 3件 / 本棚 2件 / 記録 10件\n\n※キャンセルすると、ゲストのまま利用できます。"}
          </div>
        </Dialog>
      </DialogStoryFrame>
    );
  },
};
