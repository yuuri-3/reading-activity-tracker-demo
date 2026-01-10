import { useState, type ComponentProps } from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";

import { Header } from "./Header";
import { MockAppProvider } from "../stories/MockAppProvider";

type HeaderDefaultProps = Extract<
  ComponentProps<typeof Header>,
  { variant?: "default" }
>;

function HeaderHarness(
  props: Omit<HeaderDefaultProps, "searchQuery" | "onSearchQueryChange">
) {
  const [searchQuery, setSearchQuery] = useState("");

  return (
    <Header
      variant="default"
      {...props}
      searchQuery={searchQuery}
      onSearchQueryChange={setSearchQuery}
    />
  );
}

const meta = {
  title: "Components/Header",
  component: HeaderHarness,
  parameters: {
    layout: "fullscreen",
  },
  tags: ["autodocs"],
  decorators: [
    (Story) => (
      <MockAppProvider initialBooks={[]} initialRecords={[]}>
        <div className="h-dvh w-full overflow-hidden">
          <div className="max-w-2xl mx-auto">
            <div className="bg-background">
              <Story />
            </div>
          </div>
        </div>
      </MockAppProvider>
    ),
  ],
  argTypes: {
    icon: { control: false },
    action: { control: false },
  },
  args: {
    pageTitle: "本棚",
    buttonLabel: "書籍登録",
    searchPlaceholder: "書籍を検索",
  },
} satisfies Meta<typeof HeaderHarness>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: (args) => <HeaderHarness {...args} />,
};
