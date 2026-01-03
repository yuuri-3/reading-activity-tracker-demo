import type { Meta, StoryObj } from "@storybook/react-vite";

import { TagListItem } from "./TagListItem";

const meta = {
  title: "Components/TagListItem",
  component: TagListItem,
  parameters: {
    layout: "centered",
  },
  tags: ["autodocs"],
  args: {
    showDescription: true,
    text: "React",
    description: "あああ",
    amount: "1",
  },
} satisfies Meta<typeof TagListItem>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const NoDescription: Story = {
  args: {
    showDescription: false,
  },
};

export const LongText: Story = {
  args: {
    text: "とても長いタグ名の表示例（折り返さずに省略）",
    description: "説明文も長めのときの表示例です。",
    amount: "12",
  },
};
