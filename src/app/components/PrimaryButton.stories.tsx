import type { Meta, StoryObj } from "@storybook/react-vite";

import { Play } from "lucide-react";

import { PrimaryButton } from "./PrimaryButton";

const meta = {
  title: "Components/PrimaryButton",
  component: PrimaryButton,
  parameters: {
    layout: "centered",
  },
  tags: ["autodocs"],
  argTypes: {
    iconPosition: {
      control: "inline-radio",
      options: ["start", "end"],
    },
    icon: {
      control: false,
    },
    asChild: {
      control: false,
    },
  },
  args: {
    children: "Start",
    disabled: false,
    iconPosition: "start",
  },
} satisfies Meta<typeof PrimaryButton>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: (args) => <PrimaryButton {...args} icon={<Play />} />,
};

export const IconEnd: Story = {
  args: {
    iconPosition: "end",
  },
  render: (args) => <PrimaryButton {...args} icon={<Play />} />,
};

export const NoIcon: Story = {
  render: (args) => <PrimaryButton {...args} />,
};

export const Disabled: Story = {
  args: {
    disabled: true,
  },
  render: (args) => <PrimaryButton {...args} icon={<Play />} />,
};
