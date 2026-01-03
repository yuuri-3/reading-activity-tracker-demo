import type { Meta, StoryObj } from "@storybook/react-vite";

import { TagManagementPage } from "./TagManagementPage";

export default {
  title: "Pages/TagManagementPage",
  component: TagManagementPage,
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
} satisfies Meta<typeof TagManagementPage>;

type Story = StoryObj<typeof TagManagementPage>;

export const Default: Story = {
  render: () => <TagManagementPage />,
};
