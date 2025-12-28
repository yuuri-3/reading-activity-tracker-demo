import { useState } from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";

import { TabBar, type Page } from "./TabBar";

export default {
  title: "Components/TabBar",
  component: TabBar,
  parameters: {
    layout: "centered",
  },
} satisfies Meta<typeof TabBar>;

type Story = StoryObj<typeof TabBar>;

function TabBarPreview({ initialPage }: { initialPage: Page }) {
  const [currentPage, setCurrentPage] = useState<Page>(initialPage);

  return (
    <div className="w-[480px] max-w-[calc(100vw-2rem)]">
      <TabBar currentPage={currentPage} onChange={setCurrentPage} />
    </div>
  );
}

export const Interactive: Story = {
  render: () => <TabBarPreview initialPage="home" />,
};
