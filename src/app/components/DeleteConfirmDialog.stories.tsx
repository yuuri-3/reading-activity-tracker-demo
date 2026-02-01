import type { Meta, StoryObj } from "@storybook/react-vite";

import { useState } from "react";

import { DeleteConfirmDialog } from "./DeleteConfirmDialog";

const meta = {
  title: "Components/DeleteConfirmDialog",
  component: DeleteConfirmDialog,
  parameters: {
    layout: "centered",
  },
} satisfies Meta<typeof DeleteConfirmDialog>;

export default meta;

type Story = StoryObj<typeof DeleteConfirmDialog>;

export const Default: Story = {
  render: () => {
    const [open, setOpen] = useState(true);

    return (
      <DeleteConfirmDialog
        open={open}
        onOpenChange={setOpen}
        memoText="第2章の事例が特に参考になったので、次回のレビューでも再度読みたい。"
        onDeleteRecord={() => setOpen(false)}
        onDeleteBoth={() => setOpen(false)}
      />
    );
  },
};
