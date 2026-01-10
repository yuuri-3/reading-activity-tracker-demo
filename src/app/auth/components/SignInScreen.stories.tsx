import type { Meta, StoryObj } from "@storybook/react-vite";

import { SignInScreen } from "./SignInScreen";

const meta = {
  title: "Auth/SignInScreen",
  component: SignInScreen,
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
  argTypes: {
    onSignInWithGoogle: { control: false },
    onSignInAnonymously: { control: false },
  },
  args: {
    onSignInWithGoogle: () => {},
    onSignInAnonymously: () => {},
    disabled: false,
    error: null,
    redirecting: false,
  },
} satisfies Meta<typeof SignInScreen>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Redirecting: Story = {
  args: {
    redirecting: true,
    disabled: true,
  },
};

export const Error: Story = {
  args: {
    error: "Googleログインに失敗しました。\nもう一度お試しください。",
  },
};
