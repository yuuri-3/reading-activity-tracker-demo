import type { Meta, StoryObj } from "@storybook/react-vite";

import { BooksPage } from "./BooksPage";
import { MockAppProvider } from "../stories/MockAppProvider";
import { createDemoBooks, createDemoHistories } from "../stories/demoData";

export default {
  title: "Pages/BooksPage",
  component: BooksPage,
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
} satisfies Meta<typeof BooksPage>;

type Story = StoryObj<typeof BooksPage>;

export const Default: Story = {
  render: () => (
    <MockAppProvider
      initialBooks={createDemoBooks({ variant: "rich" })}
      initialHistories={createDemoHistories({ variant: "recent" })}
    >
      <BooksPage />
    </MockAppProvider>
  ),
};

export const Empty: Story = {
  render: () => (
    <MockAppProvider initialBooks={[]} initialHistories={[]}>
      <BooksPage />
    </MockAppProvider>
  ),
};
