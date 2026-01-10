import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";

import { Dialog } from "./Dialog";

const meta = {
  title: "Dialogs/GuestCreateNotice",
  component: Dialog,
  parameters: {
    layout: "centered",
    docs: { disable: true },
  },
} satisfies Meta<typeof Dialog>;

export default meta;

type Story = StoryObj<typeof Dialog>;

function GuestCreateNoticeDialogStory() {
  const [open, setOpen] = useState(true);

  return (
    <Dialog
      open={open}
      onOpenChange={setOpen}
      title="ログインしてデータを守りませんか？"
      description={
        "ゲストのままだと、端末変更やアプリ削除でデータが消える可能性があります。ログインすると別端末でも使えます。"
      }
      formPatternType="AddRecord"
      cancelLabel="表示しない"
      confirmLabel="書斎でログイン"
      onCancel={() => setOpen(false)}
      onConfirm={() => setOpen(false)}
    >
      <div className="flex flex-col gap-2 text-sm leading-6 text-foreground">
        <p>
          ゲスト利用はこの端末のみに保存されるため、端末を変えると引き継げません。
        </p>
        <p className="text-muted-foreground">
          ※書斎ページの「Googleアカウントに連携する」からログインできます。
        </p>
      </div>
    </Dialog>
  );
}

export const Default: Story = {
  render: () => <GuestCreateNoticeDialogStory />,
};
