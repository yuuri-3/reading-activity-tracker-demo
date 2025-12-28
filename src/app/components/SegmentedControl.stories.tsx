import { useState } from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";

import { SegmentedControl } from "./SegmentedControl";

export default {
  title: "Components/SegmentedControl",
  component: SegmentedControl,
  parameters: {
    layout: "centered",
  },
} satisfies Meta<typeof SegmentedControl>;

type Story = StoryObj<typeof SegmentedControl>;

function SegmentedControlPreview() {
  const [value, setValue] = useState("all");

  return (
    <SegmentedControl
      value={value}
      onValueChange={setValue}
      items={[
        { value: "all", text: "すべて", amount: 2 },
        { value: "books", text: "書籍", amount: 1 },
        { value: "histories", text: "履歴", amount: 1 },
      ]}
    />
  );
}

export const Interactive: Story = {
  render: () => <SegmentedControlPreview />,
};
