import type { Meta, StoryObj } from "@storybook/react-vite";

import { Tag } from "./Tag";

const meta = {
  title: "Components/Tag",
  component: Tag,
  parameters: {
    layout: "centered",
  },
  tags: ["autodocs"],
  argTypes: {
    asChild: {
      control: false,
    },
    children: {
      control: false,
    },
  },
  args: {
    text: "タグ1",
  },
} satisfies Meta<typeof Tag>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const LongText: Story = {
  args: {
    text: "とても長いタグの表示例",
  },
};
