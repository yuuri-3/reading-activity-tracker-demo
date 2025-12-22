import type { Meta, StoryObj } from "@storybook/react-vite";

import { FormLabel } from "./FormLabel";

const meta = {
  title: "Components/FormLabel",
  component: FormLabel,
  parameters: {
    layout: "centered",
  },
  tags: ["autodocs"],
  argTypes: {
    showOptionalLabel: {
      control: "boolean",
    },
  },
  args: {
    text: "書籍",
    showOptionalLabel: true,
    optionalText: "Optional",
  },
} satisfies Meta<typeof FormLabel>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Required: Story = {
  args: {
    showOptionalLabel: false,
  },
};

export const JapaneseOptional: Story = {
  args: {
    optionalText: "任意",
  },
};
