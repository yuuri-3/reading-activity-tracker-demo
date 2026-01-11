import type { Meta, StoryObj } from "@storybook/react-vite";

import { SanctumFullScreenLoadingOverlay } from "./SanctumPage";

const meta = {
  title: "Loading/Overlay/SanctumFullScreen",
  component: SanctumFullScreenLoadingOverlay,
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
} satisfies Meta<typeof SanctumFullScreenLoadingOverlay>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Linking: Story = {
  args: {
    variant: "linking",
  },
};

export const Migrating: Story = {
  args: {
    variant: "migrating",
  },
};
