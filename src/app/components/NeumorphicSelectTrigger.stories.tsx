import type { Meta, StoryObj } from "@storybook/react-vite";

import { Select, SelectContent, SelectItem, SelectValue } from "./ui/select";
import { NeumorphicSelectTrigger } from "./NeumorphicSelectTrigger";

const meta = {
  title: "Components/NeumorphicSelectTrigger",
  component: NeumorphicSelectTrigger,
  parameters: {
    layout: "centered",
  },
  tags: ["autodocs"],
} satisfies Meta<typeof NeumorphicSelectTrigger>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Placeholder: Story = {
  render: () => (
    <Select>
      <NeumorphicSelectTrigger className="w-[291px]">
        <SelectValue placeholder="選択なし" />
      </NeumorphicSelectTrigger>
      <SelectContent>
        <SelectItem value="book">書籍</SelectItem>
        <SelectItem value="movie">映画</SelectItem>
        <SelectItem value="music">音楽</SelectItem>
      </SelectContent>
    </Select>
  ),
};

export const Selected: Story = {
  render: () => (
    <Select defaultValue="book">
      <NeumorphicSelectTrigger className="w-[291px]">
        <SelectValue placeholder="選択なし" />
      </NeumorphicSelectTrigger>
      <SelectContent>
        <SelectItem value="book">書籍</SelectItem>
        <SelectItem value="movie">映画</SelectItem>
        <SelectItem value="music">音楽</SelectItem>
      </SelectContent>
    </Select>
  ),
};
