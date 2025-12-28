import type { Meta, StoryObj } from "@storybook/react-vite";

import { RecordsPage } from "./RecordsPage";
import { MockAppProvider } from "../stories/MockAppProvider";
import {
  createDemoBooks,
  createDemoHistories,
  createIsoDate,
} from "../stories/demoData";

export default {
  title: "Pages/RecordsPage",
  component: RecordsPage,
  parameters: {
    layout: "fullscreen",
  },
  decorators: [
    (Story) => (
      <div className="h-dvh w-full overflow-hidden">
        <div className="max-w-2xl mx-auto h-full">
          <Story />
        </div>
      </div>
    ),
  ],
} satisfies Meta<typeof RecordsPage>;

type Story = StoryObj<typeof RecordsPage>;

export const Default: Story = {
  render: () => {
    const books = createDemoBooks({ variant: "rich" });
    const baseHistories = createDemoHistories({ variant: "recent" });

    const withAllCombos = [
      // tags: on/off, book: on/off, memo: on/off (8 patterns)
      {
        id: "history-combo-1",
        bookId: books[0]?.id ?? "book-1",
        memo: "記録メモ",
        tags: ["タグ1", "タグ2", "タグ3"],
      },
      {
        id: "history-combo-2",
        bookId: books[0]?.id ?? "book-1",
        memo: "記録メモ",
        tags: [],
      },
      {
        id: "history-combo-3",
        bookId: undefined,
        memo: "記録メモ",
        tags: ["タグ1", "タグ2", "タグ3"],
      },
      {
        id: "history-combo-4",
        bookId: books[0]?.id ?? "book-1",
        memo: "",
        tags: ["タグ1", "タグ2", "タグ3"],
      },
      {
        id: "history-combo-5",
        bookId: undefined,
        memo: "記録メモ",
        tags: [],
      },
      {
        id: "history-combo-6",
        bookId: books[0]?.id ?? "book-1",
        memo: "",
        tags: [],
      },
      {
        id: "history-combo-7",
        bookId: undefined,
        memo: "",
        tags: ["タグ1", "タグ2", "タグ3"],
      },
      {
        id: "history-combo-8",
        bookId: undefined,
        memo: "",
        tags: [],
      },
    ].map((p, idx) => {
      const duration = 2 * 3600 + 32 * 60;
      const endTime = createIsoDate(-180 - idx * 15);
      const startTime = createIsoDate(
        -180 - idx * 15 - Math.floor(duration / 60)
      );

      return {
        id: p.id,
        bookId: p.bookId,
        duration,
        memo: p.memo,
        tags: p.tags,
        startTime,
        endTime,
        createdAt: endTime,
      };
    });

    return (
      <MockAppProvider
        initialBooks={books}
        initialHistories={[...withAllCombos, ...baseHistories]}
      >
        <RecordsPage />
      </MockAppProvider>
    );
  },
};

export const Empty: Story = {
  render: () => (
    <MockAppProvider initialBooks={createDemoBooks()} initialHistories={[]}>
      <RecordsPage />
    </MockAppProvider>
  ),
};

export const Filtered: Story = {
  render: () => (
    <MockAppProvider
      initialBooks={createDemoBooks({ variant: "rich" })}
      initialHistories={createDemoHistories({ variant: "recent" })}
    >
      <RecordsPage />
    </MockAppProvider>
  ),
  play: async ({ canvasElement }) => {
    const input = canvasElement.querySelector(
      'input[placeholder="キーワードで検索"]'
    ) as HTMLInputElement | null;

    if (input) {
      input.focus();
      input.value = "サンプル";
      input.dispatchEvent(new Event("input", { bubbles: true }));
    }
  },
};
