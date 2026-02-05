import type { Meta, StoryObj } from "@storybook/react-vite";

import { ListCard } from "./ListCard";

export default {
  title: "Components/ListCard",
  component: ListCard,
  tags: ["autodocs"],
  parameters: {
    layout: "centered",
  },
  decorators: [
    (Story) => (
      <div className="w-full max-w-[380px] px-4 py-6">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof ListCard>;

type Story = StoryObj<typeof ListCard>;

export const Book: Story = {
  args: {
    type: "Book",
    title: "これが書籍タイトルB（タイトルが長いときはこんな感じ）",
    lastActivityAt: new Date("2025-12-24T21:09:00.000Z").toISOString(),
    notesCount: 2,
    totalDurationSeconds: 2 * 3600 + 32 * 60 + 24,
  },
};

export const Record: Story = {
  args: {
    type: "Record",
    durationSeconds: 2 * 3600 + 32 * 60 + 24,
    dateTime: new Date("2025-12-28T12:24:00.000Z").toISOString(),
    recordNote: "記録メモ",
    bookName: "書籍名（選択あれば）",
    tags: ["タグ1", "タグ2", "タグ3"],
  },
};

export const RecordWithDuplicateTags: Story = {
  args: {
    ...Record.args,
    tags: ["タグ1", "タグ1", "タグ1"],
  },
};

export const RecordWithBookMemo: Story = {
  args: {
    ...Record.args,
    bookNote:
      "第2章の事例が特に参考になったので、次回のレビューでも再度読みたい。",
  },
};

export const BookNote: Story = {
  args: {
    type: "BookNote",
    createdAt: new Date("2025-12-28T12:24:00.000Z").toISOString(),
    bookName: "書籍名（選択あれば）",
    bookNote: "書籍メモ",
  },
};
