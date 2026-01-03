import type { Meta, StoryObj } from "@storybook/react-vite";

import { SanctumPage } from "./SanctumPage";
import { MockAuthProvider } from "../auth/AuthContext";

export default {
  title: "Pages/SanctumPage",
  component: SanctumPage,
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
} satisfies Meta<typeof SanctumPage>;

type Story = StoryObj<typeof SanctumPage>;

export const Default: Story = {
  render: () => (
    <MockAuthProvider
      user={
        {
          email: "demo@example.com",
          displayName: "デモユーザー",
          photoURL: "",
        } as unknown as import("firebase/auth").User
      }
    >
      <SanctumPage />
    </MockAuthProvider>
  ),
};
