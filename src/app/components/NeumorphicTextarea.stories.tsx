import type { Meta, StoryObj } from "@storybook/react-vite";

import { NeumorphicTextarea } from "./NeumorphicTextarea";

const meta = {
  title: "Components/NeumorphicTextarea",
  component: NeumorphicTextarea,
  parameters: {
    layout: "centered",
  },
  tags: ["autodocs"],
  args: {
    placeholder: "プレースホルダー",
    value: "",
    disabled: false,
    rows: 3,
    className: "w-[291px]",
  },
} satisfies Meta<typeof NeumorphicTextarea>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Filled: Story = {
  args: {
    value: "入力済みテキスト\n2行目",
  },
};

export const Disabled: Story = {
  args: {
    value: "",
    disabled: true,
  },
};
