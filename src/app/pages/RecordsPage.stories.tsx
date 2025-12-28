import type { Meta, StoryObj } from "@storybook/react-vite";

import { RecordsPage } from "./RecordsPage";
import { MockAppProvider } from "../stories/MockAppProvider";
import { createDemoBooks, createDemoHistories } from "../stories/demoData";

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
  render: () => (
    <MockAppProvider
      initialBooks={createDemoBooks({ variant: "rich" })}
      initialHistories={createDemoHistories({ variant: "recent" })}
    >
      <RecordsPage />
    </MockAppProvider>
  ),
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
      'input[placeholder="書籍を検索"]'
    ) as HTMLInputElement | null;

    if (input) {
      input.focus();
      input.value = "サンプル";
      input.dispatchEvent(new Event("input", { bubbles: true }));
    }
  },
};
