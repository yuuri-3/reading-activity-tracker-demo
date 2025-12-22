import type { Meta, StoryObj } from "@storybook/react-vite";

import { PrimaryButton } from "./PrimaryButton";

const meta: Meta<typeof PrimaryButton> = {
  title: "Components/PrimaryButton",
  component: PrimaryButton,
  args: {
    text: "計測を開始する",
    iconPosition: "left",
    disabled: false,
  },
  parameters: {
    layout: "centered",
  },
};

export default meta;

type Story = StoryObj<typeof PrimaryButton>;

export const Default: Story = {};

export const RightIcon: Story = {
  args: {
    iconPosition: "right",
  },
};

export const NoIcon: Story = {
  args: {
    icon: null,
  },
};

export const Disabled: Story = {
  args: {
    disabled: true,
  },
};
