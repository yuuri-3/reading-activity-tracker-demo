import type { Meta, StoryObj } from "@storybook/react-vite";

import { RecordSingleView } from "./RecordSingleView";
import { MockAppProvider } from "../stories/MockAppProvider";
import {
  createDemoBooks,
  createDemoRecords,
  createIsoDate,
  createDemoTags,
} from "../stories/demoData";

export default {
  title: "Pages/RecordSingleView",
  component: RecordSingleView,
  parameters: {
    layout: "fullscreen",
  },
  decorators: [
    (Story) => (
      <div className="h-dvh w-full overflow-hidden">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof RecordSingleView>;

type Story = StoryObj<typeof RecordSingleView>;

function createDefaultRecordsStoryData() {
  const books = createDemoBooks({ variant: "rich" });
  const baseRecords = createDemoRecords({ variant: "recent" });

  const tags = [
    ...createDemoTags(),
    {
      id: "tag-1",
      text: "タグ1",
      description: "",
      createdAt: createIsoDate(-10 * 24 * 60),
    },
    {
      id: "tag-2",
      text: "タグ2",
      description: "",
      createdAt: createIsoDate(-10 * 24 * 60 + 1),
    },
    {
      id: "tag-3",
      text: "タグ3",
      description: "",
      createdAt: createIsoDate(-10 * 24 * 60 + 2),
    },
  ];

  const withAllCombos = [
    // tags: on/off, book: on/off, memo: on/off (8 patterns)
    {
      id: "record-combo-1",
      bookId: books[0]?.id ?? "book-1",
      memo: "記録メモ",
      tagIds: ["tag-1", "tag-2", "tag-3"],
    },
    {
      id: "record-combo-2",
      bookId: books[0]?.id ?? "book-1",
      memo: "記録メモ",
      tagIds: [],
    },
    {
      id: "record-combo-3",
      bookId: undefined,
      memo: "記録メモ",
      tagIds: ["tag-1", "tag-2", "tag-3"],
    },
    {
      id: "record-combo-4",
      bookId: books[0]?.id ?? "book-1",
      memo: "",
      tagIds: ["tag-1", "tag-2", "tag-3"],
    },
    {
      id: "record-combo-5",
      bookId: undefined,
      memo: "記録メモ",
      tagIds: [],
    },
    {
      id: "record-combo-6",
      bookId: books[0]?.id ?? "book-1",
      memo: "",
      tagIds: [],
    },
    {
      id: "record-combo-7",
      bookId: undefined,
      memo: "",
      tagIds: ["tag-1", "tag-2", "tag-3"],
    },
    {
      id: "record-combo-8",
      bookId: undefined,
      memo: "",
      tagIds: [],
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
      tagIds: p.tagIds,
      startTime,
      endTime,
      createdAt: endTime,
    };
  });

  return { books, tags, records: [...withAllCombos, ...baseRecords] };
}

export const Default: Story = {
  render: () => {
    const { books, records, tags } = createDefaultRecordsStoryData();

    return (
      <MockAppProvider
        initialBooks={books}
        initialRecords={records}
        initialTags={tags}
      >
        <RecordSingleView />
      </MockAppProvider>
    );
  },
};

export const Empty: Story = {
  render: () => (
    <MockAppProvider
      initialBooks={createDemoBooks()}
      initialRecords={[]}
      initialTags={createDemoTags()}
    >
      <RecordSingleView />
    </MockAppProvider>
  ),
};

export const Filtered: Story = {
  render: () => {
    const { books, records, tags } = createDefaultRecordsStoryData();

    return (
      <MockAppProvider
        initialBooks={books}
        initialRecords={records}
        initialTags={tags}
      >
        <RecordSingleView />
      </MockAppProvider>
    );
  },
  play: async ({ canvasElement }) => {
    const input = canvasElement.querySelector(
      'input[placeholder="キーワードで検索"]'
    ) as HTMLInputElement | null;

    if (input) {
      const setNativeValue = (el: HTMLInputElement, value: string) => {
        const valueSetter = Object.getOwnPropertyDescriptor(el, "value")?.set;
        const prototype = Object.getPrototypeOf(el);
        const prototypeValueSetter = Object.getOwnPropertyDescriptor(
          prototype,
          "value"
        )?.set;

        if (prototypeValueSetter && valueSetter !== prototypeValueSetter) {
          prototypeValueSetter.call(el, value);
        } else {
          valueSetter?.call(el, value);
        }
      };

      input.focus();
      setNativeValue(input, "メモ");
      input.dispatchEvent(new Event("input", { bubbles: true }));
    }
  },
};
