import type { Meta, StoryObj } from "@storybook/react-vite";

import { SignInScreen } from "./SignInScreen";

const meta = {
  title: "Loading/Auth/SignInScreen",
  component: SignInScreen,
  parameters: {
    layout: "fullscreen",
  },
  decorators: [
    (Story) => (
      <div className="h-dvh w-full overflow-y-auto">
        <Story />
      </div>
    ),
  ],
  argTypes: {
    onSignInWithGoogle: { control: false },
    onSignInAnonymously: { control: false },
  },
  args: {
    onSignInWithGoogle: () => {},
    onSignInAnonymously: () => {},
    disabled: true,
    error: null,
    redirecting: true,
  },
} satisfies Meta<typeof SignInScreen>;

export default meta;

type Story = StoryObj<typeof meta>;

export const RedirectingMessage: Story = {};
