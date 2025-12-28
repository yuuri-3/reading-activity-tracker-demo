import type { Meta, StoryObj } from "@storybook/react-vite";
import { toast } from "sonner";

import { PrimaryButton } from "./PrimaryButton";
import { Toast } from "./Toast";

const meta = {
  title: "Components/Toast",
  component: Toast,
  parameters: {
    layout: "padded",
    docs: { disable: true },
  },
} satisfies Meta<typeof Toast>;

export default meta;

type Story = StoryObj<typeof Toast>;

export const SuccessWithUndo: Story = {
  render: () => (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-muted-foreground">
        下のボタンでToastを発火できます（Storybook
        UIが崩れないよう自動発火はしません）。
      </p>

      <div className="flex flex-wrap gap-2">
        <PrimaryButton
          type="button"
          className="px-3 py-2 text-sm"
          onClick={() => {
            const id = toast.success("計測結果を保存しました", {
              action: {
                label: "Undo",
                onClick: () => {
                  toast.dismiss(id);
                  toast.message("Undoしました");
                },
              },
            });
          }}
        >
          Success + Undo
        </PrimaryButton>

        <PrimaryButton
          type="button"
          className="px-3 py-2 text-sm"
          onClick={() => toast.error("記録の削除に失敗しました")}
        >
          Error
        </PrimaryButton>

        <PrimaryButton
          type="button"
          className="px-3 py-2 text-sm"
          onClick={() => toast.dismiss()}
        >
          Dismiss
        </PrimaryButton>
      </div>
    </div>
  ),
};
