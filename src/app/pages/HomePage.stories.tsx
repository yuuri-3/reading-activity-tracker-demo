import type { Meta, StoryObj } from "@storybook/react-vite";

import { HomePage } from "./HomePage";
import { MockAppProvider } from "../stories/MockAppProvider";
import { createDemoBooks } from "../stories/demoData";

export default {
  title: "Pages/HomePage",
  component: HomePage,
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
} satisfies Meta<typeof HomePage>;

type Story = StoryObj<typeof HomePage>;

export const Default: Story = {
  render: () => (
    <MockAppProvider initialBooks={createDemoBooks({ variant: "simple" })}>
      <HomePage />
    </MockAppProvider>
  ),
};

export const WithElapsedTime: Story = {
  render: () => (
    <MockAppProvider
      initialBooks={createDemoBooks({ variant: "simple" })}
      initialTimerSeconds={65}
    >
      <HomePage />
    </MockAppProvider>
  ),
};

export const Running: Story = {
  render: () => (
    <MockAppProvider
      initialBooks={createDemoBooks({ variant: "simple" })}
      initialTimerSeconds={12}
      initialTimerRunning
    >
      <HomePage />
    </MockAppProvider>
  ),
};
