import type { Meta, StoryObj } from "@storybook/react-vite";
import * as React from "react";

import { BookSingleView } from "./BookSingleView";
import { MockAppProvider } from "../stories/MockAppProvider";
import { createDemoBooks, createDemoRecords } from "../stories/demoData";
import { useApp } from "../context/AppContext";

function BookSingleViewHarness({ bookId }: { bookId?: string }) {
  const { books } = useApp();
  const book = React.useMemo(() => {
    if (bookId) return books.find((b) => b.id === bookId);
    return books[0];
  }, [bookId, books]);

  if (!book) return <div className="p-6">book not found</div>;

  return <BookSingleView book={book} onBack={() => {}} />;
}

export default {
  title: "Pages/BookSingleView",
  component: BookSingleView,
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
} satisfies Meta<typeof BookSingleView>;

type Story = StoryObj<typeof BookSingleView>;

export const Default: Story = {
  render: () => (
    <MockAppProvider
      initialBooks={createDemoBooks({ variant: "rich" })}
      initialRecords={createDemoRecords({ variant: "recent" })}
    >
      <BookSingleViewHarness />
    </MockAppProvider>
  ),
};

export const WithNoItems: Story = {
  render: () => (
    <MockAppProvider
      initialBooks={createDemoBooks({ variant: "simple" })}
      initialRecords={createDemoRecords({ variant: "none" })}
    >
      <BookSingleViewHarness />
    </MockAppProvider>
  ),
};
