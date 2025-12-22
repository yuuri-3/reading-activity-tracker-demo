import type { Meta, StoryObj } from "@storybook/react-vite";

import { Select, SelectContent, SelectItem, SelectValue } from "./ui/select";

import { FieldItem } from "./FieldItem";
import { NeumorphicSelectTrigger } from "./NeumorphicSelectTrigger";
import { NeumorphicTextarea } from "./NeumorphicTextarea";

const meta = {
  title: "Components/FieldItem",
  component: FieldItem,
  parameters: {
    layout: "centered",
  },
  tags: ["autodocs"],
} satisfies Meta<typeof FieldItem>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => (
    <FieldItem
      labelProps={{
        text: "書籍",
        showOptionalLabel: true,
        optionalText: "Optional",
      }}
      instance={
        <Select>
          <NeumorphicSelectTrigger>
            <SelectValue placeholder="選択なし" />
          </NeumorphicSelectTrigger>
          <SelectContent>
            <SelectItem value="book">書籍</SelectItem>
            <SelectItem value="movie">映画</SelectItem>
            <SelectItem value="music">音楽</SelectItem>
          </SelectContent>
        </Select>
      }
    />
  ),
};

export const Required: Story = {
  render: () => (
    <FieldItem
      labelProps={{ text: "書籍", showOptionalLabel: false }}
      instance={
        <Select>
          <NeumorphicSelectTrigger>
            <SelectValue placeholder="選択なし" />
          </NeumorphicSelectTrigger>
          <SelectContent>
            <SelectItem value="book">書籍</SelectItem>
            <SelectItem value="movie">映画</SelectItem>
            <SelectItem value="music">音楽</SelectItem>
          </SelectContent>
        </Select>
      }
    />
  ),
};

export const Textarea: Story = {
  render: () => (
    <FieldItem
      labelProps={{
        text: "メモ",
        showOptionalLabel: true,
        optionalText: "Optional",
      }}
      instance={<NeumorphicTextarea placeholder="ここに入力" rows={4} />}
    />
  ),
};
