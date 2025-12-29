import type { Meta, StoryObj } from "@storybook/react-vite";

import { TimerPage } from "./TimerPage";
import { MockAppProvider } from "../stories/MockAppProvider";
import { createDemoBooks } from "../stories/demoData";

export default {
  title: "Pages/TimerPage",
  component: TimerPage,
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
} satisfies Meta<typeof TimerPage>;

type Story = StoryObj<typeof TimerPage>;

export const Default: Story = {
  render: () => (
    <MockAppProvider initialBooks={createDemoBooks({ variant: "simple" })}>
      <TimerPage />
    </MockAppProvider>
  ),
};

export const WithElapsedTime: Story = {
  render: () => (
    <MockAppProvider
      initialBooks={createDemoBooks({ variant: "simple" })}
      initialTimerSeconds={65}
    >
      <TimerPage />
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
      <TimerPage />
    </MockAppProvider>
  ),
};
