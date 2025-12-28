import type { Meta, StoryObj } from "@storybook/react-vite";

import { BookCollectionView } from "./BookCollectionView";
import { MockAppProvider } from "../stories/MockAppProvider";
import { createDemoBooks, createDemoRecords } from "../stories/demoData";

export default {
  title: "Pages/BookCollectionView",
  component: BookCollectionView,
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
} satisfies Meta<typeof BookCollectionView>;

type Story = StoryObj<typeof BookCollectionView>;

export const Default: Story = {
  render: () => (
    <MockAppProvider
      initialBooks={createDemoBooks({ variant: "rich" })}
      initialRecords={createDemoRecords({ variant: "recent" })}
    >
      <BookCollectionView />
    </MockAppProvider>
  ),
};

export const Empty: Story = {
  render: () => (
    <MockAppProvider initialBooks={[]} initialRecords={[]}>
      <BookCollectionView />
    </MockAppProvider>
  ),
};
